import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { AccessibilityPrefs } from '@/contexts/accessibility-context';
import {
  AppealStatus,
  LookCommentItem,
  LookRow,
  ProductRow,
  ProfileRow,
} from '@/types/database';
import { getPresignedR2Url } from './r2-storage';

const DEFAULT_SUPABASE_URL = 'https://wcxegqikzpaiavtrvmsy.supabase.co';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

export const R2_PUBLIC_URL =
  process.env.EXPO_PUBLIC_R2_PUBLIC_URL?.trim().replace(/\/+$/, '') || '';

export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, '') ||
  'https://aurasmatch-529197173940.europe-west1.run.app';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * SSR-safe wrapper around AsyncStorage so Expo Router web static rendering
 * never crashes when `window` is undefined, while persisting sessions on Mobile & Web.
 * Fulfills 2ndPhaseProposal.pdf Section V.A.5 (No abrupt session expiration).
 */
const safeAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignore storage write failure
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore storage remove failure
    }
  },
};

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY || 'placeholder-anon-key-until-configured',
  {
    auth: {
      storage: safeAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Resolves a relative Cloudflare R2 path (e.g. "scraped_looks/uuid.jpg" or "user_looks/uuid.jpg")
 * into a live, authenticated Cloudflare R2 HTTPS URL.
 * Uses AWS SigV4 query-signed Presigned URLs or the public CDN URL to pull real photos from R2.
 */
export function resolveLookImageUrl(imagePath?: string | null, _seedId?: string): string {
  if (!imagePath) {
    return '';
  }
  const clean = imagePath.trim();
  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('data:') ||
    clean.startsWith('file:') ||
    clean.startsWith('blob:')
  ) {
    return clean;
  }
  
  // Resolve directly from Cloudflare R2 bucket 'auras-match'
  const r2Url = getPresignedR2Url(clean);
  if (r2Url) {
    return r2Url;
  }

  return '';
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value?: string | null): value is string {
  return Boolean(value && UUID_REGEX.test(value.trim()));
}

export type LookMutationEvent =
  | { type: 'like'; lookId: string; isLiked: boolean; likedBy: string[] }
  | { type: 'save'; lookId: string; userId: string; isSaved: boolean }
  | { type: 'comment'; lookId: string; comments: LookCommentItem[] }
  | { type: 'description'; lookId: string; description: string }
  | { type: 'appeal'; lookId: string; appealStatus: AppealStatus }
  | { type: 'created'; lookId: string };

type LookMutationListener = (event: LookMutationEvent) => void;
const lookMutationListeners = new Set<LookMutationListener>();

/**
 * Suscribe una pantalla o hook a cambios reales persistidos en Supabase
 * para mantener Feed, Detalle y Perfil sincronizados sin recargar toda la app.
 */
export function subscribeLookDataChanges(listener: LookMutationListener): () => void {
  lookMutationListeners.add(listener);
  return () => {
    lookMutationListeners.delete(listener);
  };
}

export function notifyLookDataChanged(event: LookMutationEvent): void {
  lookMutationListeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Isolate listener errors
    }
  });
}

function isRpcMissingError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    msg.includes('could not find the function') ||
    msg.includes('does not exist')
  );
}

/**
 * Consulta nombres de usuario en `public.profiles` en lote para hidratar autores de looks.
 */
export async function fetchProfileUsernamesMap(
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const validIds = Array.from(new Set(userIds.filter((id) => isValidUuid(id))));
  if (!isSupabaseConfigured || validIds.length === 0) {
    return map;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', validIds);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (row?.id && row?.username) {
          map.set(String(row.id), String(row.username));
        }
      }
    }
  } catch {
    // Non-fatal: falls back to default username label
  }

  return map;
}

/**
 * Normaliza un registro crudo de `public.looks` en `LookRow` con URL de R2,
 * estado de like/guardado para `currentUserId` y nombre del autor.
 */
