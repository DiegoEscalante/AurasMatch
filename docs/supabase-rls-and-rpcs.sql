-- ============================================================================
-- AurasMatch — Migración Consolidada y Quirúrgica para `public.looks`
-- ============================================================================
-- Ejecutar este script UNA SOLA VEZ en:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Alcance verificado por introspección sobre `pg_policies`:
--   * `products`, `profiles`, `saved_looks` y `looks` (SELECT/INSERT/DELETE)
--     ya cuentan con políticas activas funcionales y NO se alteran.
--   * No crea triggers sobre `auth.users` (el cliente ya sincroniza perfiles
--     mediante `ensureUserProfile()`).
--   * No afecta al backend en Cloud Run (`service_role` omite RLS y solo hace INSERT).
--
-- Qué resuelve en una sola corrida:
--   1. Habilita `UPDATE` seguro para el autor en `public.looks` (`looks_update_own`),
--      desbloqueando la publicación tras análisis Cloud Run (`updateLookDescription`),
--      la edición de Alt-Text y las apelaciones (`requestLookAppeal`).
--   2. Protege columnas de verificación Anti-IA (`protect_look_verification_columns`)
--      para que ningún cliente altere `user_id`, `is_human_verified` o `ai_confidence_score`.
--   3. Expone los RPCs atómicos `toggle_look_like` y `add_look_comment` para que
--      cualquier usuario autenticado pueda dar Me gusta o comentar en looks ajenos.
--   4. Recarga la caché de esquema de PostgREST inmediatamente.
-- ============================================================================

-- 1. Asegurar permisos base y privilegio UPDATE para `authenticated` en `public.looks`
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.looks TO authenticated;

-- 2. Política UPDATE solo para el autor de la publicación (Alt-Text y Apelaciones)
DROP POLICY IF EXISTS "looks_update_own" ON public.looks;
CREATE POLICY "looks_update_own"
  ON public.looks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Trigger protector de columnas Anti-IA ante modificaciones desde el cliente
CREATE OR REPLACE FUNCTION public.protect_look_verification_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() IN ('anon', 'authenticated') THEN
    NEW.user_id := OLD.user_id;
    NEW.is_human_verified := OLD.is_human_verified;
    NEW.ai_confidence_score := OLD.ai_confidence_score;
    IF NEW.appeal_status IS DISTINCT FROM OLD.appeal_status
       AND NEW.appeal_status NOT IN ('none', 'pending') THEN
      NEW.appeal_status := OLD.appeal_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_look_verification ON public.looks;
CREATE TRIGGER trg_protect_look_verification
  BEFORE UPDATE ON public.looks
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_look_verification_columns();

-- 4. RPC Atómica: Me Gusta de cualquier usuario autenticado sobre cualquier look
CREATE OR REPLACE FUNCTION public.toggle_look_like(p_look_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current uuid[];
  v_next uuid[];
  v_is_liked boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para dar me gusta.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(liked_by, '{}'::uuid[])
    INTO v_current
    FROM public.looks
   WHERE id = p_look_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Publicación no encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF v_uid = ANY(v_current) THEN
    v_next := array_remove(v_current, v_uid);
    v_is_liked := false;
  ELSE
    SELECT ARRAY(
      SELECT DISTINCT x
      FROM unnest(array_append(v_current, v_uid)) AS x
    ) INTO v_next;
    v_is_liked := true;
  END IF;

  UPDATE public.looks
     SET liked_by = COALESCE(v_next, '{}'::uuid[])
   WHERE id = p_look_id;

  RETURN jsonb_build_object(
    'is_liked', v_is_liked,
    'liked_by', to_jsonb(COALESCE(v_next, '{}'::uuid[]))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_look_like(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_look_like(uuid) TO authenticated;

-- 5. RPC Atómica: Comentarios de cualquier usuario autenticado sobre cualquier look
CREATE OR REPLACE FUNCTION public.add_look_comment(
  p_look_id uuid,
  p_comment jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing jsonb;
  v_next jsonb;
  v_content text;
  v_comment_id text;
  v_username text;
  v_new_item jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para comentar.' USING ERRCODE = '42501';
  END IF;

  v_content := btrim(COALESCE(p_comment->>'content', ''));
  IF char_length(v_content) = 0 THEN
    RAISE EXCEPTION 'El comentario no puede estar vacío.' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_content) > 300 THEN
    RAISE EXCEPTION 'El comentario excede los 300 caracteres.' USING ERRCODE = '22023';
  END IF;

  SELECT username
    INTO v_username
    FROM public.profiles
   WHERE id = v_uid;

  v_username := COALESCE(NULLIF(v_username, ''), NULLIF(p_comment->>'username', ''), 'auras_user');
  v_comment_id := COALESCE(NULLIF(p_comment->>'id', ''), gen_random_uuid()::text);

  v_new_item := jsonb_build_object(
    'id', v_comment_id,
    'user_id', v_uid::text,
    'username', v_username,
    'content', v_content,
    'created_at', COALESCE(NULLIF(p_comment->>'created_at', ''), now()::text)
  );

  SELECT COALESCE(comments, '[]'::jsonb)
    INTO v_existing
    FROM public.looks
   WHERE id = p_look_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Publicación no encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_existing) AS elem
    WHERE elem->>'id' = v_comment_id
  ) THEN
    v_next := v_existing;
  ELSE
    v_next := v_existing || jsonb_build_array(v_new_item);
  END IF;

  UPDATE public.looks
     SET comments = v_next
   WHERE id = p_look_id;

  RETURN jsonb_build_object('comments', v_next);
END;
$$;

REVOKE ALL ON FUNCTION public.add_look_comment(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_look_comment(uuid, jsonb) TO authenticated;

-- 6. Recargar la caché de esquema de PostgREST de inmediato
NOTIFY pgrst, 'reload schema';
