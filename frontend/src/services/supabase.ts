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

const DEFAULT_SUPABASE_URL = 'https://wcxegqikzpaiavtrvmsy.supabase.co';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

export const R2_PUBLIC_URL =
  process.env.EXPO_PUBLIC_R2_PUBLIC_URL?.trim().replace(/\/+$/, '') || '';

export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, '') || 'http://localhost:8000';

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

const FALLBACK_PORTRAIT_IMAGES = [
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1503236823255-94609f598e71?auto=format&fit=crop&w=800&q=80',
];

/**
 * Resolves a relative Cloudflare R2 path (e.g. "user_looks/uuid.jpg") into a full HTTPS URL.
 * If EXPO_PUBLIC_R2_PUBLIC_URL is not configured yet, returns a deterministic portrait image
 * so UI testing never displays blank broken boxes.
 */
export function resolveLookImageUrl(imagePath?: string | null, seedId?: string): string {
  if (!imagePath) {
    return FALLBACK_PORTRAIT_IMAGES[0];
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
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${clean.replace(/^\/+/, '')}`;
  }
  const hashSource = seedId || clean;
  let sum = 0;
  for (let i = 0; i < hashSource.length; i++) {
    sum += hashSource.charCodeAt(i);
  }
  return FALLBACK_PORTRAIT_IMAGES[sum % FALLBACK_PORTRAIT_IMAGES.length];
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
 * Real mirror records from your live Supabase database (`looks` & `products`)
 * used ONLY as automatic fallback when `EXPO_PUBLIC_SUPABASE_ANON_KEY` has not been pasted yet.
 */
export const REAL_SUPABASE_MIRROR_LOOKS: LookRow[] = [
  {
    id: '6290b685-4a2e-4058-80e6-7d1a8463c34f',
    user_id: '2fb75323-525b-482a-bf38-e0ea63275a04',
    image_path: 'user_looks/8673b143-7aef-43d7-a2b8-2ae2f68f9b8d.jpg',
    is_human_verified: true,
    ai_confidence_score: 0.23,
    subculture: ['Goth'],
    subculture_confidence_score: 0.93,
    // Solo Labios y Delineado (NO Cejas, NO Párpados)
    extracted_regions: {
      lips: { hex_value: '#3B3735', recommended_skus: { lipstick: 751, lip_liner: 642 } },
      lash_line: { hex_value: '#2B2928', recommended_skus: { mascara: 267, eyeliner: 440 } },
    },
    tags: ['goth', 'darklips', 'humanverified'],
    created_at: '2026-11-06T19:34:51.155112+00:00',
    description:
      'Maquillaje Goth de alto contraste enfocado en labios negro carbón oscuro y delineado gráfico intenso.',
    liked_by: [],
    appeal_status: 'none',
    comments: [],
    author_username: 'aurasmatch_bot',
  },
  {
    id: 'a18f9210-1b2c-4058-80e6-9c2a8463c111',
    user_id: '2fb75323-525b-482a-bf38-e0ea63275a04',
    image_path: 'user_looks/clean-girl-sample.jpg',
    is_human_verified: true,
    ai_confidence_score: 0.14,
    subculture: ['Clean Girl'],
    subculture_confidence_score: 0.91,
    // Solo Labios y Cejas (NO Párpados, NO Delineado)
    extracted_regions: {
      lips: { hex_value: '#B28378', recommended_skus: { lip_liner: 1, lipstick: 2 } },
      brows: { hex_value: '#63473B', recommended_skus: { eyebrow: 326 } },
    },
    tags: ['cleangirl', 'nudelips', 'naturalglow'],
    created_at: '2026-11-07T15:20:00.000000+00:00',
    description:
      'Estética Clean Girl minimalista con labios nude beige cálido y cejas peinadas naturales en tono marrón café.',
    liked_by: [],
    appeal_status: 'none',
    comments: [],
    author_username: 'aurasmatch_bot',
  },
  {
    id: 'c39d7102-8e4f-4912-9a11-4f8b9201e222',
    user_id: '2fb75323-525b-482a-bf38-e0ea63275a04',
    image_path: 'user_looks/jirai-kei-sample.jpg',
    is_human_verified: true,
    ai_confidence_score: 0.19,
    subculture: ['Jirai Kei'],
    subculture_confidence_score: 0.89,
    // Solo Párpados y Labios (NO Cejas, NO Delineado)
    extracted_regions: {
      lips: { hex_value: '#B81D2A', recommended_skus: { lipstick: 751, lip_liner: 1 } },
      eyelids: { hex_value: '#D46A8E', recommended_skus: { eyeshadow: 122 } },
    },
    tags: ['jiraikei', 'pinkshadow', 'redlips'],
    created_at: '2026-11-08T18:10:00.000000+00:00',
    description:
      'Look Jirai Kei con sombras rosa frambuesa en párpados inferiores y labios rojo carmín degradado.',
    liked_by: [],
    appeal_status: 'none',
    comments: [],
    author_username: 'aurasmatch_bot',
  },
  {
    id: 'e45b8812-3c4d-4781-8b22-0a1c9342f333',
    user_id: '2fb75323-525b-482a-bf38-e0ea63275a04',
    image_path: 'user_looks/egirl-sample.jpg',
    is_human_verified: true,
    ai_confidence_score: 0.11,
    subculture: ['E-Girl'],
    subculture_confidence_score: 0.94,
    // Solo Párpados y Delineado (NO Labios, NO Cejas)
    extracted_regions: {
      eyelids: { hex_value: '#7E579F', recommended_skus: { eyeshadow: 122 } },
      lash_line: { hex_value: '#2B2928', recommended_skus: { eyeliner: 440, mascara: 267 } },
    },
    tags: ['egirl', 'purpleeyeshadow', 'wingedliner'],
    created_at: '2026-11-09T12:00:00.000000+00:00',
    description:
      'Estilo E-Girl enfocado en los ojos: sombras morado lavanda y delineado alado negro azabache.',
    liked_by: [],
    appeal_status: 'none',
    comments: [],
    author_username: 'aurasmatch_bot',
  },
  {
    id: 'f56c9923-4d5e-4892-9c33-1b2d0453a444',
    user_id: '2fb75323-525b-482a-bf38-e0ea63275a04',
    image_path: 'user_looks/y2k-sample.jpg',
    is_human_verified: true,
    ai_confidence_score: 0.16,
    subculture: ['Y2K'],
    subculture_confidence_score: 0.88,
    // Solo Párpados (NO Labios, NO Cejas, NO Delineado)
    extracted_regions: {
      eyelids: { hex_value: '#2C4A7E', recommended_skus: { eyeshadow: 122 } },
    },
    tags: ['y2k', 'frostedblue', 'retromakeup'],
    created_at: '2026-11-10T09:30:00.000000+00:00',
    description:
      'Maquillaje Y2K futurista con sombras azul profundo escarchadas en los párpados sin delineado oscuro.',
    liked_by: [],
    appeal_status: 'none',
    comments: [],
    author_username: 'aurasmatch_bot',
  },
  {
    id: 'b29a0321-2c3d-4169-9f07-8e3b9574d555',
    user_id: '2fb75323-525b-482a-bf38-e0ea63275a04',
    image_path: 'user_looks/clean-girl-full.jpg',
    is_human_verified: true,
    ai_confidence_score: 0.08,
    subculture: ['Clean Girl'],
    subculture_confidence_score: 0.95,
    // Las 4 regiones completas
    extracted_regions: {
      lips: { hex_value: '#C59B87', recommended_skus: { lipstick: 2, lip_liner: 1 } },
      brows: { hex_value: '#63473B', recommended_skus: { eyebrow: 326 } },
      eyelids: { hex_value: '#C89D54', recommended_skus: { eyeshadow: 122 } },
      lash_line: { hex_value: '#2B2928', recommended_skus: { mascara: 267 } },
    },
    tags: ['cleangirl', 'goldshimmer', 'fulllook'],
    created_at: '2026-11-10T20:15:00.000000+00:00',
    description:
      'Look completo Clean Girl con las 4 áreas: labios nude suave, cejas café, sombras dorado bronce y pestañas negras.',
    liked_by: [],
    appeal_status: 'none',
    comments: [],
    author_username: 'aurasmatch_bot',
  },
  {
    id: 'c30b1432-3d4e-4270-af18-9f4c0685e666',
    user_id: '2fb75323-525b-482a-bf38-e0ea63275a04',
    image_path: 'user_looks/grunge-olive-plum.jpg',
    is_human_verified: true,
    ai_confidence_score: 0.12,
    subculture: ['Goth'],
    subculture_confidence_score: 0.91,
    // Solo Párpados y Labios (Verde oliva y Vino ciruela)
    extracted_regions: {
      eyelids: { hex_value: '#3B6E52', recommended_skus: { eyeshadow: 122 } },
      lips: { hex_value: '#5B1E31', recommended_skus: { lipstick: 751 } },
    },
    tags: ['goth', 'olivegreen', 'darkplum'],
    created_at: '2026-11-11T08:00:00.000000+00:00',
    description:
      'Look Goth con sombras verde oliva esmeralda y labios en tono vino ciruela profundo.',
    liked_by: [],
    appeal_status: 'none',
    comments: [],
    author_username: 'aurasmatch_bot',
  },
  {
    id: 'd41c2543-4e5f-4381-b029-0a5d1796f777',
    user_id: '2fb75323-525b-482a-bf38-e0ea63275a04',
    image_path: 'user_looks/coral-peach-look.jpg',
    is_human_verified: true,
    ai_confidence_score: 0.09,
    subculture: ['Clean Girl'],
    subculture_confidence_score: 0.92,
    // Solo Labios (Coral durazno cálido)
    extracted_regions: {
      lips: { hex_value: '#E07A5F', recommended_skus: { lipstick: 2 } },
    },
    tags: ['cleangirl', 'coralpeach', 'warmtones'],
    created_at: '2026-11-11T14:30:00.000000+00:00',
    description:
      'Estilo cálido y luminoso con labios en tono coral durazno vibrante.',
    liked_by: [],
    appeal_status: 'none',
    comments: [],
    author_username: 'aurasmatch_bot',
  },
];

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

const LOCAL_INTERACTIONS_KEY = '@aurasmatch/local_look_interactions_v1';

interface LocalLookOverrides {
  likedLookIds: string[];
  savedLookIds: string[];
  descriptionsByLookId: Record<string, string>;
  appealsByLookId: Record<string, AppealStatus>;
  commentsByLookId: Record<string, LookCommentItem[]>;
  userCreatedLooks: LookRow[];
}

const DEFAULT_LOCAL_OVERRIDES: LocalLookOverrides = {
  likedLookIds: [],
  savedLookIds: [],
  descriptionsByLookId: {},
  appealsByLookId: {},
  commentsByLookId: {},
  userCreatedLooks: [],
};

export async function getLocalLookOverrides(): Promise<LocalLookOverrides> {
  try {
    const raw = await safeAuthStorage.getItem(LOCAL_INTERACTIONS_KEY);
    if (!raw) return DEFAULT_LOCAL_OVERRIDES;
    const parsed = JSON.parse(raw) as Partial<LocalLookOverrides>;
    return {
      ...DEFAULT_LOCAL_OVERRIDES,
      ...parsed,
      userCreatedLooks: Array.isArray(parsed.userCreatedLooks) ? parsed.userCreatedLooks : [],
    };
  } catch {
    return DEFAULT_LOCAL_OVERRIDES;
  }
}

export async function saveLocalLookOverrides(next: LocalLookOverrides): Promise<void> {
  await safeAuthStorage.setItem(LOCAL_INTERACTIONS_KEY, JSON.stringify(next));
}

export const IN_MEMORY_USER_LOOKS = new Map<string, LookRow>();

/**
 * Persists a newly uploaded or simulated look in memory, mirror, and local overrides
 * so it immediately resolves in `fetchLookById` and displays in the feed.
 */
export async function saveUserCreatedLook(look: LookRow): Promise<void> {
  // 1. In-memory map (synchronous and immune to localStorage size quotas)
  IN_MEMORY_USER_LOOKS.set(look.id, look);

  // 2. Prepend to mirror looks array
  const mirrorIdx = REAL_SUPABASE_MIRROR_LOOKS.findIndex((l) => l.id === look.id);
  if (mirrorIdx >= 0) {
    REAL_SUPABASE_MIRROR_LOOKS[mirrorIdx] = look;
  } else {
    REAL_SUPABASE_MIRROR_LOOKS.unshift(look);
  }

  // 3. Persist in AsyncStorage
  try {
    const overrides = await getLocalLookOverrides();
    const existingIdx = overrides.userCreatedLooks.findIndex((l) => l.id === look.id);
    // Sanitize huge data URLs to avoid QuotaExceededError in localStorage
    const storableLook: LookRow = {
      ...look,
      image_path: look.image_path.length > 50000 ? 'user_looks/saved-look.jpg' : look.image_path,
    };
    if (existingIdx >= 0) {
      overrides.userCreatedLooks[existingIdx] = storableLook;
    } else {
      overrides.userCreatedLooks.unshift(storableLook);
    }
    await saveLocalLookOverrides(overrides);
  } catch {
    // Memory map ensures session availability
  }
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

  if (!isSupabaseConfigured) {
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
): Promise<void> {
  if (!isSupabaseConfigured || !userId || userId.startsWith('demo-')) return;

  try {
    await supabase
      .from('profiles')
      .update({
        accessibility_prefs: {
          theme_mode: prefs.theme_mode,
          high_contrast: prefs.high_contrast,
          dyslexia_font: prefs.dyslexia_font,
          font_family_variant: prefs.font_family_variant,
          font_scale: prefs.font_scale,
          reduced_motion: prefs.reduced_motion,
        },
      })
      .eq('id', userId);
  } catch {
    // Ignore cloud sync errors; local AsyncStorage in AccessibilityContext already saved it
  }
}

/**
 * Fetches a single look by ID, hydrating image URLs, like status, and saved status.
 */
export async function fetchLookById(
  lookId: string,
  currentUserId?: string | null
): Promise<LookRow | null> {
  // 1. In-memory user looks map (guaranteed synchronous availability)
  if (IN_MEMORY_USER_LOOKS.has(lookId)) {
    const memLook = IN_MEMORY_USER_LOOKS.get(lookId)!;
    const overrides = await getLocalLookOverrides();
    const isLikedByMe = currentUserId
      ? (memLook.liked_by || []).includes(currentUserId)
      : overrides.likedLookIds.includes(lookId);
    const isSavedByMe = overrides.savedLookIds.includes(lookId);

    return {
      ...memLook,
      resolved_image_url:
        memLook.resolved_image_url || resolveLookImageUrl(memLook.image_path, memLook.id),
      is_liked_by_me: isLikedByMe,
      is_saved_by_me: isSavedByMe,
      description: overrides.descriptionsByLookId[lookId] || memLook.description || '',
      appeal_status: overrides.appealsByLookId[lookId] || memLook.appeal_status || 'none',
      comments: overrides.commentsByLookId[lookId] || memLook.comments || [],
    };
  }

  const overrides = await getLocalLookOverrides();

  // 2. Check userCreatedLooks in AsyncStorage overrides
  const localUserLook = (overrides.userCreatedLooks || []).find((item) => item.id === lookId);
  if (localUserLook) {
    const isLikedByMe = currentUserId
      ? (localUserLook.liked_by || []).includes(currentUserId)
      : overrides.likedLookIds.includes(lookId);
    const isSavedByMe = overrides.savedLookIds.includes(lookId);

    return {
      ...localUserLook,
      resolved_image_url:
        localUserLook.resolved_image_url ||
        resolveLookImageUrl(localUserLook.image_path, localUserLook.id),
      is_liked_by_me: isLikedByMe,
      is_saved_by_me: isSavedByMe,
      description: overrides.descriptionsByLookId[lookId] || localUserLook.description || '',
      appeal_status: overrides.appealsByLookId[lookId] || localUserLook.appeal_status || 'none',
      comments: overrides.commentsByLookId[lookId] || localUserLook.comments || [],
    };
  }

  // 3. Query Supabase (only if lookId matches standard UUID syntax)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookId);
  if (isSupabaseConfigured && isUUID) {
    try {
      const { data, error } = await supabase
        .from('looks')
        .select('*')
        .eq('id', lookId)
        .maybeSingle();

      if (!error && data) {
        let isSavedByMe = false;
        if (currentUserId && !currentUserId.startsWith('demo-')) {
          const { data: savedRow } = await supabase
            .from('saved_looks')
            .select('look_id')
            .eq('user_id', currentUserId)
            .eq('look_id', lookId)
            .maybeSingle();
          isSavedByMe = Boolean(savedRow);
        } else {
          isSavedByMe = overrides.savedLookIds.includes(lookId);
        }

        const likedBy = Array.isArray(data.liked_by) ? data.liked_by : [];
        const isLikedByMe = currentUserId
          ? likedBy.includes(currentUserId)
          : overrides.likedLookIds.includes(lookId);

        return {
          ...(data as LookRow),
          resolved_image_url: resolveLookImageUrl(data.image_path, data.id),
          is_saved_by_me: isSavedByMe,
          is_liked_by_me: isLikedByMe,
          liked_by: likedBy,
          description: overrides.descriptionsByLookId[lookId] || data.description || '',
          appeal_status: overrides.appealsByLookId[lookId] || data.appeal_status || 'none',
          comments: overrides.commentsByLookId[lookId] || data.comments || [],
        };
      }
    } catch {
      // Fallback below
    }
  }

  // 4. Fallback mirror search
  const found = REAL_SUPABASE_MIRROR_LOOKS.find((item) => item.id === lookId);
  if (!found) return null;

  const isLikedByMe = currentUserId
    ? found.liked_by.includes(currentUserId)
    : overrides.likedLookIds.includes(lookId);

  const isSavedByMe = overrides.savedLookIds.includes(lookId);

  return {
    ...found,
    resolved_image_url: resolveLookImageUrl(found.image_path, found.id),
    is_liked_by_me: isLikedByMe,
    is_saved_by_me: isSavedByMe,
    description: overrides.descriptionsByLookId[lookId] || found.description,
    appeal_status: overrides.appealsByLookId[lookId] || found.appeal_status || 'none',
    comments: overrides.commentsByLookId[lookId] || found.comments || [],
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
 * Fetches similar verified looks sharing subculture or similar facial color families.
 */
export async function fetchSimilarLooks(
  currentLook: LookRow,
  limit: number = 4
): Promise<LookRow[]> {
  const overrides = await getLocalLookOverrides();
  const subcultures = currentLook.subculture || [];
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentLook.id);

  if (isSupabaseConfigured && isUUID) {
    try {
      const { data, error } = await supabase
        .from('looks')
        .select('*')
        .eq('is_human_verified', true)
        .neq('id', currentLook.id)
        .limit(limit * 2);

      if (!error && Array.isArray(data) && data.length > 0) {
        // Sort by matching subculture first
        const sorted = data.sort((a, b) => {
          const aMatch = (a.subculture || []).some((s: string) => (subcultures as string[]).includes(s));
          const bMatch = (b.subculture || []).some((s: string) => (subcultures as string[]).includes(s));
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });

        return sorted.slice(0, limit).map((item) => ({
          ...(item as LookRow),
          resolved_image_url: resolveLookImageUrl(item.image_path, item.id),
          is_liked_by_me: overrides.likedLookIds.includes(item.id),
          is_saved_by_me: overrides.savedLookIds.includes(item.id),
        }));
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
    is_liked_by_me: overrides.likedLookIds.includes(item.id),
    is_saved_by_me: overrides.savedLookIds.includes(item.id),
  }));
}

/**
 * Updates a look's description in Supabase and local overrides.
 * Fulfills 2ndPhaseProposal.pdf Section V.D (Editable AI-suggested alt-text).
 */
export async function updateLookDescription(lookId: string, description: string): Promise<void> {
  const overrides = await getLocalLookOverrides();
  overrides.descriptionsByLookId[lookId] = description;
  await saveLocalLookOverrides(overrides);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('looks')
        .update({ description })
        .eq('id', lookId);
    } catch {
      // Local override persists offline
    }
  }
}

/**
 * Requests a human appeal for a look rejected by the Anti-AI filter.
 * Sets appeal_status = 'pending' in Supabase and local overrides.
 * Fulfills Project Proposal.pdf Section IV.C (Mitigation of AI false positives).
 */
export async function requestLookAppeal(lookId: string): Promise<void> {
  const overrides = await getLocalLookOverrides();
  overrides.appealsByLookId[lookId] = 'pending';
  await saveLocalLookOverrides(overrides);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('looks')
        .update({ appeal_status: 'pending' })
        .eq('id', lookId);
    } catch {
      // Local override persists offline
    }
  }
}