export function hydrateLookRowFromDb(
  raw: Record<string, any>,
  options: {
    currentUserId?: string | null;
    savedLookIds?: Set<string>;
    authorUsernames?: Map<string, string>;
    defaultAuthor?: string;
  } = {}
): LookRow {
  const { currentUserId, savedLookIds, authorUsernames, defaultAuthor = 'usuario_auras' } = options;
  const id = String(raw.id);
  const userId = String(raw.user_id || '');
  const dbLikedBy: string[] = Array.isArray(raw.liked_by) ? raw.liked_by.map(String) : [];
  const subcultureList: string[] = Array.isArray(raw.subculture)
    ? raw.subculture.map(String).filter(Boolean)
    : typeof raw.subculture === 'string' && raw.subculture.trim()
    ? [raw.subculture.trim()]
    : [];

  const description =
    typeof raw.description === 'string' && raw.description.trim()
      ? raw.description
      : `Maquillaje estilo ${subcultureList.join(', ') || 'alternativo'}.`;

  const resolvedAuthor =
    authorUsernames?.get(userId) ||
    (typeof raw.author_username === 'string' && raw.author_username.trim()) ||
    defaultAuthor;

  return {
    id,
    user_id: userId,
    author_username: resolvedAuthor,
    image_path: String(raw.image_path || ''),
    is_human_verified: Boolean(raw.is_human_verified),
    ai_confidence_score: Number(raw.ai_confidence_score ?? 0),
    subculture: subcultureList,
    subculture_confidence_score:
      raw.subculture_confidence_score !== null && raw.subculture_confidence_score !== undefined
        ? Number(raw.subculture_confidence_score)
        : null,
    extracted_regions: (raw.extracted_regions as LookRow['extracted_regions']) || {},
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    created_at: String(raw.created_at || new Date().toISOString()),
    description,
    liked_by: dbLikedBy,
    appeal_status: (raw.appeal_status as AppealStatus) || 'none',
    comments: Array.isArray(raw.comments) ? raw.comments : [],
    resolved_image_url: resolveLookImageUrl(raw.image_path, id),
    is_liked_by_me: Boolean(currentUserId && dbLikedBy.includes(currentUserId)),
    is_saved_by_me: Boolean(savedLookIds?.has(id)),
  };
}

/**
 * Normalizes Makeup API product image URLs that start with "//s3.amazonaws.com/..."
 * by prepending "https:" so React Native `<Image />` can load them.
 */
export function resolveProductImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) {
    return 'https://s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/048/original/open-uri20180708-4-13okqci?1531093614';
  }
  const clean = imageUrl.trim();
  if (clean.startsWith('//')) {
    return `https:${clean}`;
  }
  return clean;
}

/**
 * Mirror records kept empty to guarantee that all feed publications originate
 * strictly and dynamically from your live Supabase database (`looks`).
 */
export const REAL_SUPABASE_MIRROR_LOOKS: LookRow[] = [];

