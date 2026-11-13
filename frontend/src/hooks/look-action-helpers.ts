/**
 * Shared optimistic like/save helpers for `useFeed` and `useLookDetail`.
 * Keeps haptic feedback, Screen Reader announcements, optimistic UI patching,
 * Supabase persistence, and rollback behavior identical without duplicated logic.
 */

import { toggleLookLike, toggleLookSaved } from '@/services/supabase';
import { LookRow } from '@/types/database';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';

function computeToggledLikeRow(row: LookRow, userId: string): LookRow {
  const nextLiked = !row.is_liked_by_me;
  const nextLikedBy = nextLiked
    ? Array.from(new Set([...row.liked_by, userId]))
    : row.liked_by.filter((uid) => uid !== userId);

  return {
    ...row,
    is_liked_by_me: nextLiked,
    liked_by: nextLikedBy,
  };
}

function computeToggledSaveRow(row: LookRow): LookRow {
  return {
    ...row,
    is_saved_by_me: !row.is_saved_by_me,
  };
}

async function executeOptimisticLookToggle<TResult>({
  lookId,
  isAuthenticated,
  currentUserId,
  patchLook,
  optimisticUpdate,
  serverAction,
  commitUpdate,
  revertUpdate,
  getSuccessAnnouncement,
  fallbackErrorMessage,
  setErrorMessage,
}: {
  lookId?: string | null;
  isAuthenticated: boolean;
  currentUserId?: string | null;
  patchLook: (transform: (row: LookRow) => LookRow) => void;
  optimisticUpdate: (row: LookRow, userId: string) => LookRow;
  serverAction: (id: string, userId: string) => Promise<TResult>;
  commitUpdate: (row: LookRow, result: TResult) => LookRow;
  revertUpdate: (row: LookRow, userId: string) => LookRow;
  getSuccessAnnouncement: (result: TResult) => string;
  fallbackErrorMessage: string;
  setErrorMessage: (message: string | null) => void;
}): Promise<{ requiresAuth: boolean }> {
  if (!isAuthenticated || !currentUserId) {
    triggerHapticFeedback('light');
    return { requiresAuth: true };
  }

  if (!lookId) {
    return { requiresAuth: false };
  }

  setErrorMessage(null);
  triggerHapticFeedback('medium');
  patchLook((row) => optimisticUpdate(row, currentUserId));

  try {
    const result = await serverAction(lookId, currentUserId);
    patchLook((row) => commitUpdate(row, result));
    announceStatus(getSuccessAnnouncement(result));
  } catch (err: any) {
    patchLook((row) => revertUpdate(row, currentUserId));
    const msg = err?.message || fallbackErrorMessage;
    setErrorMessage(msg);
    void triggerHapticFeedback('error');
    announceStatus(`Error: ${msg}`);
  }

  return { requiresAuth: false };
}

export interface RunToggleLookActionParams {
  lookId?: string | null;
  isAuthenticated: boolean;
  currentUserId?: string | null;
  patchLook: (transform: (row: LookRow) => LookRow) => void;
  setErrorMessage: (message: string | null) => void;
  trueAnnouncement?: string;
  falseAnnouncement?: string;
  fallbackErrorMessage?: string;
}

/**
 * Performs an optimistic like/unlike toggle backed by `toggleLookLike`.
 */
export function runToggleLookLike({
  lookId,
  isAuthenticated,
  currentUserId,
  patchLook,
  setErrorMessage,
  trueAnnouncement = 'Me gusta guardado en la base de datos',
  falseAnnouncement = 'Me gusta eliminado de la base de datos',
  fallbackErrorMessage = 'No se pudo guardar el Me gusta en la base de datos.',
}: RunToggleLookActionParams): Promise<{ requiresAuth: boolean }> {
  return executeOptimisticLookToggle({
    lookId,
    isAuthenticated,
    currentUserId,
    patchLook,
    optimisticUpdate: computeToggledLikeRow,
    serverAction: toggleLookLike,
    commitUpdate: (row, result) => ({
      ...row,
      is_liked_by_me: result.isLiked,
      liked_by: result.likedBy,
    }),
    revertUpdate: computeToggledLikeRow,
    getSuccessAnnouncement: (result) => (result.isLiked ? trueAnnouncement : falseAnnouncement),
    fallbackErrorMessage,
    setErrorMessage,
  });
}

/**
 * Performs an optimistic save/unsave toggle backed by `toggleLookSaved`.
 */
export function runToggleLookSave({
  lookId,
  isAuthenticated,
  currentUserId,
  patchLook,
  setErrorMessage,
  trueAnnouncement = 'Publicación guardada en tu perfil',
  falseAnnouncement = 'Publicación eliminada de tus guardados',
  fallbackErrorMessage = 'No se pudo actualizar Guardados en la base de datos.',
}: RunToggleLookActionParams): Promise<{ requiresAuth: boolean }> {
  return executeOptimisticLookToggle({
    lookId,
    isAuthenticated,
    currentUserId,
    patchLook,
    optimisticUpdate: (row) => computeToggledSaveRow(row),
    serverAction: toggleLookSaved,
    commitUpdate: (row, result) => ({
      ...row,
      is_saved_by_me: result.isSaved,
    }),
    revertUpdate: (row) => computeToggledSaveRow(row),
    getSuccessAnnouncement: (result) => (result.isSaved ? trueAnnouncement : falseAnnouncement),
    fallbackErrorMessage,
    setErrorMessage,
  });
}

