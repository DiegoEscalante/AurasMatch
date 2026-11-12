/**
 * Fuzzy Search and Typo Tolerance Utility for AurasMatch.
 * Implements Levenshtein distance calculations and typo tolerance for subcultures,
 * facial categories, cosmetic colors, and makeup keywords.
 * 
 * Fulfills:
 * - 2ndPhaseProposal.pdf Section V.B (Cognitive diversity: Error tolerance and predictive chips).
 * - WCAG 2.1 SC 3.3.3 (Error Suggestion).
 */

import { AESTHETIC_SUBCULTURES, AestheticSubculture, FACIAL_REGION_LABELS, FacialRegionKey } from '@/types/database';
import { COLOR_FAMILIES } from '@/utils/color-names';

/**
 * Computes the Levenshtein distance between two strings.
 * Represents the minimum number of single-character edits (insertions, deletions, or substitutions)
 * required to change one string into the other.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();

  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Use two rows instead of full matrix to minimize memory allocation
  let prevRow = new Array(n + 1);
  let currRow = new Array(n + 1);

  for (let j = 0; j <= n; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    const char1 = s1.charCodeAt(i - 1);

    for (let j = 1; j <= n; j++) {
      const char2 = s2.charCodeAt(j - 1);
      const cost = char1 === char2 ? 0 : 1;

      currRow[j] = Math.min(
        prevRow[j] + 1,       // deletion
        currRow[j - 1] + 1,   // insertion
        prevRow[j - 1] + cost // substitution
      );
    }

    // Swap rows
    for (let j = 0; j <= n; j++) {
      prevRow[j] = currRow[j];
    }
  }

  return prevRow[n];
}

/**
 * Normalizes text for search comparison: strips diacritics/accents, converts to lower case,
 * and removes excessive punctuation.
 */
export function normalizeSearchString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .trim();
}

/**
 * Pre-indexed dictionary of searchable keywords with their canonical representations.
 */
export interface SearchSuggestionItem {
  id: string;
  label: string;
  type: 'subculture' | 'facial_zone' | 'color' | 'general';
  targetValue?: string;
}

export const CANONICAL_SEARCH_ITEMS: SearchSuggestionItem[] = [
  // 5 Subcultures
  { id: 'sub-jirai', label: 'Jirai Kei', type: 'subculture', targetValue: 'Jirai Kei' },
  { id: 'sub-clean', label: 'Clean Girl', type: 'subculture', targetValue: 'Clean Girl' },
  { id: 'sub-goth', label: 'Goth', type: 'subculture', targetValue: 'Goth' },
  { id: 'sub-egirl', label: 'E-Girl', type: 'subculture', targetValue: 'E-Girl' },
  { id: 'sub-y2k', label: 'Y2K', type: 'subculture', targetValue: 'Y2K' },

  // 4 Facial Regions
  { id: 'zone-lips', label: 'Labios', type: 'facial_zone', targetValue: 'lips' },
  { id: 'zone-brows', label: 'Cejas', type: 'facial_zone', targetValue: 'brows' },
  { id: 'zone-eyelids', label: 'Párpados / Sombras', type: 'facial_zone', targetValue: 'eyelids' },
  { id: 'zone-lash', label: 'Delineado / Pestañas', type: 'facial_zone', targetValue: 'lash_line' },

  // Color Families
  ...COLOR_FAMILIES.map((c) => ({
    id: `color-${c.id}`,
    label: c.name,
    type: 'color' as const,
    targetValue: c.id,
  })),

  // Common makeup query aliases
  { id: 'alias-labial', label: 'Labial', type: 'general' },
  { id: 'alias-delineador', label: 'Delineador', type: 'general' },
  { id: 'alias-sombras', label: 'Sombras de ojos', type: 'general' },
  { id: 'alias-pestanas', label: 'Pestañas', type: 'general' },
  { id: 'alias-gotico', label: 'Gótico', type: 'subculture', targetValue: 'Goth' },
  { id: 'alias-natural', label: 'Natural / Clean', type: 'subculture', targetValue: 'Clean Girl' },
];

/**
 * Checks if a candidate text matches a query either via direct substring inclusion
 * or via Levenshtein fuzzy similarity with a tolerance proportional to length.
 */
export function matchesFuzzy(candidate: string, query: string): boolean {
  const normCandidate = normalizeSearchString(candidate);
  const normQuery = normalizeSearchString(query);

  if (!normQuery) return true;
  if (!normCandidate) return false;

  // Direct substring match is always a hit
  if (normCandidate.includes(normQuery)) {
    return true;
  }

  // Tokenize candidate words and test against query
  const words = normCandidate.split(/\s+/);
  for (const word of words) {
    if (word.includes(normQuery)) return true;

    // For words of length >= 4, allow distance up to 2
    const maxDist = normQuery.length >= 6 ? 2 : normQuery.length >= 4 ? 1 : 0;
    if (maxDist > 0 && Math.abs(word.length - normQuery.length) <= maxDist) {
      if (levenshteinDistance(word, normQuery) <= maxDist) {
        return true;
      }
    }
  }

  // Full string Levenshtein distance check for short typos (e.g. "egilr" -> "e-girl")
  const maxTotalDist = normQuery.length >= 7 ? 2 : normQuery.length >= 4 ? 1 : 0;
  if (maxTotalDist > 0 && Math.abs(normCandidate.length - normQuery.length) <= maxTotalDist) {
    if (levenshteinDistance(normCandidate, normQuery) <= maxTotalDist) {
      return true;
    }
  }

  return false;
}

/**
 * Generates predictive suggestions based on what the user is typing,
 * suggesting canonical subcultures, facial zones, and colors even if typed with typos.
 */
export function getSearchSuggestions(
  query: string,
  limit: number = 4
): SearchSuggestionItem[] {
  const normQuery = normalizeSearchString(query);
  if (normQuery.length < 2) return [];

  const scored: { item: SearchSuggestionItem; score: number }[] = [];

  for (const item of CANONICAL_SEARCH_ITEMS) {
    const normLabel = normalizeSearchString(item.label);

    // Exact prefix match gets highest score
    if (normLabel.startsWith(normQuery)) {
      scored.push({ item, score: 0 });
      continue;
    }

    // Substring match gets second highest score
    if (normLabel.includes(normQuery)) {
      scored.push({ item, score: 1 });
      continue;
    }

    // Levenshtein fuzzy match
    const words = normLabel.split(/\s+/);
    let bestDist = Infinity;
    for (const w of words) {
      const dist = levenshteinDistance(w, normQuery);
      if (dist < bestDist) bestDist = dist;
    }

    const maxAllowedDist = normQuery.length >= 5 ? 2 : 1;
    if (bestDist <= maxAllowedDist) {
      scored.push({ item, score: 2 + bestDist });
    }
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => s.item);
}

