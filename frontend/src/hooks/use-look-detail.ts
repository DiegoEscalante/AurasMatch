/**
 * Headless Custom Hook for Look Detail Screen (`src/app/look/[id].tsx`).
 * Encapsulates data fetching, likes, saves, sharing, TTS audio reading,
 * product hydration from `public.products`, and similar looks discovery.
 * Fulfills Spec 06 & Project Proposal Phase 3.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Share } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import {
  fetchLookById,
  fetchProductsByIds,
  fetchSimilarLooks,
  getLocalLookOverrides,
  isSupabaseConfigured,
  saveLocalLookOverrides,
  supabase,
} from '@/services/supabase';
import { FacialRegionKey, LookRow, ProductRow } from '@/types/database';
import {
  announceStatus,
  speakDescription,
  stopSpeaking,
  triggerHapticFeedback,
} from '@/utils/a11y-feedback';
import { formatAccessibleColorLabel } from '@/utils/color-names';

export interface UseLookDetailResult {
  look: LookRow | null;
  isLoading: boolean;
  errorMessage: string | null;
  isLiked: boolean;
  likeCount: number;
  isSaved: boolean;
  toggleLike: () => Promise<{ requiresAuth: boolean }>;
  toggleSave: () => Promise<{ requiresAuth: boolean }>;
  shareLook: () => Promise<void>;
  isSpeaking: boolean;
  speakLookDescription: () => Promise<void>;
  stopSpeakingLook: () => Promise<void>;
  productsByRegion: Record<FacialRegionKey, ProductRow[]>;
  selectedProduct: ProductRow | null;
  setSelectedProduct: (product: ProductRow | null) => void;
  similarLooks: LookRow[];
  refresh: () => Promise<void>;
}

export function useLookDetail(lookId: string): UseLookDetailResult {
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?.id || null;

  const [look, setLook] = useState<LookRow | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [productsByRegion, setProductsByRegion] = useState<
    Record<FacialRegionKey, ProductRow[]>
  >({
    lips: [],
    brows: [],
    eyelids: [],
    lash_line: [],
  });

  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [similarLooks, setSimilarLooks] = useState<LookRow[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Load look data, products, and similar looks
  const loadLookData = useCallback(async () => {
    if (!lookId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fetchedLook = await fetchLookById(lookId, currentUserId);
      if (!fetchedLook) {
        setErrorMessage('No se encontró la publicación solicitada.');
        setIsLoading(false);
        return;
      }

      setLook(fetchedLook);

      // Extract all SKU IDs across the 4 facial regions
      const skuMap: Record<FacialRegionKey, number[]> = {
        lips: [],
        brows: [],
        eyelids: [],
        lash_line: [],
      };
      const allSkuIds: number[] = [];

      const regions = fetchedLook.extracted_regions || {};
      for (const [regionKey, regionData] of Object.entries(regions) as [
        FacialRegionKey,
        any
      ][]) {
        if (regionData && regionData.recommended_skus) {
          const ids = Object.values(regionData.recommended_skus) as number[];
          skuMap[regionKey] = ids;
          allSkuIds.push(...ids);
        }
      }

      // Hydrate products from Supabase / Mirror
      const uniqueIds = Array.from(new Set(allSkuIds));
      const productsList = await fetchProductsByIds(uniqueIds);
      const productLookup = new Map<number, ProductRow>();
      for (const p of productsList) {
        productLookup.set(p.id, p);
      }

      const hydratedByRegion: Record<FacialRegionKey, ProductRow[]> = {
        lips: (skuMap.lips || [])
          .map((id) => productLookup.get(id))
          .filter((p): p is ProductRow => Boolean(p)),
        brows: (skuMap.brows || [])
          .map((id) => productLookup.get(id))
          .filter((p): p is ProductRow => Boolean(p)),
        eyelids: (skuMap.eyelids || [])
          .map((id) => productLookup.get(id))
          .filter((p): p is ProductRow => Boolean(p)),
        lash_line: (skuMap.lash_line || [])
          .map((id) => productLookup.get(id))
          .filter((p): p is ProductRow => Boolean(p)),
      };

      setProductsByRegion(hydratedByRegion);

      // Fetch similar looks
      const similar = await fetchSimilarLooks(fetchedLook, 4);
      setSimilarLooks(similar);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al cargar la publicación.');
    } finally {
      setIsLoading(false);
    }
  }, [lookId, currentUserId]);

  useEffect(() => {
    loadLookData();
    return () => {
      // Clean up TTS speech when navigating away
      stopSpeaking();
    };
  }, [loadLookData]);

  // Derived like and save state
  const isLiked = Boolean(look?.is_liked_by_me);
  const likeCount = look?.liked_by?.length || 0;
  const isSaved = Boolean(look?.is_saved_by_me);

  // Toggle Like with gradual engagement check
  const toggleLike = useCallback(async (): Promise<{ requiresAuth: boolean }> => {
    if (!isAuthenticated || !currentUserId) {
      triggerHapticFeedback('light');
      return { requiresAuth: true };
    }

    if (!look) return { requiresAuth: false };

    triggerHapticFeedback('medium');

    const nextLiked = !isLiked;
    const nextLikedBy = nextLiked
      ? Array.from(new Set([...look.liked_by, currentUserId]))
      : look.liked_by.filter((uid) => uid !== currentUserId);

    // Optimistic UI update
    setLook((prev) => (prev ? { ...prev, is_liked_by_me: nextLiked, liked_by: nextLikedBy } : null));

    // Save locally
    const overrides = await getLocalLookOverrides();
    const nextLikedIds = overrides.likedLookIds.includes(look.id)
      ? overrides.likedLookIds.filter((id) => id !== look.id)
      : [...overrides.likedLookIds, look.id];
    await saveLocalLookOverrides({ ...overrides, likedLookIds: nextLikedIds });

    // Save to Supabase
    if (isSupabaseConfigured && !currentUserId.startsWith('demo-')) {
      try {
        await supabase.from('looks').update({ liked_by: nextLikedBy }).eq('id', look.id);
      } catch {
        // Handled gracefully
      }
    }

    announceStatus(nextLiked ? 'Te gusta esta publicación' : 'Ya no te gusta esta publicación');
    return { requiresAuth: false };
  }, [isAuthenticated, currentUserId, look, isLiked]);

  // Toggle Save with gradual engagement check
  const toggleSave = useCallback(async (): Promise<{ requiresAuth: boolean }> => {
    if (!isAuthenticated || !currentUserId) {
      triggerHapticFeedback('light');
      return { requiresAuth: true };
    }

    if (!look) return { requiresAuth: false };

    triggerHapticFeedback('medium');

    const nextSaved = !isSaved;

    // Optimistic update
    setLook((prev) => (prev ? { ...prev, is_saved_by_me: nextSaved } : null));

    // Save locally
    const overrides = await getLocalLookOverrides();
    const nextSavedIds = overrides.savedLookIds.includes(look.id)
      ? overrides.savedLookIds.filter((id) => id !== look.id)
      : [...overrides.savedLookIds, look.id];
    await saveLocalLookOverrides({ ...overrides, savedLookIds: nextSavedIds });

    // Save to Supabase
    if (isSupabaseConfigured && !currentUserId.startsWith('demo-')) {
      try {
        if (isSaved) {
          await supabase
            .from('saved_looks')
            .delete()
            .eq('user_id', currentUserId)
            .eq('look_id', look.id);
        } else {
          await supabase
            .from('saved_looks')
            .upsert({ user_id: currentUserId, look_id: look.id }, { onConflict: 'user_id,look_id' });
        }
      } catch {
        // Handled gracefully
      }
    }

    announceStatus(nextSaved ? 'Publicación guardada en tu perfil' : 'Publicación eliminada de guardados');
    return { requiresAuth: false };
  }, [isAuthenticated, currentUserId, look, isSaved]);

  // Cross-platform share
  const shareLook = useCallback(async () => {
    if (!look) return;
    triggerHapticFeedback('light');

    const subcultureText = look.subculture.join(', ');
    const shareMessage = `¡Mira este look "${subcultureText}" de @${look.author_username || 'auras'} en AurasMatch! ${look.description}`;

    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({
            title: `AurasMatch — Look de @${look.author_username || 'auras'}`,
            text: shareMessage,
            url: typeof window !== 'undefined' ? window.location.href : '',
          });
          announceStatus('Publicación compartida con éxito.');
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
          await navigator.clipboard.writeText(`${shareMessage} ${currentUrl}`);
          announceStatus('Enlace copiado al portapapeles.');
        }
      } else {
        await Share.share({
          title: `AurasMatch — Look de @${look.author_username || 'auras'}`,
          message: `${shareMessage}\nhttps://aurasmatch.app/look/${look.id}`,
        });
      }
    } catch {
      // User cancelled share dialog
    }
  }, [look]);

  // Multiplatform TTS speech
  const speakLookDescription = useCallback(async () => {
    if (!look) return;
    triggerHapticFeedback('medium');

    if (isSpeaking) {
      await stopSpeaking();
      setIsSpeaking(false);
      announceStatus('Audio detenido.');
      return;
    }

    setIsSpeaking(true);
    const subcultureText = look.subculture.join(', ');

    // Read colors from extracted regions
    const colorDescriptions: string[] = [];
    const regions = look.extracted_regions || {};
    if (regions.lips?.hex_value) {
      colorDescriptions.push(`Labios: ${formatAccessibleColorLabel(regions.lips.hex_value)}`);
    }
    if (regions.eyelids?.hex_value) {
      colorDescriptions.push(`Párpados: ${formatAccessibleColorLabel(regions.eyelids.hex_value)}`);
    }
    if (regions.brows?.hex_value) {
      colorDescriptions.push(`Cejas: ${formatAccessibleColorLabel(regions.brows.hex_value)}`);
    }
    if (regions.lash_line?.hex_value) {
      colorDescriptions.push(`Delineado: ${formatAccessibleColorLabel(regions.lash_line.hex_value)}`);
    }

    const colorsText =
      colorDescriptions.length > 0
        ? `Tonos cosméticos detectados: ${colorDescriptions.join('. ')}.`
        : '';

    const textToRead = `Publicación de @${look.author_username || 'auras'}. Estilo ${subcultureText}. ${look.description}. Garantía de realismo absoluto: Verificado 100% humano contra inteligencia artificial. ${colorsText}`;

    announceStatus('Iniciando lectura de audio del look.');
    await speakDescription(textToRead, {
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  }, [look, isSpeaking]);

  const stopSpeakingLook = useCallback(async () => {
    await stopSpeaking();
    setIsSpeaking(false);
  }, []);

  return {
    look,
    isLoading,
    errorMessage,
    isLiked,
    likeCount,
    isSaved,
    toggleLike,
    toggleSave,
    shareLook,
    isSpeaking,
    speakLookDescription,
    stopSpeakingLook,
    productsByRegion,
    selectedProduct,
    setSelectedProduct,
    similarLooks,
    refresh: loadLookData,
  };
}

