import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  fetchProfileUsernamesMap,
  fetchSavedLookIdsForUser,
  hydrateLookRowFromDb,
  isSupabaseConfigured,
  isValidUuid,
  requestLookAppeal,
  subscribeLookDataChanges,
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

/**
 * Headless Custom Hook for the User Profile screen (`profile.tsx`).
 * Fetches the user's Uploaded Looks (including any flagged by the Anti-AI filter so they can appeal),
 * Liked Looks (`looks.liked_by`), and Saved Looks (`public.saved_looks`).
 */
export function useUserProfile(): UseUserProfileReturn {
  const { user, profile, isAuthenticated } = useAuth();
  const currentUserId = profile?.id || user?.id;

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
      const savedSet = await fetchSavedLookIdsForUser(currentUserId);

      if (isSupabaseConfigured && isValidUuid(currentUserId)) {
        const savedIds = Array.from(savedSet);
        const [ownRes, likedRes, savedRes] = await Promise.all([
          supabase
            .from('looks')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false }),
          supabase
            .from('looks')
            .select('*')
            .contains('liked_by', [currentUserId])
            .order('created_at', { ascending: false }),
          savedIds.length > 0
            ? supabase
                .from('looks')
                .select('*')
                .in('id', savedIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as Record<string, any>[], error: null }),
        ]);

        const queryError = ownRes.error || likedRes.error || savedRes.error;
        if (queryError) {
          throw queryError;
        }

        const mergedMap = new Map<string, Record<string, any>>();
        for (const row of [
          ...(Array.isArray(ownRes.data) ? ownRes.data : []),
          ...(Array.isArray(likedRes.data) ? likedRes.data : []),
          ...(Array.isArray(savedRes.data) ? savedRes.data : []),
        ]) {
          if (row?.id && !mergedMap.has(String(row.id))) {
            mergedMap.set(String(row.id), row);
          }
        }

        const mergedRows = Array.from(mergedMap.values()).sort((a, b) => {
          const ta = Date.parse(String(a.created_at || '')) || 0;
          const tb = Date.parse(String(b.created_at || '')) || 0;
          return tb - ta;
        });

        const authorUsernames = await fetchProfileUsernamesMap(
          mergedRows.map((row) => String(row.user_id || ''))
        );
        const hydrated = mergedRows.map((row) =>
          hydrateLookRowFromDb(row, {
            currentUserId,
            savedLookIds: savedSet,
            authorUsernames,
          })
        );
        setAllLooks(hydrated);
        return;
      }

      setAllLooks([]);
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'No se pudieron sincronizar tus colecciones en la nube.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    void refreshProfileData();
  }, [refreshProfileData]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;
    return subscribeLookDataChanges(() => {
      void refreshProfileData();
    });
  }, [isAuthenticated, currentUserId, refreshProfileData]);

  const requestHumanAppeal = useCallback(
    async (lookId: string) => {
      const previousAppealStatus: AppealStatus =
        allLooks.find((item) => item.id === lookId)?.appeal_status ?? 'none';
      setErrorMessage(null);

      setAllLooks((prev) =>
        prev.map((item) =>
          item.id === lookId ? { ...item, appeal_status: 'pending' } : item
        )
      );

      try {
        await requestLookAppeal(lookId);

        await triggerHapticFeedback('success');
        announceStatus('Apelación enviada para revisión manual humana');
      } catch (err: any) {
        setAllLooks((prev) =>
          prev.map((item) =>
            item.id === lookId
              ? { ...item, appeal_status: previousAppealStatus }
              : item
          )
        );
        await triggerHapticFeedback('error');
        const msg =
          err?.message || 'No se pudo registrar la apelación en este momento.';
        setErrorMessage(msg);
        announceStatus(msg);
      }
    },
    [allLooks]
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

