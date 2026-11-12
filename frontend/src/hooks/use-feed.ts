/**
 * Headless Custom Hook for the Community Feed and Triple Filter.
 * Manages fetching of verified human looks (`is_human_verified = true`),
 * the Contextual Intelligent Combination filter (Subculture + Facial Zone + CIELAB Color),
 * fuzzy search autocomplete, and gradual engagement for likes & saves.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  getLocalLookOverrides,
  isSupabaseConfigured,
  REAL_SUPABASE_MIRROR_LOOKS,
  resolveLookImageUrl,
  saveLocalLookOverrides,
  supabase,
} from '@/services/supabase';
import {
  AestheticSubculture,
  FacialRegionKey,
  LookRow,
} from '@/types/database';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';
import {
  COLOR_FAMILIES,
  ColorFamilyId,
  computeDeltaE,
  getClosestColorFamily,
  hexToCielab,
} from '@/utils/color-names';
import {
  getSearchSuggestions,
  matchesFuzzy,
  SearchSuggestionItem,
} from '@/utils/fuzzy-search';

export interface UseFeedFilterReturn {
  // Data
  looks: LookRow[];
  filteredLooks: LookRow[];
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;

  // Filter controls
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedSubculture: AestheticSubculture | null;
  setSelectedSubculture: (subculture: AestheticSubculture | null) => void;
  selectedFacialZone: FacialRegionKey | null;
  setSelectedFacialZone: (zone: FacialRegionKey | null) => void;
  selectedColorFamily: ColorFamilyId | null;
  setSelectedColorFamily: (color: ColorFamilyId | null) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;

  // Derived info & suggestions
  activeFilterCount: number;
  suggestions: SearchSuggestionItem[];
  applySuggestion: (item: SearchSuggestionItem) => void;
  clearFilters: () => void;

  // Actions
  refreshFeed: () => Promise<void>;
  toggleLike: (lookId: string) => Promise<{ requiresAuth: boolean }>;
  toggleSave: (lookId: string) => Promise<{ requiresAuth: boolean }>;
}

function hydrateLook(
  raw: Record<string, any>,
  currentUserId: string | undefined,
  savedLookIds: Set<string>,
  localOverrides: Awaited<ReturnType<typeof getLocalLookOverrides>>
): LookRow {
  const id = String(raw.id);
  const dbLikedBy = Array.isArray(raw.liked_by) ? (raw.liked_by as string[]) : [];
  const mergedLikedBy = Array.from(
    new Set([
      ...dbLikedBy,
      ...(localOverrides.likedLookIds.includes(id) && currentUserId ? [currentUserId] : []),
    ])
  );

  const isLikedByMe = Boolean(currentUserId && mergedLikedBy.includes(currentUserId));
  const isSavedByMe = savedLookIds.has(id) || localOverrides.savedLookIds.includes(id);

  const subcultureList = Array.isArray(raw.subculture)
    ? (raw.subculture as string[])
    : typeof raw.subculture === 'string'
    ? [raw.subculture]
    : [];

  const description =
    localOverrides.descriptionsByLookId[id] ||
    (typeof raw.description === 'string' && raw.description.trim()
      ? raw.description
      : `Look de maquillaje estilo ${subcultureList.join(', ') || 'alternativo'}.`);

  return {
    id,
    user_id: String(raw.user_id),
    image_path: String(raw.image_path || ''),
    is_human_verified: Boolean(raw.is_human_verified),
    ai_confidence_score: Number(raw.ai_confidence_score ?? 0),
    subculture: subcultureList,
    subculture_confidence_score:
      raw.subculture_confidence_score !== null && raw.subculture_confidence_score !== undefined
        ? Number(raw.subculture_confidence_score)
        : null,
    extracted_regions: (raw.extracted_regions as LookRow['extracted_regions']) || {},
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    created_at: String(raw.created_at || new Date().toISOString()),
    description,
    liked_by: mergedLikedBy,
    appeal_status: localOverrides.appealsByLookId[id] || raw.appeal_status || 'none',
    comments: localOverrides.commentsByLookId[id] || (Array.isArray(raw.comments) ? raw.comments : []),
    resolved_image_url: resolveLookImageUrl(raw.image_path, id),
    is_liked_by_me: isLikedByMe,
    is_saved_by_me: isSavedByMe,
    author_username: raw.author_username || 'aurasmatch_bot',
  };
}

export function useFeed(): UseFeedFilterReturn {
  const { profile, isAuthenticated } = useAuth();
  const currentUserId = profile?.id;

  const [looks, setLooks] = useState<LookRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubculture, setSelectedSubculture] = useState<AestheticSubculture | null>(null);
  const [selectedFacialZone, setSelectedFacialZone] = useState<FacialRegionKey | null>(null);
  const [selectedColorFamily, setSelectedColorFamily] = useState<ColorFamilyId | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Fetch verified looks
  const fetchLooks = useCallback(async (isRefresh: boolean = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const overrides = await getLocalLookOverrides();
      const savedSet = new Set<string>(overrides.savedLookIds);

      // Fetch saved looks if logged in
      if (isSupabaseConfigured && currentUserId && !currentUserId.startsWith('demo-')) {
        const { data: savedData } = await supabase
          .from('saved_looks')
          .select('look_id')
          .eq('user_id', currentUserId);
        if (savedData) {
          for (const s of savedData) {
            savedSet.add(s.look_id);
          }
        }
      }

      let fetchedList: LookRow[] = [];

      if (isSupabaseConfigured) {
        // Query strictly human-verified looks (Guarantee of Absolute Realism)
        const { data, error } = await supabase
          .from('looks')
          .select('*')
          .eq('is_human_verified', true)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          fetchedList = data.map((item) =>
            hydrateLook(item, currentUserId, savedSet, overrides)
          );
        }
      }

      // If empty or offline, use verified mirror looks
      if (fetchedList.length === 0) {
        fetchedList = REAL_SUPABASE_MIRROR_LOOKS.filter((l) => l.is_human_verified).map((item) =>
          hydrateLook(item, currentUserId, savedSet, overrides)
        );
      }

      // Prepend user-created looks so newly published looks appear at the top of the feed
      const userLooks = (overrides.userCreatedLooks || [])
        .filter((l) => l.is_human_verified)
        .map((item) => hydrateLook(item, currentUserId, savedSet, overrides));

      const existingIds = new Set(userLooks.map((l) => l.id));
      const combined = [...userLooks, ...fetchedList.filter((l) => !existingIds.has(l.id))];

      setLooks(combined);
    } catch (err: any) {
      setErrorMessage('No se pudieron sincronizar las publicaciones con el servidor.');
      // Fallback
      const overrides = await getLocalLookOverrides();
      const userLooks = (overrides.userCreatedLooks || [])
        .filter((l) => l.is_human_verified)
        .map((item) => hydrateLook(item, currentUserId, new Set(overrides.savedLookIds), overrides));
      const existingIds = new Set(userLooks.map((l) => l.id));
      const fallbackList = REAL_SUPABASE_MIRROR_LOOKS.filter((l) => l.is_human_verified).map((item) =>
        hydrateLook(item, currentUserId, new Set(overrides.savedLookIds), overrides)
      );
      setLooks([...userLooks, ...fallbackList.filter((l) => !existingIds.has(l.id))]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchLooks();
  }, [fetchLooks]);

  // Derived filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSubculture) count += 1;
    if (selectedFacialZone) count += 1;
    if (selectedColorFamily) count += 1;
    return count;
  }, [selectedSubculture, selectedFacialZone, selectedColorFamily]);

  // Reset filters
  const clearFilters = useCallback(() => {
    setSelectedSubculture(null);
    setSelectedFacialZone(null);
    setSelectedColorFamily(null);
    setSearchQuery('');
    triggerHapticFeedback();
    announceStatus('Todos los filtros han sido limpiados.');
  }, []);

  // Suggestions based on search input
  const suggestions = useMemo(() => {
    return getSearchSuggestions(searchQuery, 4);
  }, [searchQuery]);

  const applySuggestion = useCallback((item: SearchSuggestionItem) => {
    triggerHapticFeedback();
    if (item.type === 'subculture' && item.targetValue) {
      setSelectedSubculture(item.targetValue as AestheticSubculture);
      setSearchQuery('');
      announceStatus(`Filtro aplicado: Estilo ${item.label}`);
    } else if (item.type === 'facial_zone' && item.targetValue) {
      setSelectedFacialZone(item.targetValue as FacialRegionKey);
      setSearchQuery('');
      announceStatus(`Filtro aplicado: Área ${item.label}`);
    } else if (item.type === 'color' && item.targetValue) {
      setSelectedColorFamily(item.targetValue as ColorFamilyId);
      setSearchQuery('');
      announceStatus(`Filtro aplicado: Color ${item.label}`);
    } else {
      setSearchQuery(item.label);
      announceStatus(`Buscando ${item.label}`);
    }
  }, []);

  // Contextual Intelligent Combination Filter Logic
  const filteredLooks = useMemo(() => {
    return looks.filter((look) => {
      // 1. Subculture Filter
      if (selectedSubculture) {
        const matchesSubculture = look.subculture.some(
          (sub) => sub.toLowerCase() === selectedSubculture.toLowerCase()
        );
        if (!matchesSubculture) return false;
      }

      // 2. Zone + Color combination
      const regions = look.extracted_regions || {};

      if (selectedFacialZone && selectedColorFamily) {
        // Must have this specific zone, AND its primary color family must match selectedColorFamily
        const zoneData = regions[selectedFacialZone];
        if (!zoneData || !zoneData.hex_value) return false;

        const closestFamily = getClosestColorFamily(zoneData.hex_value);
        if (closestFamily.id !== selectedColorFamily) return false;
      } else if (selectedColorFamily) {
        // Color alone: must match ANY of the extracted zones by primary color family
        const hasMatchingColor = Object.values(regions).some((zoneData) => {
          if (!zoneData || !zoneData.hex_value) return false;
          const closest = getClosestColorFamily(zoneData.hex_value);
          return closest.id === selectedColorFamily;
        });
        if (!hasMatchingColor) return false;
      } else if (selectedFacialZone) {
        // Zone alone: must have that zone extracted
        const zoneData = regions[selectedFacialZone];
        if (!zoneData || !zoneData.hex_value) return false;
      }

      // 3. Search query filter with fuzzy typo tolerance
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        // Check subcultures
        const subMatch = look.subculture.some((s) => matchesFuzzy(s, q));
        if (subMatch) return true;

        // Check description
        if (matchesFuzzy(look.description, q)) return true;

        // Check tags
        const tagMatch = look.tags.some((t) => matchesFuzzy(t, q));
        if (tagMatch) return true;

        // Check author
        if (look.author_username && matchesFuzzy(look.author_username, q)) return true;

        // Check extracted color names
        const colorMatch = Object.values(regions).some((z) => {
          if (!z || !z.hex_value) return false;
          const name = getClosestColorFamily(z.hex_value).name;
          return matchesFuzzy(name, q);
        });
        if (colorMatch) return true;

        return false;
      }

      return true;
    });
  }, [looks, selectedSubculture, selectedFacialZone, selectedColorFamily, searchQuery]);

  // Gradual Engagement: Like action
  const toggleLike = useCallback(
    async (lookId: string): Promise<{ requiresAuth: boolean }> => {
      if (!isAuthenticated || !currentUserId) {
        triggerHapticFeedback('light');
        return { requiresAuth: true };
      }

      triggerHapticFeedback('medium');

      // Optimistic update
      setLooks((prev) =>
        prev.map((l) => {
          if (l.id !== lookId) return l;
          const currentlyLiked = l.is_liked_by_me;
          const nextLiked = !currentlyLiked;
          const nextLikedBy = nextLiked
            ? Array.from(new Set([...l.liked_by, currentUserId]))
            : l.liked_by.filter((uid) => uid !== currentUserId);

          return {
            ...l,
            is_liked_by_me: nextLiked,
            liked_by: nextLikedBy,
          };
        })
      );

      // Persist in local overrides
      const overrides = await getLocalLookOverrides();
      const nextLikedIds = overrides.likedLookIds.includes(lookId)
        ? overrides.likedLookIds.filter((id) => id !== lookId)
        : [...overrides.likedLookIds, lookId];
      await saveLocalLookOverrides({ ...overrides, likedLookIds: nextLikedIds });

      // Persist in Supabase if live
      if (isSupabaseConfigured && !currentUserId.startsWith('demo-')) {
        try {
          const targetLook = looks.find((l) => l.id === lookId);
          if (targetLook) {
            const nextList = targetLook.is_liked_by_me
              ? targetLook.liked_by.filter((uid) => uid !== currentUserId)
              : Array.from(new Set([...targetLook.liked_by, currentUserId]));

            await supabase.from('looks').update({ liked_by: nextList }).eq('id', lookId);
          }
        } catch {
          // Handled gracefully
        }
      }

      announceStatus('Estado de me gusta actualizado');
      return { requiresAuth: false };
    },
    [isAuthenticated, currentUserId, looks]
  );

  // Gradual Engagement: Save action
  const toggleSave = useCallback(
    async (lookId: string): Promise<{ requiresAuth: boolean }> => {
      if (!isAuthenticated || !currentUserId) {
        triggerHapticFeedback('light');
        return { requiresAuth: true };
      }

      triggerHapticFeedback('medium');

      // Optimistic update
      setLooks((prev) =>
        prev.map((l) => {
          if (l.id !== lookId) return l;
          return {
            ...l,
            is_saved_by_me: !l.is_saved_by_me,
          };
        })
      );

      // Persist locally
      const overrides = await getLocalLookOverrides();
      const isSaved = overrides.savedLookIds.includes(lookId);
      const nextSavedIds = isSaved
        ? overrides.savedLookIds.filter((id) => id !== lookId)
        : [...overrides.savedLookIds, lookId];
      await saveLocalLookOverrides({ ...overrides, savedLookIds: nextSavedIds });

      // Persist in Supabase if live
      if (isSupabaseConfigured && !currentUserId.startsWith('demo-')) {
        try {
          if (isSaved) {
            await supabase
              .from('saved_looks')
              .delete()
              .eq('user_id', currentUserId)
              .eq('look_id', lookId);
          } else {
            await supabase
              .from('saved_looks')
              .upsert({ user_id: currentUserId, look_id: lookId }, { onConflict: 'user_id,look_id' });
          }
        } catch {
          // Handled gracefully
        }
      }

      announceStatus('Colección guardada actualizada');
      return { requiresAuth: false };
    },
    [isAuthenticated, currentUserId]
  );

  return {
    looks,
    filteredLooks,
    isLoading,
    isRefreshing,
    errorMessage,
    searchQuery,
    setSearchQuery,
    selectedSubculture,
    setSelectedSubculture,
    selectedFacialZone,
    setSelectedFacialZone,
    selectedColorFamily,
    setSelectedColorFamily,
    isFilterOpen,
    setIsFilterOpen,
    activeFilterCount,
    suggestions,
    applySuggestion,
    clearFilters,
    refreshFeed: () => fetchLooks(true),
    toggleLike,
    toggleSave,
  };
}

