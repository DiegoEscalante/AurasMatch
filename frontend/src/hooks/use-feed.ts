/**
 * Headless Custom Hook for the Community Feed and Triple Filter.
 * Manages fetching of verified human looks (`is_human_verified = true`),
 * the Contextual Intelligent Combination filter (Subculture + Facial Zone + CIELAB Color),
 * fuzzy search autocomplete, and gradual engagement for likes & saves.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  fetchProfileUsernamesMap,
  fetchSavedLookIdsForUser,
  hydrateLookRowFromDb,
  isSupabaseConfigured,
  REAL_SUPABASE_MIRROR_LOOKS,
  subscribeLookDataChanges,
  supabase,
  toggleLookLike,
  toggleLookSaved,
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
  dismissError: () => void;
  toggleLike: (lookId: string) => Promise<{ requiresAuth: boolean }>;
  toggleSave: (lookId: string) => Promise<{ requiresAuth: boolean }>;
}

function shuffleList<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// In-memory module cache to preserve filter selections across screen navigation
let cachedSearchQuery: string = '';
let cachedSelectedSubculture: AestheticSubculture | null = null;
let cachedSelectedFacialZone: FacialRegionKey | null = null;
let cachedSelectedColorFamily: ColorFamilyId | null = null;
let cachedIsFilterOpen: boolean = false;

export function useFeed(): UseFeedFilterReturn {
  const { user, profile, isAuthenticated } = useAuth();
  const currentUserId = profile?.id || user?.id;

  const [looks, setLooks] = useState<LookRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter States persisted across navigation
  const [searchQuery, setSearchQueryState] = useState<string>(cachedSearchQuery);
  const [selectedSubculture, setSelectedSubcultureState] = useState<AestheticSubculture | null>(
    cachedSelectedSubculture
  );
  const [selectedFacialZone, setSelectedFacialZoneState] = useState<FacialRegionKey | null>(
    cachedSelectedFacialZone
  );
  const [selectedColorFamily, setSelectedColorFamilyState] = useState<ColorFamilyId | null>(
    cachedSelectedColorFamily
  );
  const [isFilterOpen, setIsFilterOpenState] = useState<boolean>(cachedIsFilterOpen);

  const setSearchQuery = useCallback((query: string) => {
    cachedSearchQuery = query;
    setSearchQueryState(query);
  }, []);

  const setSelectedSubculture = useCallback((subculture: AestheticSubculture | null) => {
    cachedSelectedSubculture = subculture;
    setSelectedSubcultureState(subculture);
  }, []);

  const setSelectedFacialZone = useCallback((zone: FacialRegionKey | null) => {
    cachedSelectedFacialZone = zone;
    setSelectedFacialZoneState(zone);
  }, []);

  const setSelectedColorFamily = useCallback((color: ColorFamilyId | null) => {
    cachedSelectedColorFamily = color;
    setSelectedColorFamilyState(color);
  }, []);

  const setIsFilterOpen = useCallback((open: boolean) => {
    cachedIsFilterOpen = open;
    setIsFilterOpenState(open);
  }, []);

  // Fetch verified looks directly from Supabase
  const fetchLooks = useCallback(async (isRefresh: boolean = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      // Fetch saved looks directly from Supabase if logged in
      const savedSet = await fetchSavedLookIdsForUser(currentUserId);

      let fetchedList: LookRow[] = [];

      if (isSupabaseConfigured) {
        // Query strictly human-verified looks directly from Supabase database
        const { data, error } = await supabase
          .from('looks')
          .select('*')
          .eq('is_human_verified', true)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const authorIds = data.map((item) => String(item.user_id || '')).filter(Boolean);
          const authorUsernames = await fetchProfileUsernamesMap(authorIds);
          fetchedList = data.map((item) =>
            hydrateLookRowFromDb(item, {
              currentUserId,
              savedLookIds: savedSet,
              authorUsernames,
              defaultAuthor: 'usuario_auras',
            })
          );
        }
      }

      // If empty or offline, use verified mirror looks
      if (fetchedList.length === 0) {
        fetchedList = REAL_SUPABASE_MIRROR_LOOKS.filter((l) => l.is_human_verified).map((item) =>
          hydrateLookRowFromDb(item, {
            currentUserId,
            savedLookIds: savedSet,
            defaultAuthor: 'aurasmatch_bot',
          })
        );
      }

      // Randomize the order of publications for a dynamic, exploratory feed
      setLooks(shuffleList(fetchedList));
    } catch {
      setErrorMessage('No se pudieron sincronizar las publicaciones con el servidor.');
      const fallbackList = REAL_SUPABASE_MIRROR_LOOKS.filter((l) => l.is_human_verified).map((item) =>
        hydrateLookRowFromDb(item, {
          currentUserId,
          savedLookIds: new Set(),
          defaultAuthor: 'aurasmatch_bot',
        })
      );
      setLooks(shuffleList(fallbackList));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void fetchLooks();
  }, [fetchLooks]);

  // Keep feed cards synced whenever Look Detail or Upload mutates Supabase
  useEffect(() => {
    return subscribeLookDataChanges((event) => {
      if (event.type === 'created' || event.type === 'appeal') {
        void fetchLooks(true);
        return;
      }

      setLooks((prev) =>
        prev.map((item) => {
          if (item.id !== event.lookId) return item;
          if (event.type === 'like') {
            return {
              ...item,
              liked_by: event.likedBy,
              is_liked_by_me: Boolean(currentUserId && event.likedBy.includes(currentUserId)),
            };
          }
          if (event.type === 'save' && event.userId === currentUserId) {
            return { ...item, is_saved_by_me: event.isSaved };
          }
          if (event.type === 'comment') {
            return { ...item, comments: event.comments };
          }
          if (event.type === 'description') {
            return { ...item, description: event.description };
          }
          return item;
        })
      );
    });
  }, [currentUserId, fetchLooks]);

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
    cachedSearchQuery = '';
    cachedSelectedSubculture = null;
    cachedSelectedFacialZone = null;
    cachedSelectedColorFamily = null;
    setSearchQueryState('');
    setSelectedSubcultureState(null);
    setSelectedFacialZoneState(null);
    setSelectedColorFamilyState(null);
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
  }, [setSelectedSubculture, setSelectedFacialZone, setSelectedColorFamily, setSearchQuery]);

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

  // Direct Database Like Action
  const toggleLike = useCallback(
    async (lookId: string): Promise<{ requiresAuth: boolean }> => {
      if (!isAuthenticated || !currentUserId) {
        triggerHapticFeedback('light');
        return { requiresAuth: true };
      }

      setErrorMessage(null);
      triggerHapticFeedback('medium');

      // Optimistic update
      setLooks((prev) =>
        prev.map((l) => {
          if (l.id !== lookId) return l;
          const nextLiked = !l.is_liked_by_me;
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

      // Direct update in Supabase
      try {
        const res = await toggleLookLike(lookId, currentUserId);
        setLooks((prev) =>
          prev.map((l) =>
            l.id === lookId
              ? { ...l, is_liked_by_me: res.isLiked, liked_by: res.likedBy }
              : l
          )
        );
        announceStatus(
          res.isLiked ? 'Me gusta guardado en la base de datos' : 'Me gusta eliminado de la base de datos'
        );
      } catch (err: any) {
        // Revert on error and surface clear feedback
        setLooks((prev) =>
          prev.map((l) => {
            if (l.id !== lookId) return l;
            const revertedLiked = !l.is_liked_by_me;
            const revertedLikedBy = revertedLiked
              ? Array.from(new Set([...l.liked_by, currentUserId]))
              : l.liked_by.filter((uid) => uid !== currentUserId);

            return {
              ...l,
              is_liked_by_me: revertedLiked,
              liked_by: revertedLikedBy,
            };
          })
        );
        const msg = err?.message || 'No se pudo guardar el Me gusta en la base de datos.';
        setErrorMessage(msg);
        void triggerHapticFeedback('error');
        announceStatus(`Error: ${msg}`);
      }

      return { requiresAuth: false };
    },
    [isAuthenticated, currentUserId]
  );

  // Direct Database Save Action
  const toggleSave = useCallback(
    async (lookId: string): Promise<{ requiresAuth: boolean }> => {
      if (!isAuthenticated || !currentUserId) {
        triggerHapticFeedback('light');
        return { requiresAuth: true };
      }

      setErrorMessage(null);
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

      // Direct update in Supabase table saved_looks
      try {
        const res = await toggleLookSaved(lookId, currentUserId);
        setLooks((prev) =>
          prev.map((l) =>
            l.id === lookId ? { ...l, is_saved_by_me: res.isSaved } : l
          )
        );
        announceStatus(
          res.isSaved
            ? 'Publicación guardada en tu perfil'
            : 'Publicación eliminada de tus guardados'
        );
      } catch (err: any) {
        // Revert on error and surface clear feedback
        setLooks((prev) =>
          prev.map((l) => {
            if (l.id !== lookId) return l;
            return {
              ...l,
              is_saved_by_me: !l.is_saved_by_me,
            };
          })
        );
        const msg = err?.message || 'No se pudo actualizar Guardados en la base de datos.';
        setErrorMessage(msg);
        void triggerHapticFeedback('error');
        announceStatus(`Error: ${msg}`);
      }

      return { requiresAuth: false };
    },
    [isAuthenticated, currentUserId]
  );

  const dismissError = useCallback(() => {
    setErrorMessage(null);
  }, []);

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
    dismissError,
    toggleLike,
    toggleSave,
  };
}