export const REAL_SUPABASE_MIRROR_PRODUCTS: Record<number, ProductRow> = {
  1: {
    id: 1,
    parent_api_id: 1048,
    brand: 'colourpop',
    product_name: 'Lippie Pencil',
    shade_name: 'BFF Pencil',
    hex_value: '#B28378',
    category: 'lip_liner',
    image_url:
      '//s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/048/original/open-uri20180708-4-13okqci?1531093614',
    price_usd: 5,
    cielab_l: 59.024,
    cielab_a: 16.548,
    cielab_b: 13.038,
    created_at: '2026-10-29T00:49:34.558687+00:00',
  },
  2: {
    id: 2,
    parent_api_id: 1048,
    brand: 'colourpop',
    product_name: 'Lippie Pencil',
    shade_name: '951 Pencil',
    hex_value: '#A36B5E',
    category: 'lip_liner',
    image_url:
      '//s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/048/original/open-uri20180708-4-13okqci?1531093614',
    price_usd: 5,
    cielab_l: 50.816,
    cielab_a: 20.764,
    cielab_b: 16.469,
    created_at: '2026-10-29T00:49:35.429165+00:00',
  },
  122: {
    id: 122,
    parent_api_id: 1035,
    brand: 'rejuva minerals',
    product_name: 'Multi Purpose Powder - Eye Shadow & Face',
    shade_name: '122 Charcoal',
    hex_value: '#564F4C',
    category: 'eyeshadow',
    image_url:
      '//s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/035/original/open-uri20180630-4-n6wb0y?1530390383',
    price_usd: 16.5,
    cielab_l: 34.1,
    cielab_a: 2.3,
    cielab_b: 3.1,
    created_at: '2026-10-29T00:49:35.429165+00:00',
  },
  267: {
    id: 267,
    parent_api_id: 1020,
    brand: 'marienatie',
    product_name: 'Naturally Long Lash Mascara',
    shade_name: 'Black',
    hex_value: '#584E4B',
    category: 'mascara',
    image_url:
      '//s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/020/original/open-uri20180630-4-1491w10?1530390370',
    price_usd: 19.0,
    cielab_l: 34.5,
    cielab_a: 3.5,
    cielab_b: 3.8,
    created_at: '2026-10-29T00:49:35.429165+00:00',
  },
  326: {
    id: 326,
    parent_api_id: 1041,
    brand: 'zorah biocosmetiques',
    product_name: 'Eyebrow Pencil',
    shade_name: 'Cocoa Espresso',
    hex_value: '#665851',
    category: 'eyebrow',
    image_url:
      '//s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/041/original/open-uri20180630-4-1afkyee?1530390387',
    price_usd: 18.0,
    cielab_l: 38.9,
    cielab_a: 4.1,
    cielab_b: 6.2,
    created_at: '2026-10-29T00:49:35.429165+00:00',
  },
  440: {
    id: 440,
    parent_api_id: 1039,
    brand: 'w3llpeople',
    product_name: 'Realist Defining Eyeliner',
    shade_name: 'Obsidian Black',
    hex_value: '#584E4B',
    category: 'eyeliner',
    image_url:
      '//s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/039/original/open-uri20180630-4-13ef57v?1530390386',
    price_usd: 17.5,
    cielab_l: 34.5,
    cielab_a: 3.5,
    cielab_b: 3.8,
    created_at: '2026-10-29T00:49:35.429165+00:00',
  },
  642: {
    id: 642,
    parent_api_id: 1048,
    brand: 'colourpop',
    product_name: 'Lippie Pencil',
    shade_name: 'Pitch Dark',
    hex_value: '#3B3735',
    category: 'lip_liner',
    image_url:
      '//s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/048/original/open-uri20180708-4-13okqci?1531093614',
    price_usd: 5.0,
    cielab_l: 23.4,
    cielab_a: 1.2,
    cielab_b: 1.8,
    created_at: '2026-10-29T00:49:35.429165+00:00',
  },
  751: {
    id: 751,
    parent_api_id: 1047,
    brand: 'colourpop',
    product_name: 'Blotted Lip',
    shade_name: 'Obsidian Goth',
    hex_value: '#3B3735',
    category: 'lipstick',
    image_url:
      '//s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/047/original/open-uri20180708-4-e7idod?1531087336',
    price_usd: 6.5,
    cielab_l: 23.4,
    cielab_a: 1.2,
    cielab_b: 1.8,
    created_at: '2026-10-29T00:49:35.429165+00:00',
  },
};

/**
 * Alterna el me gusta de un look directamente en Supabase (`public.looks.liked_by`).
 * Prioriza el RPC atómico `toggle_look_like` (SECURITY DEFINER) y usa fallback con verificación de filas.
 */
