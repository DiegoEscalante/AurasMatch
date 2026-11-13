/**
 * Accessible horizontal action banner trigger (`ActionBannerButton`).
 * Shared across tabs (e.g. Profile Accessibility Modal trigger and Upload Lighting Guide trigger)
 * to preserve WCAG >= 48dp touch targets, AAA border framing, icon + title + subtitle layout,
 * and consistent right-aligned action label.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ActionBannerButtonProps {
  icon: string;
  title: string;
  subtitle: string;
  actionText: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  onPress: () => void;
}

export function ActionBannerButton({
  icon,
  title,
  subtitle,
  actionText,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  onPress,
}: ActionBannerButtonProps) {
  const theme = useTheme();

  return (
    <AccessiblePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.bannerBtn,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <View style={styles.bannerLeft}>
        <ThemedText style={styles.bannerIcon}>{icon}</ThemedText>
        <View style={styles.bannerTexts}>
          <ThemedText type="smallBold" style={{ color: theme.text }}>
            {title}
          </ThemedText>
          <ThemedText type="small" style={[styles.bannerSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={[styles.bannerAction, { color: theme.primary }]}>
        {actionText}
      </ThemedText>
    </AccessiblePressable>
  );
}

const styles = StyleSheet.create({
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: MinTouchTargetSize,
    gap: Spacing.two,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  bannerIcon: {
    fontSize: 22,
  },
  bannerTexts: {
    flex: 1,
    gap: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
  },
  bannerAction: {
    fontSize: 13,
    fontWeight: '700',
  },
});

