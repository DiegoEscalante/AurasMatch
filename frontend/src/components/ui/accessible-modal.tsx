import React, { useCallback, useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';

export interface AccessibleModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  icon?: string;
  dialogLabel?: string;
  closeButtonLabel?: string;
  closeButtonHint?: string;
  closeAnnouncement?: string;
  backdropLabel?: string;
  maxWidth?: number;
  size?: 'auto' | 'tall';
  cardBackgroundColor?: string;
  topBanner?: React.ReactNode;
  footer?: React.ReactNode;
  primaryActionLabel?: string;
  primaryActionA11yLabel?: string;
  scrollContentContainerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Unified Accessible Modal primitive (`accessible-modal.tsx`).
 * Consolidates overlay, backdrop dismiss, Web Escape shortcut, Web `role="dialog"` guards,
 * native `accessibilityViewIsModal`, responsive scroll sizing up to 200% font scale,
 * and WCAG-compliant header/footer actions without risking native `RCTView` role crashes.
 */
export function AccessibleModal({
  visible,
  onClose,
  title,
  eyebrow,
  subtitle,
  icon,
  dialogLabel,
  closeButtonLabel = 'Cerrar ventana',
  closeButtonHint,
  closeAnnouncement,
  backdropLabel = 'Cerrar modal tocando fuera',
  maxWidth = 500,
  size = 'tall',
  cardBackgroundColor,
  topBanner,
  footer,
  primaryActionLabel,
  primaryActionA11yLabel,
  scrollContentContainerStyle,
  children,
}: AccessibleModalProps) {
  const theme = useTheme();
  const { prefs } = useAccessibility();
  const highContrast = prefs.high_contrast;

  const handleClose = useCallback(() => {
    triggerHapticFeedback('light');
    if (closeAnnouncement) {
      announceStatus(closeAnnouncement);
    }
    onClose();
  }, [closeAnnouncement, onClose]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleClose]);

  const resolvedFooter =
    footer ??
    (primaryActionLabel ? (
      <AccessiblePressable
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel={primaryActionA11yLabel || primaryActionLabel}
        style={[
          styles.primaryFooterBtn,
          {
            backgroundColor: theme.primary,
            borderColor: highContrast ? theme.text : 'transparent',
          },
        ]}
      >
        <ThemedText style={[styles.primaryFooterBtnText, { color: theme.onPrimary }]}>
          {primaryActionLabel}
        </ThemedText>
      </AccessiblePressable>
    ) : null);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdropDismiss}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={backdropLabel}
        />

        <ThemedView
          style={[
            styles.card,
            size === 'tall' ? styles.cardTall : styles.cardAuto,
            {
              maxWidth,
              backgroundColor: cardBackgroundColor ?? theme.background,
              borderColor: highContrast ? theme.text : theme.border,
            },
          ]}
          {...(Platform.OS === 'web'
            ? {
                role: 'dialog' as const,
                'aria-modal': true,
                'aria-label': dialogLabel || title,
              }
            : {})}
        >
          {/* Unified Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: theme.border,
                backgroundColor: theme.backgroundElement,
              },
            ]}
          >
            <View style={styles.headerTitleGroup}>
              {icon ? <ThemedText style={styles.headerIcon}>{icon}</ThemedText> : null}
              <View style={styles.headerTextCol}>
                {eyebrow ? (
                  <ThemedText style={[styles.eyebrowText, { color: theme.primary }]}>
                    {eyebrow}
                  </ThemedText>
                ) : null}
                <ThemedText
                  accessibilityRole="header"
                  style={[styles.title, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {title}
                </ThemedText>
                {subtitle ? (
                  <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                    {subtitle}
                  </ThemedText>
                ) : null}
              </View>
            </View>

            <AccessiblePressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={closeButtonLabel}
              accessibilityHint={closeButtonHint}
              style={[
                styles.closeBtn,
                {
                  borderColor: highContrast ? theme.text : 'transparent',
                },
              ]}
            >
              <ThemedText style={[styles.closeBtnText, { color: theme.textSecondary }]}>
                ✕
              </ThemedText>
            </AccessiblePressable>
          </View>

          {topBanner}

          {/* Scrollable Body */}
          <ScrollView
            style={size === 'tall' ? styles.scrollTall : styles.scrollAuto}
            contentContainerStyle={[styles.scrollContent, scrollContentContainerStyle]}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {children}
          </ScrollView>

          {/* Optional Footer */}
          {resolvedFooter ? (
            <View
              style={[
                styles.footer,
                {
                  borderTopColor: theme.border,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            >
              {resolvedFooter}
            </View>
          ) : null}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.two,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 10,
  },
  cardTall: {
    height: '85%',
    maxHeight: 700,
  },
  cardAuto: {
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    flexShrink: 0,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
    marginRight: Spacing.one,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  closeBtn: {
    minWidth: MinTouchTargetSize,
    minHeight: MinTouchTargetSize,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollTall: {
    flex: 1,
    width: '100%',
  },
  scrollAuto: {
    flexShrink: 1,
    width: '100%',
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  footer: {
    padding: Spacing.two,
    borderTopWidth: 1,
    flexShrink: 0,
  },
  primaryFooterBtn: {
    width: '100%',
    minHeight: MinTouchTargetSize,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  primaryFooterBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

