-- ============================================================================
-- AurasMatch — Políticas RLS, Funciones RPC Atómicas y Trigger de Perfiles
-- ============================================================================
-- Ejecutar este script una vez en:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Objetivo:
--   1. Permitir que la app móvil use únicamente la clave pública (anon/publishable)
--      sin exponer jamás sb_secret_... en el frontend.
--   2. Corregir el bloqueo silencioso (0 filas actualizadas) en `public.looks`
--      para Likes, Comentarios, Alt-Text (`description`) y Apelaciones (`appeal_status`).
--   3. Garantizar que todo usuario nuevo creado por Supabase Auth reciba su fila
--      en `public.profiles` automáticamente, evitando errores de FK en `saved_looks` y `looks`.
-- ============================================================================

-- 1. Asegurar permisos de esquema/tablas y habilitar RLS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.looks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.looks TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_looks TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.looks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_looks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de `public.products` (catálogo público de solo lectura)
DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Políticas de `public.profiles`
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Políticas de `public.saved_looks`
DROP POLICY IF EXISTS "saved_looks_select_own" ON public.saved_looks;
CREATE POLICY "saved_looks_select_own"
  ON public.saved_looks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_looks_insert_own" ON public.saved_looks;
CREATE POLICY "saved_looks_insert_own"
  ON public.saved_looks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_looks_delete_own" ON public.saved_looks;
CREATE POLICY "saved_looks_delete_own"
  ON public.saved_looks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Políticas de `public.looks`
DROP POLICY IF EXISTS "looks_select_public" ON public.looks;
CREATE POLICY "looks_select_public"
  ON public.looks
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "looks_insert_own" ON public.looks;
CREATE POLICY "looks_insert_own"
  ON public.looks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Permite al autor actualizar su propio look (ej. description / Alt-Text y appeal_status)
DROP POLICY IF EXISTS "looks_update_own" ON public.looks;
CREATE POLICY "looks_update_own"
  ON public.looks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "looks_delete_own" ON public.looks;
CREATE POLICY "looks_delete_own"
  ON public.looks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Protege campos críticos Anti-IA ante modificaciones directas desde clientes con JWT de usuario
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

-- 6. RPC Atómica: Me Gusta de cualquier usuario autenticado sobre cualquier look
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

-- 7. RPC Atómica: Comentarios de cualquier usuario autenticado sobre cualquier look
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

-- 8. Trigger automático para crear `public.profiles` al registrar un usuario en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_username text;
BEGIN
  v_base := COALESCE(
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'username', ''), '[^a-zA-Z0-9_]', '_', 'g'), ''),
    NULLIF(regexp_replace(split_part(COALESCE(NEW.email, ''), '@', 1), '[^a-zA-Z0-9_]', '_', 'g'), ''),
    'usuario'
  );
  v_username := lower(v_base) || '_' || left(NEW.id::text, 4);

  INSERT INTO public.profiles (id, username, accessibility_prefs)
  VALUES (
    NEW.id,
    v_username,
    jsonb_build_object(
      'theme_mode', 'system',
      'high_contrast', false,
      'dyslexia_font', false,
      'font_family_variant', 'default',
      'font_scale', 1.0,
      'reduced_motion', false,
      'assistive_voice_bar', false
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