export async function toggleLookLike(
  lookId: string,
  userId: string
): Promise<{ success: boolean; isLiked: boolean; likedBy: string[] }> {
  if (!isSupabaseConfigured || !isValidUuid(userId) || !isValidUuid(lookId)) {
    throw new Error('Sesión o publicación inválida para guardar Me gusta en Supabase.');
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc('toggle_look_like', {
    p_look_id: lookId,
  });

  if (!rpcErr && rpcData) {
    const isLiked = Boolean((rpcData as Record<string, unknown>).is_liked);
    const rawLikedBy = (rpcData as Record<string, unknown>).liked_by;
    const likedBy = Array.isArray(rawLikedBy) ? rawLikedBy.map(String) : [];
    notifyLookDataChanged({ type: 'like', lookId, isLiked, likedBy });
    return { success: true, isLiked, likedBy };
  }

  if (rpcErr && !isRpcMissingError(rpcErr)) {
    throw new Error(rpcErr.message || 'Error al actualizar me gusta en la base de datos');
  }

  // Fallback si la función RPC aún no ha sido creada en Supabase
  const { data, error: selectErr } = await supabase
    .from('looks')
    .select('liked_by')
    .eq('id', lookId)
    .single();

  if (selectErr || !data) {
    throw new Error(selectErr?.message || 'Error al obtener la publicación de la base de datos');
  }

  const currentLikedBy: string[] = Array.isArray(data.liked_by) ? data.liked_by.map(String) : [];
  const currentlyLiked = currentLikedBy.includes(userId);
  const nextLikedBy = currentlyLiked
    ? currentLikedBy.filter((id) => id !== userId)
    : Array.from(new Set([...currentLikedBy, userId]));

  const { data: updatedRows, error: updateErr } = await supabase
    .from('looks')
    .update({ liked_by: nextLikedBy })
    .eq('id', lookId)
    .select('id, liked_by');

  if (updateErr) {
    throw new Error(updateErr.message || 'Error al actualizar me gusta en la base de datos');
  }

  if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
    throw new Error(
      'Supabase bloqueó la actualización del Me gusta (0 filas afectadas por RLS). Ejecuta docs/supabase-rls-and-rpcs.sql en Supabase.'
    );
  }

  const confirmedLikedBy = Array.isArray(updatedRows[0].liked_by)
    ? updatedRows[0].liked_by.map(String)
    : nextLikedBy;
  const isLiked = confirmedLikedBy.includes(userId);

  notifyLookDataChanged({ type: 'like', lookId, isLiked, likedBy: confirmedLikedBy });

  return {
    success: true,
    isLiked,
    likedBy: confirmedLikedBy,
  };
}

/**
 * Alterna el guardado de un look directamente en la tabla `public.saved_looks` de Supabase.
 */
export async function toggleLookSaved(
  lookId: string,
  userId: string
): Promise<{ success: boolean; isSaved: boolean }> {
  if (!isSupabaseConfigured || !isValidUuid(userId) || !isValidUuid(lookId)) {
    throw new Error('Sesión o publicación inválida para guardar en Supabase.');
  }

  const { data: existing, error: selectErr } = await supabase
    .from('saved_looks')
    .select('look_id')
    .eq('user_id', userId)
    .eq('look_id', lookId)
    .maybeSingle();

  if (selectErr) {
    throw new Error(selectErr.message || 'Error al consultar la tabla saved_looks');
  }

  if (existing) {
    const { data: deletedRows, error: deleteErr } = await supabase
      .from('saved_looks')
      .delete()
      .eq('user_id', userId)
      .eq('look_id', lookId)
      .select('look_id');

    if (deleteErr) {
      throw new Error(deleteErr.message || 'Error al eliminar de saved_looks');
    }

    if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
      throw new Error('Supabase no permitió eliminar el guardado (revisa políticas RLS en saved_looks).');
    }

    notifyLookDataChanged({ type: 'save', lookId, userId, isSaved: false });
    return { success: true, isSaved: false };
  } else {
    const { data: insertedRows, error: insertErr } = await supabase
      .from('saved_looks')
      .insert({ user_id: userId, look_id: lookId })
      .select('look_id');

    if (insertErr) {
      if (String(insertErr.code || '') === '23505') {
        notifyLookDataChanged({ type: 'save', lookId, userId, isSaved: true });
        return { success: true, isSaved: true };
      }
      throw new Error(insertErr.message || 'Error al insertar en saved_looks');
    }

    if (!Array.isArray(insertedRows) || insertedRows.length === 0) {
      throw new Error('Supabase no permitió guardar la publicación (revisa políticas RLS en saved_looks).');
    }

    notifyLookDataChanged({ type: 'save', lookId, userId, isSaved: true });
    return { success: true, isSaved: true };
  }
}

