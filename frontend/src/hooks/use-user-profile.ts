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
import { AppealStatus, LookRow } from '@/types/database';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';

export type ProfileCollectionTab = 'uploads' | 'likes' | 'saved';

export interface UseUserProfileReturn {
  activeTab: ProfileCollectionTab;
  setActiveTab: (tab: ProfileCollectionTab) => void;
  myUploadedLooks: LookRow[];
  myLikedLooks: LookRow[];
  mySavedLooks: LookRow[];
  activeCollectionLooks: LookRow[];
  isLoading: boolean;
  errorMessage: string | null;
  refreshProfileData: () => Promise<void>;
  requestHumanAppeal: (lookId: string) => Promise<void>;
}

function hydrateLookRow(
  raw: Record<string, any>,
  currentUserId: string | undefined,
  savedSet: Set<string>,
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

  const appealStatus: AppealStatus =
    localOverrides.appealsByLookId[id] ||
    (raw.appeal_status as AppealStatus) ||
    'none';

  const description =
    localOverrides.descriptionsByLookId[id] ||
    (typeof raw.description === 'string' && raw.description.trim()
      ? raw.description
      : `Maquillaje estilo ${
          Array.isArray(raw.subculture) && raw.subculture.length > 0
            ? raw.subculture.join(', ')
            : 'alternativo'
        }`);

  return {
    id,
    user_id: String(raw.user_id),
    image_path: String(raw.image_path || ''),
    is_human_verified: Boolean(raw.is_human_verified),
    ai_confidence_score: Number(raw.ai_confidence_score ?? 0),
    subculture: Array.isArray(raw.subculture) ? raw.subculture : [],
    subculture_confidence_score:
      raw.subculture_confidence_score !== null && raw.subculture_confidence_score !== undefined
        ? Number(raw.subculture_confidence_score)
        : null,
    extracted_regions: (raw.extracted_regions as LookRow['extracted_regions']) || {},
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    created_at: String(raw.created_at || new Date().toISOString()),
    description,
    liked_by: mergedLikedBy,
    appeal_status: appealStatus,
    comments:
      localOverrides.commentsByLookId[id] ||
      (Array.isArray(raw.comments) ? raw.comments : []),
    resolved_image_url: resolveLookImageUrl(raw.image_path, id),
    is_saved_by_me: savedSet.has(id) || localOverrides.savedLookIds.includes(id),
    is_liked_by_me: Boolean(currentUserId && mergedLikedBy.includes(currentUserId)),
  };
}

/**
 * Headless Custom Hook for the User Profile screen (`profile.tsx`).
 * Fetches the user's Uploaded Looks (including any flagged by the Anti-AI filter so they can appeal),
 * Liked Looks (`looks.liked_by`), and Saved Looks (`public.saved_looks`).
 */
export function useUserProfile(): UseUserProfileReturn {
  const { profile, isAuthenticated } = useAuth();
  const currentUserId = profile?.id;

  const [activeTab, setActiveTab] = useState<ProfileCollectionTab>('uploads');
  const [allLooks, setAllLooks] = useState<LookRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshProfileData = useCallback(async () => {
    if (!isAuthenticated || !currentUserId) {
      setAllLooks([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const localOverrides = await getLocalLookOverrides();
      const savedSet = new Set<string>(localOverrides.savedLookIds);

      if (isSupabaseConfigured) {
        const [{ data: looksData, error: looksError }, { data: savedData }] =
          await Promise.all([
            supabase
              .from('looks')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(60),
            supabase
              .from('saved_looks')
              .select('look_id')
              .eq('user_id', currentUserId),
          ]);

        if (Array.isArray(savedData)) {
          for (const row of savedData) {
            if (row.look_id) savedSet.add(String(row.look_id));
          }
        }

        if (!looksError && Array.isArray(looksData) && looksData.length > 0) {
          const hydrated = looksData.map((row) =>
            hydrateLookRow(row, currentUserId, savedSet, localOverrides)
          );
          setAllLooks(hydrated);
          return;
        }
      }

      // Automatic fallback to real mirror rows if ANON_KEY is not pasted yet
      const fallbackHydrated = REAL_SUPABASE_MIRROR_LOOKS.map((row) =>
        hydrateLookRow(row, currentUserId, savedSet, localOverrides)
      );
      setAllLooks(fallbackHydrated);
    } catch {
      setErrorMessage(
        'No se pudieron sincronizar tus colecciones en la nube. Mostrando copia local.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    void refreshProfileData();
  }, [refreshProfileData]);

  const requestHumanAppeal = useCallback(
    async (lookId: string) => {
      try {
        const overrides = await getLocalLookOverrides();
        overrides.appealsByLookId[lookId] = 'pending';
        await saveLocalLookOverrides(overrides);

        setAllLooks((prev) =>
          prev.map((item) =>
            item.id === lookId ? { ...item, appeal_status: 'pending' } : item
          )
        );

        if (isSupabaseConfigured) {
          await supabase
            .from('looks')
            .update({ appeal_status: 'pending' })
            .eq('id', lookId);
        }

        await triggerHapticFeedback('success');
        announceStatus('Apelación enviada para revisión manual humana');
      } catch {
        setErrorMessage('No se pudo registrar la apelación en este momento.');
      }
    },
    []
  );

  const myUploadedLooks = useMemo(
    () => allLooks.filter((item) => item.user_id === currentUserId),
    [allLooks, currentUserId]
  );

  const myLikedLooks = useMemo(
    () => allLooks.filter((item) => Boolean(item.is_liked_by_me)),
    [allLooks]
  );

  const mySavedLooks = useMemo(
    () => allLooks.filter((item) => Boolean(item.is_saved_by_me)),
    [allLooks]
  );

  const activeCollectionLooks = useMemo(() => {
    if (activeTab === 'likes') return myLikedLooks;
    if (activeTab === 'saved') return mySavedLooks;
    return myUploadedLooks;
  }, [activeTab, myUploadedLooks, myLikedLooks, mySavedLooks]);

  return {
    activeTab,
    setActiveTab,
    myUploadedLooks,
    myLikedLooks,
    mySavedLooks,
    activeCollectionLooks,
    isLoading,
    errorMessage,
    refreshProfileData,
    requestHumanAppeal,
  };
}

