import React, { useEffect } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';

export type VisualAlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface VisualAlertBannerProps {
  /**
   * Visual and semantic severity level.
   */
  variant?: VisualAlertVariant;
  /**
   * Short, clear heading for the alert.
   */
  title: string;
  /**
   * Detailed human-readable explanation (avoid raw technical stack traces).
   */
  message?: string;
  /**
   * Optional primary action button label (e.g., "Reintentar", "Apelar revisión").
   */
  actionLabel?: string;
  /**
   * Callback when the primary action button is pressed.
   */
  onActionPress?: () => void;
  /**
   * Optional callback to dismiss/close the alert banner.
   */
  onDismiss?: () => void;
  /**
   * Whether to trigger haptic feedback + screen reader announcement on mount (defaults to true).
   */
  autoAnnounce?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_PREFIX_ICON: Record<VisualAlertVariant, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '⛔',
};

/**
 * High-contrast visual + haptic + screen-reader alert banner.
 * Fulfills 2ndPhaseProposal.pdf Section V.C (Auditory Diversity: 100% visual/haptic parity for alerts)
 * and Course Rubric Section 3 (clear haptic/auditory/visual feedback on errors or state changes).
 */
export function VisualAlertBanner({
  variant = 'info',
  title,
  message,
  actionLabel,
  onActionPress,
  onDismiss,
  autoAnnounce = true,
  style,
}: VisualAlertBannerProps) {
  const theme = useTheme();

  const accentColor =
    variant === 'success'
      ? theme.success
      : variant === 'warning'
        ? theme.warning
        : variant === 'error'
          ? theme.danger
          : theme.primary;

  useEffect(() => {
    if (!autoAnnounce) return;

    const hapticType =
      variant === 'error'
        ? 'error'
        : variant === 'warning'
          ? 'warning'
          : variant === 'success'
            ? 'success'
            : 'light';

    void triggerHapticFeedback(hapticType);
    announceStatus(`${title}${message ? `. ${message}` : ''}`);
  }, [autoAnnounce, variant, title, message]);

  const webLiveProps =
    Platform.OS === 'web'
      ? {
          'aria-live': (variant === 'error' ? 'assertive' : 'polite') as 'assertive' | 'polite',
          role: 'alert' as const,
        }
      : {};

  return (
    <View
      {...webLiveProps}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion={variant === 'error' ? 'assertive' : 'polite'}
      accessibilityLabel={`${title}${message ? `. ${message}` : ''}`}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: accentColor,
        },
        style,
      ]}>
      <View style={styles.headerRow}>
        <ThemedText
          importantForAccessibility="no"
          aria-hidden={true}
          type="default"
          style={styles.icon}>
          {VARIANT_PREFIX_ICON[variant]}
        </ThemedText>

        <View style={styles.textColumn}>
          <ThemedText type="smallBold" style={{ color: accentColor }}>
            {title}
          </ThemedText>
          {message ? (
            <ThemedText type="small" style={styles.messageText}>
              {message}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {actionLabel || onDismiss ? (
        <View style={styles.actionsRow}>
          {actionLabel && onActionPress ? (
            <AccessiblePressable
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              hapticOnPress="medium"
              onPress={onActionPress}
              style={[styles.actionButton, { backgroundColor: accentColor }]}>
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                {actionLabel}
              </ThemedText>
            </AccessiblePressable>
          ) : null}

          {onDismiss ? (
            <AccessiblePressable
              accessibilityRole="button"
              accessibilityLabel={`Cerrar alerta: ${title}`}
              onPress={onDismiss}
              style={[styles.dismissButton, { borderColor: theme.border }]}>
              <ThemedText type="small">Cerrar</ThemedText>
            </AccessiblePressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  icon: {
    marginTop: 1,
  },
  textColumn: {
    flex: 1,
    gap: Spacing.one,
  },
  messageText: {
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  dismissButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
  },
});