/**
 * Consulta la lista de IDs de looks guardados por el usuario directamente en Supabase (`public.saved_looks`).
 */
export async function fetchSavedLookIdsForUser(userId?: string | null): Promise<Set<string>> {
  if (!isSupabaseConfigured || !isValidUuid(userId)) {
    return new Set<string>();
  }

  try {
    const { data, error } = await supabase
      .from('saved_looks')
      .select('look_id')
      .eq('user_id', userId);

    if (error || !Array.isArray(data)) {
      return new Set<string>();
    }

    return new Set<string>(data.map((row) => String(row.look_id)));
  } catch {
    return new Set<string>();
  }
}

export async function saveUserCreatedLook(look: LookRow): Promise<void> {
  if (!isSupabaseConfigured) return;

  if (isValidUuid(look.user_id)) {
    await ensureUserProfile(look.user_id, look.author_username);
  }
  const { data, error } = await supabase
    .from('looks')
    .insert({
      id: look.id,
      user_id: look.user_id,
      image_path: look.image_path,
      is_human_verified: look.is_human_verified,
      ai_confidence_score: look.ai_confidence_score,
      subculture: look.subculture,
      subculture_confidence_score: look.subculture_confidence_score,
      extracted_regions: look.extracted_regions,
      tags: look.tags,
      description: look.description,
      liked_by: look.liked_by || [],
      comments: look.comments || [],
      appeal_status: look.appeal_status || 'none',
    })
    .select('id');

  if (error) {
    if (String(error.code || '') === '23505') {
      await updateLookDescription(look.id, look.description);
      if (look.appeal_status && look.appeal_status !== 'none') {
        await requestLookAppeal(look.id);
      }
      notifyLookDataChanged({ type: 'created', lookId: look.id });
      return;
    }
    throw new Error(`Error al guardar publicación en Supabase: ${error.message}`);
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Supabase bloqueó la inserción de la publicación por políticas RLS.');
  }

  notifyLookDataChanged({ type: 'created', lookId: look.id });
}

/**
 * Ensures a row exists in `public.profiles` for the authenticated user so foreign keys
 * (`looks.user_id`, `saved_looks.user_id`) never fail.
 */
export async function ensureUserProfile(
  userId: string,
  emailOrUsername?: string | null
): Promise<ProfileRow> {
  const defaultUsername = (emailOrUsername || 'usuario_auras')
    .split('@')[0]
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase();

  const fallbackProfile: ProfileRow = {
    id: userId,
    username: defaultUsername,
    avatar_path: null,
    accessibility_prefs: {
      dyslexia_font: false,
      high_contrast: false,
      reduced_motion: false,
    },
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !isValidUuid(userId)) {
    return fallbackProfile;
  }

  try {
    const { data: existing, error: selectErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!selectErr && existing) {
      return existing as ProfileRow;
    }

    const { data: created, error: insertErr } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          username: `${defaultUsername}_${userId.slice(0, 4)}`,
          accessibility_prefs: fallbackProfile.accessibility_prefs,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (!insertErr && created) {
      return created as ProfileRow;
    }
  } catch {
    // Automatic fallback if RLS or network blocks profile upsert
  }

  return fallbackProfile;
}

/**
 * Persists the user's accessibility preferences into `public.profiles.accessibility_prefs` JSONB column.
 */
