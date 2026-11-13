/**
 * Headless Custom Hook for Look Detail Screen (`src/app/look/[id].tsx`).
 * Encapsulates data fetching, likes, saves, sharing, TTS audio reading,
 * product hydration from `public.products`, and similar looks discovery.
 * Fulfills Spec 06 & Project Proposal Phase 3.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Share } from 'react-native';

import { runToggleLookLike, runToggleLookSave } from '@/hooks/look-action-helpers';
import { useAuth } from '@/hooks/use-auth';
import {
  addCommentToLook,
  applyLookMutationToRow,
  fetchLookById,
  fetchProductsByIds,
  fetchSimilarLooks,
  subscribeLookDataChanges,
} from '@/services/supabase';
import { FacialRegionKey, LookCommentItem, LookRow, ProductRow } from '@/types/database';
import {
  announceStatus,
  speakDescription,
  stopSpeaking,
  triggerHapticFeedback,
} from '@/utils/a11y-feedback';
import { formatAccessibleColorLabel } from '@/utils/color-names';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface UseLookDetailResult {
  look: LookRow | null;
  isLoading: boolean;
  errorMessage: string | null;
  actionErrorMessage: string | null;
  dismissActionError: () => void;
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
  comments: LookCommentItem[];
  addComment: (
    content: string
  ) => Promise<{ success: boolean; requiresAuth?: boolean; message?: string }>;
  isAddingComment: boolean;
  refresh: () => Promise<void>;
}

export function useLookDetail(lookId: string): UseLookDetailResult {
  const { user, profile, isAuthenticated } = useAuth();
  const currentUserId = profile?.id || user?.id || null;

  const [look, setLook] = useState<LookRow | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

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
    setActionErrorMessage(null);

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
      const similar = await fetchSimilarLooks(fetchedLook, 4, currentUserId);
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

  useEffect(() => {
    return subscribeLookDataChanges((event) => {
      if (event.type === 'created') return;
      if (event.lookId === lookId) {
        setLook((prev) => (prev ? applyLookMutationToRow(prev, event, currentUserId) : prev));
      }
      if (event.type === 'like' || event.type === 'save') {
        setSimilarLooks((prev) =>
          prev.map((item) => applyLookMutationToRow(item, event, currentUserId))
        );
      }
    });
  }, [lookId, currentUserId]);

  const dismissActionError = useCallback(() => {
    setActionErrorMessage(null);
  }, []);

  // Derived like and save state
  const isLiked = Boolean(look?.is_liked_by_me);
  const likeCount = look?.liked_by?.length || 0;
  const isSaved = Boolean(look?.is_saved_by_me);

  const patchCurrentLook = useCallback((transform: (row: LookRow) => LookRow) => {
    setLook((prev) => (prev ? transform(prev) : null));
  }, []);

  // Toggle Like directly in Supabase
  const toggleLike = useCallback(
    () =>
      runToggleLookLike({
        lookId: look?.id,
        isAuthenticated,
        currentUserId,
        patchLook: patchCurrentLook,
        setErrorMessage: setActionErrorMessage,
        trueAnnouncement: 'Te gusta esta publicación',
        falseAnnouncement: 'Ya no te gusta esta publicación',
        fallbackErrorMessage: 'No se pudo actualizar tu me gusta en la base de datos.',
      }),
    [isAuthenticated, currentUserId, look?.id, patchCurrentLook]
  );

  // Toggle Save directly in Supabase (saved_looks table)
  const toggleSave = useCallback(
    () =>
      runToggleLookSave({
        lookId: look?.id,
        isAuthenticated,
        currentUserId,
        patchLook: patchCurrentLook,
        setErrorMessage: setActionErrorMessage,
        trueAnnouncement: 'Publicación guardada en tu perfil',
        falseAnnouncement: 'Publicación eliminada de guardados',
        fallbackErrorMessage: 'No se pudo actualizar el guardado en la base de datos.',
      }),
    [isAuthenticated, currentUserId, look?.id, patchCurrentLook]
  );

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

  const [isAddingComment, setIsAddingComment] = useState<boolean>(false);

  const comments = useMemo(() => {
    return look?.comments || [];
  }, [look?.comments]);

  // Adds an accessible community comment with zero timing limit (WCAG 2.2.1)
  const addComment = useCallback(
    async (
      content: string
    ): Promise<{ success: boolean; requiresAuth?: boolean; message?: string }> => {
      const trimmed = content.trim();
      if (!trimmed) {
        return { success: false, message: 'El comentario no puede estar vacío.' };
      }

      if (!isAuthenticated || !currentUserId) {
        triggerHapticFeedback('light');
        return {
          requiresAuth: true,
          success: false,
          message: 'Debes iniciar sesión para comentar.',
        };
      }

      if (!look) {
        return { success: false, message: 'Publicación no disponible.' };
      }

      setIsAddingComment(true);
      setActionErrorMessage(null);
      triggerHapticFeedback('medium');

      const authorName =
        profile?.username || user?.email?.split('@')[0] || 'auras_user';

      const newComment: LookCommentItem = {
        id: generateUUID(),
        user_id: currentUserId,
        username: authorName,
        content: trimmed,
        created_at: new Date().toISOString(),
      };

      // Optimistic update
      setLook((prev) =>
        prev
          ? {
              ...prev,
              comments: [...(prev.comments || []), newComment],
            }
          : null
      );

      try {
        const result = await addCommentToLook(look.id, newComment);
        if (result && Array.isArray(result.comments)) {
          setLook((prev) => (prev ? { ...prev, comments: result.comments } : null));
        }
        announceStatus(`Comentario publicado por @${authorName}.`);
        return { success: true };
      } catch (err: any) {
        setLook((prev) =>
          prev
            ? {
                ...prev,
                comments: (prev.comments || []).filter((c) => c.id !== newComment.id),
              }
            : null
        );
        const msg =
          err?.message || 'Error al guardar el comentario en la base de datos.';
        setActionErrorMessage(msg);
        triggerHapticFeedback('error');
        announceStatus(msg);
        return {
          success: false,
          message: msg,
        };
      } finally {
        setIsAddingComment(false);
      }
    },
    [isAuthenticated, currentUserId, look, profile, user]
  );

  return {
    look,
    isLoading,
    errorMessage,
    actionErrorMessage,
    dismissActionError,
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
    comments,
    addComment,
    isAddingComment,
    refresh: loadLookData,
  };
}

