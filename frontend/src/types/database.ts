import { AccessibilityPrefs } from '@/contexts/accessibility-context';

/**
 * The 5 core aesthetic subcultures defined in Project Proposal.pdf (Section II.B)
 * and stored in the PostgreSQL enum `public.aesthetic_subculture`.
 */
export const AESTHETIC_SUBCULTURES = [
  'Jirai Kei',
  'Clean Girl',
  'Goth',
  'E-Girl',
  'Y2K',
] as const;

export type AestheticSubculture = (typeof AESTHETIC_SUBCULTURES)[number];

/**
 * The 4 facial segmentation regions extracted by MediaPipe in the backend.
 */
export const FACIAL_REGIONS = ['lips', 'brows', 'eyelids', 'lash_line'] as const;
export type FacialRegionKey = (typeof FACIAL_REGIONS)[number];

export const FACIAL_REGION_LABELS: Record<FacialRegionKey, string> = {
  lips: 'Labios',
  brows: 'Cejas',
  eyelids: 'Párpados / Sombras',
  lash_line: 'Línea de Pestañas / Delineado',
};

export const FACIAL_REGION_COMPACT_LABELS: Record<FacialRegionKey, string> = {
  lips: 'Labios',
  brows: 'Cejas',
  eyelids: 'Párpados',
  lash_line: 'Delineado',
};

export const FACIAL_REGION_ICONS: Record<FacialRegionKey, string> = {
  lips: '👄',
  brows: '✨',
  eyelids: '👁️',
  lash_line: '👁️‍🗨️',
};

/**
 * The 6 cosmetic SKU categories in `public.products`.
 */
export type CosmeticCategory =
  | 'lipstick'
  | 'lip_liner'
  | 'eyebrow'
  | 'eyeshadow'
  | 'eyeliner'
  | 'mascara';

export const COSMETIC_CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  lipstick: 'Labial (Lipstick)',
  lip_liner: 'Delineador de Labios (Lip Liner)',
  eyebrow: 'Cejas (Eyebrow)',
  eyeshadow: 'Sombra de Ojos (Eyeshadow)',
  eyeliner: 'Delineador de Ojos (Eyeliner)',
  mascara: 'Pestañina / Rímel (Mascara)',
};

export const COSMETIC_CATEGORY_SHORT_LABELS: Record<CosmeticCategory, string> = {
  lipstick: 'Labial',
  lip_liner: 'Delineador de Labios',
  eyebrow: 'Lápiz de Cejas',
  eyeshadow: 'Sombras de Ojos',
  eyeliner: 'Delineador de Ojos',
  mascara: 'Máscara de Pestañas',
};

export interface ExtractedRegionDetail {
  hex_value: string;
  recommended_skus: Partial<Record<CosmeticCategory, number>>;
}

export type ExtractedRegionsMap = Partial<Record<FacialRegionKey, ExtractedRegionDetail>>;

export type AppealStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface LookCommentItem {
  id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

/**
 * Row schema for `public.profiles` in Supabase.
 */
export interface ProfileRow {
  id: string;
  username: string;
  avatar_path: string | null;
  accessibility_prefs: Partial<AccessibilityPrefs> | null;
  created_at: string;
}

/**
 * Row schema for `public.looks` in Supabase (including the 4 additive Phase 03 columns).
 */
export interface LookRow {
  id: string;
  user_id: string;
  image_path: string;
  is_human_verified: boolean;
  ai_confidence_score: number;
  subculture: AestheticSubculture[] | string[];
  subculture_confidence_score: number | null;
  extracted_regions: ExtractedRegionsMap;
  tags: string[];
  created_at: string;
  // Additive Phase 03 columns (with automatic fallback defaults)
  description: string;
  liked_by: string[];
  appeal_status: AppealStatus;
  comments: LookCommentItem[];
  // Hydrated join / UI helper fields
  author_username?: string;
  resolved_image_url?: string;
  is_saved_by_me?: boolean;
  is_liked_by_me?: boolean;
}

/**
 * Row schema for `public.products` (3,085 cosmetic shades in Supabase).
 */
export interface ProductRow {
  id: number;
  parent_api_id: number | null;
  brand: string | null;
  product_name: string;
  shade_name: string | null;
  hex_value: string;
  category: CosmeticCategory | string;
  image_url: string | null;
  price_usd: number | null;
  cielab_l: number;
  cielab_a: number;
  cielab_b: number;
  created_at: string;
  resolved_image_url?: string;
}

/**
 * Row schema for `public.saved_looks` in Supabase.
 */
export interface SavedLookRow {
  user_id: string;
  look_id: string;
  created_at: string;
}

/**
 * Umbral máximo de probabilidad sintética (`ai_confidence_score`) permitido antes de
 * rechazar una imagen como IA (`backend/app/cv/anti_ai.py`: `ai_threshold = 0.50`).
 */
export const ANTI_AI_REJECTION_THRESHOLD = 0.5;

/**
 * Valida si un look aprueba el filtro Anti-IA usando tanto la bandera booleana del servidor
 * como la regla numérica estricta `ai_confidence_score < 0.50`.
 */
export function isLookHumanApproved(
  isHumanVerified?: boolean | null,
  aiConfidenceScore?: number | null
): boolean {
  if (!isHumanVerified) return false;
  if (aiConfidenceScore === null || aiConfidenceScore === undefined) return true;
  const numericScore = Number(aiConfidenceScore);
  if (!Number.isFinite(numericScore)) return false;
  return numericScore >= 0 && numericScore < ANTI_AI_REJECTION_THRESHOLD;
}

