/**
 * Accessible Community Comments Collapsible Component.
 * Implements:
 * - WCAG 2.4.1 (Bypass Blocks): Folded by default via `AccessibleCollapsible` so screen reader
 *   and keyboard users can skip repetitive comment threads with a single Tab or swipe.
 * - WCAG 2.2.1 (Timing Adjustable): Form with zero expiration timeout and clear character count.
 * - WCAG 1.4.3 & 1.4.6 (Contrast): WCAG AA/AAA compliant text and borders.
 * - Gradual Engagement: Contextual auth trigger for unauthenticated users.
 * Fulfills Spec 08 & 2ndPhaseProposal.pdf Section V.D.2.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { AccessibleCollapsible } from '@/components/ui/collapsible';
import { VisualAlertBanner } from '@/components/ui/visual-alert-banner';
import { MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { LookCommentItem } from '@/types/database';
import { triggerHapticFeedback } from '@/utils/a11y-feedback';

export interface CommentsSectionCollapsibleProps {
  comments: LookCommentItem[];
  onAddComment: (
    content: string
  ) => Promise<{ success: boolean; requiresAuth?: boolean; message?: string }>;
  isAddingComment?: boolean;
  onRequireAuth?: () => void;
  defaultExpanded?: boolean;
}

const MAX_COMMENT_CHARS = 300;

function formatCommentDate(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return 'Reciente';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  } catch {
    return 'Reciente';
  }
}

export function CommentsSectionCollapsible({
  comments,
  onAddComment,
  isAddingComment = false,
  onRequireAuth,
  defaultExpanded = false,
}: CommentsSectionCollapsibleProps) {
  const theme = useTheme();
  const { prefs } = useAccessibility();
  const high_contrast = prefs.high_contrast;

  const [commentInput, setCommentInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const commentCount = comments.length;
  const subtitle =
    commentCount === 0
      ? 'Sin comentarios aún — Sé el primero en opinar'
      : `${commentCount} ${commentCount === 1 ? 'comentario' : 'comentarios'}`;

  const remainingChars = MAX_COMMENT_CHARS - commentInput.length;
  const isOverLimit = remainingChars < 0;

  const handleSubmit = async () => {
    triggerHapticFeedback('light');
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = commentInput.trim();
    if (!trimmed) {
      setErrorMessage('Por favor escribe un mensaje antes de publicar.');
      return;
    }

    if (isOverLimit) {
      setErrorMessage(`El comentario excede el límite de ${MAX_COMMENT_CHARS} caracteres.`);
      return;
    }

    const res = await onAddComment(trimmed);

    if (res.requiresAuth) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        setErrorMessage('Debes iniciar sesión para publicar un comentario.');
      }
      return;
    }

    if (res.success) {
      setCommentInput('');
      setSuccessMessage('¡Comentario publicado con éxito!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.message || 'Error al publicar el comentario.');
    }
  };

  return (
    <AccessibleCollapsible
      title="Comentarios de la Comunidad"
      subtitle={subtitle}
      defaultExpanded={defaultExpanded}
    >
      <View style={styles.container}>
        {/* Messages */}
        {errorMessage && (
          <View style={styles.bannerSpacing}>
            <VisualAlertBanner
              variant="error"
              title={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          </View>
        )}

        {successMessage && (
          <View style={styles.bannerSpacing}>
            <VisualAlertBanner
              variant="success"
              title={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          </View>
        )}

        {/* New Comment Input Form (WCAG 2.2.1: No Timeout) */}
        <View
          style={[
            styles.inputCard,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: high_contrast ? theme.text : theme.border,
            },
          ]}
        >
          <ThemedText style={[styles.inputLabel, { color: theme.text }]}>
            Deja tu comentario sobre este look:
          </ThemedText>

          <TextInput
            value={commentInput}
            onChangeText={(txt) => {
              setCommentInput(txt);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Comparte tu opinión, técnica o pregunta sobre este estilo..."
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            maxLength={MAX_COMMENT_CHARS + 20}
            style={[
              styles.textInput,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: isOverLimit
                  ? '#EF4444'
                  : high_contrast
                  ? theme.text
                  : theme.border,
              },
            ]}
            accessible={true}
            accessibilityLabel="Escribe un comentario sobre este look"
            accessibilityHint="Escribe un mensaje de hasta 300 caracteres sin límite de tiempo"
          />

          <View style={styles.inputFooter}>
            <ThemedText
              style={[
                styles.charCount,
                {
                  color: isOverLimit
                    ? '#EF4444'
                    : remainingChars < 30
                    ? '#F59E0B'
                    : theme.textSecondary,
                },
              ]}
              accessible={true}
              accessibilityLabel={`${remainingChars} caracteres restantes de ${MAX_COMMENT_CHARS}`}
            >
              {remainingChars} car.
            </ThemedText>

            <AccessiblePressable
              onPress={handleSubmit}
              disabled={isAddingComment || commentInput.trim().length === 0 || isOverLimit}
              accessibilityRole="button"
              accessibilityLabel="Publicar comentario"
              accessibilityHint="Envía tu comentario a la comunidad para este look"
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    commentInput.trim().length === 0 || isOverLimit
                      ? theme.backgroundSelected
                      : theme.primary,
                  borderColor: high_contrast ? theme.text : 'transparent',
                },
              ]}
            >
              {isAddingComment ? (
                <ActivityIndicator
                  size="small"
                  color={
                    commentInput.trim().length === 0
                      ? theme.textSecondary
                      : theme.onPrimary
                  }
                />
              ) : (
                <ThemedText
                  style={[
                    styles.submitButtonText,
                    {
                      color:
                        commentInput.trim().length === 0 || isOverLimit
                          ? theme.textSecondary
                          : theme.onPrimary,
                    },
                  ]}
                >
                  Publicar
                </ThemedText>
              )}
            </AccessiblePressable>
          </View>
        </View>

        {/* Existing Comments List */}
        <View style={styles.commentsList}>
          {comments.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: theme.backgroundSelected,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText style={styles.emptyIcon}>💬</ThemedText>
              <ThemedText
                style={[styles.emptyText, { color: theme.textSecondary }]}
              >
                Aún no hay comentarios en este look. ¡Sé la primera persona en compartir su opinión!
              </ThemedText>
            </View>
          ) : (
            comments.map((comment) => (
              <View
                key={comment.id}
                style={[
                  styles.commentCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: high_contrast ? theme.text : theme.border,
                  },
                ]}
                accessible={true}
                accessibilityRole="text"
                accessibilityLabel={`Comentario de @${comment.username}, ${formatCommentDate(
                  comment.created_at
                )}: ${comment.content}`}
              >
                {/* Comment Header: Avatar & Username */}
                <View style={styles.commentHeader}>
                  <View
                    style={[
                      styles.avatarBadge,
                      {
                        backgroundColor: theme.primary,
                        borderColor: high_contrast ? theme.text : 'transparent',
                      },
                    ]}
                    accessible={false}
                  >
                    <ThemedText
                      style={[styles.avatarInitial, { color: theme.onPrimary }]}
                    >
                      {(comment.username || 'A')[0].toUpperCase()}
                    </ThemedText>
                  </View>

                  <View style={styles.authorMeta}>
                    <ThemedText
                      style={[styles.commentAuthor, { color: theme.text }]}
                    >
                      @{comment.username || 'auras_user'}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.commentTime,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {formatCommentDate(comment.created_at)}
                    </ThemedText>
                  </View>
                </View>

                {/* Comment Content */}
                <ThemedText
                  style={[styles.commentBody, { color: theme.text }]}
                >
                  {comment.content}
                </ThemedText>
              </View>
            ))
          )}
        </View>
      </View>
    </AccessibleCollapsible>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    paddingTop: Spacing.half,
  },
  bannerSpacing: {
    marginBottom: Spacing.one,
  },
  inputCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: Spacing.two,
    minHeight: 70,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.half,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    minHeight: MinTouchTargetSize,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  commentsList: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  emptyBox: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyIcon: {
    fontSize: 24,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  commentCard: {
    borderRadius: 10,
    borderWidth: 1.5,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  avatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
  },
  authorMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 11,
  },
  commentBody: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
});