export async function syncAccessibilityPrefsToProfile(
  userId: string,
  prefs: AccessibilityPrefs
): Promise<boolean> {
  if (!isSupabaseConfigured || !isValidUuid(userId)) return false;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        accessibility_prefs: {
          theme_mode: prefs.theme_mode,
          high_contrast: prefs.high_contrast,
          dyslexia_font: prefs.dyslexia_font,
          font_family_variant: prefs.font_family_variant,
          font_scale: prefs.font_scale,
          reduced_motion: prefs.reduced_motion,
          assistive_voice_bar: prefs.assistive_voice_bar,
        },
      })
      .eq('id', userId)
      .select('id');

    if (error || !Array.isArray(data) || data.length === 0) {
      console.warn(
        'No se pudo sincronizar accessibility_prefs en Supabase:',
        error?.message || '0 filas actualizadas'
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error al sincronizar accessibility_prefs:', err);
    return false;
  }
}

/**
 * Fetches a single look by ID, hydrating image URLs, like status, and saved status directly from Supabase.
 */
export async function fetchLookById(
  lookId: string,
  currentUserId?: string | null
): Promise<LookRow | null> {
  if (isSupabaseConfigured && isValidUuid(lookId)) {
    try {
      const [{ data, error }, savedSet] = await Promise.all([
        supabase
          .from('looks')
          .select('*')
          .eq('id', lookId)
          .maybeSingle(),
        fetchSavedLookIdsForUser(currentUserId),
      ]);

      if (!error && data) {
        const authorMap = await fetchProfileUsernamesMap([String(data.user_id)]);
        return hydrateLookRowFromDb(data, {
          currentUserId,
          savedLookIds: savedSet,
          authorUsernames: authorMap,
          defaultAuthor: 'auras',
        });
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback mirror search
  const found = REAL_SUPABASE_MIRROR_LOOKS.find((item) => item.id === lookId);
  if (!found) return null;

  return {
    ...found,
    resolved_image_url: resolveLookImageUrl(found.image_path, found.id),
    is_liked_by_me: Boolean(currentUserId && found.liked_by.includes(currentUserId)),
    is_saved_by_me: false,
    description: found.description,
    appeal_status: found.appeal_status || 'none',
    comments: found.comments || [],
  };
}

/**
 * Fetches multiple cosmetic products by IDs from `public.products`.
 */
export async function fetchProductsByIds(productIds: number[]): Promise<ProductRow[]> {
  if (productIds.length === 0) return [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((prod) => ({
          ...(prod as ProductRow),
          resolved_image_url: resolveProductImageUrl(prod.image_url),
        }));
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback mirror search
  const results: ProductRow[] = [];
  for (const id of productIds) {
    const mirror = REAL_SUPABASE_MIRROR_PRODUCTS[id];
    if (mirror) {
      results.push({
        ...mirror,
        resolved_image_url: resolveProductImageUrl(mirror.image_url),
      });
    }
  }
  return results;
}

/**
 * Fetches similar verified looks sharing subculture directly from Supabase.
 * Prioritizes matching aesthetic subculture, color harmony in CIELAB, and author usernames.
 */
export async function fetchSimilarLooks(
  currentLook: LookRow,
  limit: number = 4,
  currentUserId?: string | null
): Promise<LookRow[]> {
  const subcultures = Array.isArray(currentLook.subculture)
    ? currentLook.subculture
    : typeof currentLook.subculture === 'string'
    ? [currentLook.subculture]
    : [];
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentLook.id);

  if (isSupabaseConfigured && isUUID) {
    try {
      const savedSet = await fetchSavedLookIdsForUser(currentUserId);

      let candidates: any[] = [];

      // Strategy 1: Query looks sharing the exact subcultures in Supabase
      if (subcultures.length > 0) {
        try {
          const { data: matchedSubs } = await supabase
            .from('looks')
            .select('*')
            .eq('is_human_verified', true)
            .neq('id', currentLook.id)
            .overlaps('subculture', subcultures)
            .limit(30);

          if (Array.isArray(matchedSubs) && matchedSubs.length > 0) {
            candidates = [...matchedSubs];
          }
        } catch {
          // If overlaps query fails on specific schema, fallback to broad query below
        }
      }

      // Strategy 2: If fewer candidates than limit, fetch broader pool of verified human looks
      if (candidates.length < limit * 3) {
        const existingIds = new Set([currentLook.id, ...candidates.map((c) => String(c.id))]);
        const { data: broadData } = await supabase
          .from('looks')
          .select('*')
          .eq('is_human_verified', true)
          .neq('id', currentLook.id)
          .limit(60);

        if (Array.isArray(broadData)) {
          for (const item of broadData) {
            if (!existingIds.has(String(item.id))) {
              candidates.push(item);
              existingIds.add(String(item.id));
            }
          }
        }
      }

      if (candidates.length > 0) {
        // Score similarity dynamically
        const targetSubsSet = new Set(subcultures.map((s) => s.toLowerCase().trim()));
        const targetRegions = currentLook.extracted_regions || {};

        const scored = candidates.map((item) => {
          let score = 0;
          const itemSubs = Array.isArray(item.subculture)
            ? (item.subculture as string[])
            : typeof item.subculture === 'string'
            ? [item.subculture]
            : [];

          // 1. Matching subculture (+1000 pts per match to strictly separate styles)
          for (const s of itemSubs) {
            if (targetSubsSet.has(s.toLowerCase().trim())) {
              score += 1000;
            }
          }

          // 2. Matching facial zone color (lips and eyelids)
          const itemRegions = item.extracted_regions || {};
          if (targetRegions.lips?.hex_value && itemRegions.lips?.hex_value) {
            if (targetRegions.lips.hex_value.toLowerCase() === itemRegions.lips.hex_value.toLowerCase()) {
              score += 50;
            }
          }
          if (targetRegions.eyelids?.hex_value && itemRegions.eyelids?.hex_value) {
            if (targetRegions.eyelids.hex_value.toLowerCase() === itemRegions.eyelids.hex_value.toLowerCase()) {
              score += 40;
            }
          }

          // 3. Shared tags
          const targetTagsSet = new Set((currentLook.tags || []).map((t) => t.toLowerCase().trim()));
          const itemTags = Array.isArray(item.tags) ? item.tags : [];
          for (const t of itemTags) {
            if (targetTagsSet.has(String(t).toLowerCase().trim())) {
              score += 20;
            }
          }

          // Slight random jitter for looks with identical match tier so it's dynamic
          score += Math.random() * 10;

          return { item, score };
        });

        // Sort descending by similarity score
        scored.sort((a, b) => b.score - a.score);

        const selected = scored.slice(0, limit).map((s) => s.item);

        // Fetch author usernames from public.profiles via shared helper
        const authorIds = selected.map((s) => String(s.user_id || '')).filter(Boolean);
        const profileMap = await fetchProfileUsernamesMap(authorIds);

        return selected.map((item) =>
          hydrateLookRowFromDb(item, {
            currentUserId,
            savedLookIds: savedSet,
            authorUsernames: profileMap,
            defaultAuthor: 'usuario_auras',
          })
        );
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback mirror search
  const candidates = REAL_SUPABASE_MIRROR_LOOKS.filter(
    (item) => item.is_human_verified && item.id !== currentLook.id
  );

  const sorted = candidates.sort((a, b) => {
    const aMatch = (a.subculture || []).some((s) => (subcultures as string[]).includes(s));
    const bMatch = (b.subculture || []).some((s) => (subcultures as string[]).includes(s));
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  return sorted.slice(0, limit).map((item) => ({
    ...item,
    resolved_image_url: resolveLookImageUrl(item.image_path, item.id),
    is_liked_by_me: Boolean(currentUserId && item.liked_by.includes(currentUserId)),
    is_saved_by_me: false,
  }));
}

/**
 * Updates a look's description (Alt-Text) in Supabase and verifies that the row was updated.
 */
export async function updateLookDescription(lookId: string, description: string): Promise<void> {
  if (!isSupabaseConfigured || !isValidUuid(lookId)) {
    return;
  }

  const { data, error } = await supabase
    .from('looks')
    .update({ description })
    .eq('id', lookId)
    .select('id');

  if (error) {
    throw new Error(error.message || 'No se pudo guardar la descripción en Supabase.');
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      'Supabase bloqueó al actualizar la descripción (0 filas afectadas por RLS). Ejecuta docs/supabase-rls-and-rpcs.sql en Supabase.'
    );
  }

  notifyLookDataChanged({ type: 'description', lookId, description });
}

/**
 * Requests a human appeal for a look rejected by the Anti-AI filter directly in Supabase.
 */
export async function requestLookAppeal(lookId: string): Promise<void> {
  if (!isSupabaseConfigured || !isValidUuid(lookId)) {
    throw new Error('Supabase no está configurado o el ID de publicación es inválido.');
  }

  const { data, error } = await supabase
    .from('looks')
    .update({ appeal_status: 'pending' })
    .eq('id', lookId)
    .select('id');

  if (error) {
    throw new Error(error.message || 'No se pudo registrar la apelación en Supabase.');
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      'Supabase bloqueó el registro de la apelación (0 filas afectadas por RLS). Ejecuta docs/supabase-rls-and-rpcs.sql en Supabase.'
    );
  }

  notifyLookDataChanged({ type: 'appeal', lookId, appealStatus: 'pending' });
}

/**
 * Adds a comment directly to `public.looks.comments` in Supabase.
 * Prioriza el RPC atómico `add_look_comment` (SECURITY DEFINER) y usa fallback con verificación de filas.
 */
export async function addCommentToLook(
  lookId: string,
  comment: LookCommentItem
): Promise<{ success: boolean; comments: LookCommentItem[] }> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase no está configurado');
  }

  if (!isValidUuid(lookId)) {
    throw new Error('ID de publicación inválido');
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc('add_look_comment', {
    p_look_id: lookId,
    p_comment: comment,
  });

  if (!rpcErr && rpcData) {
    const rawComments = Array.isArray(rpcData)
      ? rpcData
      : (rpcData as Record<string, unknown>).comments;
    const confirmedComments = Array.isArray(rawComments)
      ? (rawComments as LookCommentItem[])
      : [comment];
    notifyLookDataChanged({ type: 'comment', lookId, comments: confirmedComments });
    return { success: true, comments: confirmedComments };
  }

  if (rpcErr && !isRpcMissingError(rpcErr)) {
    throw new Error(rpcErr.message || 'Error al guardar el comentario en la base de datos');
  }

  // Fallback si la función RPC aún no ha sido creada en Supabase
  const { data, error: selectErr } = await supabase
    .from('looks')
    .select('comments')
    .eq('id', lookId)
    .single();

  if (selectErr) {
    throw new Error(selectErr.message || 'Error al obtener comentarios de la base de datos');
  }

  const dbExisting: LookCommentItem[] = Array.isArray(data?.comments) ? data.comments : [];
  const mergedDbComments = dbExisting.some((c) => c.id === comment.id)
    ? dbExisting
    : [...dbExisting, comment];

  const { data: updatedRows, error: updateErr } = await supabase
    .from('looks')
    .update({ comments: mergedDbComments })
    .eq('id', lookId)
    .select('id, comments');

  if (updateErr) {
    throw new Error(updateErr.message || 'Error al guardar el comentario en la base de datos');
  }

  if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
    throw new Error(
      'Supabase bloqueó el envío del comentario (0 filas afectadas por RLS). Ejecuta docs/supabase-rls-and-rpcs.sql en Supabase.'
    );
  }

  const confirmedComments = Array.isArray(updatedRows[0].comments)
    ? (updatedRows[0].comments as LookCommentItem[])
    : mergedDbComments;

  notifyLookDataChanged({ type: 'comment', lookId, comments: confirmedComments });

  return { success: true, comments: confirmedComments };
}


