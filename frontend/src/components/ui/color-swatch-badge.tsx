import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatAccessibleColorLabel, getSpanishColorName } from '@/utils/color-names';

export interface ColorSwatchBadgeProps {
  /**
   * Hexadecimal color value (e.g., "#3b3735").
   */
  hexValue: string;
  /**
   * Optional facial region or cosmetic category name (e.g., "Labios", "Delineado").
   */
  regionLabel?: string;
  /**
   * Whether to show the raw HEX code next to the Spanish descriptive name (defaults to true).
   */
  showHexCode?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Accessible Color Swatch Badge for cosmetic shades and extracted facial regions.
 * Fulfills 2ndPhaseProposal.pdf Section V.D.2 & WCAG 1.4.1 (Use of Color):
 * - Never conveys color solely through the visual circle.
 * - Hides the purely decorative circle from screen readers (`importantForAccessibility="no"`, `aria-hidden={true}`).
 * - Displays the perceptual CIELAB Spanish color name + HEX code in visible text and in `accessibilityLabel`.
 */
export function ColorSwatchBadge({
  hexValue,
  regionLabel,
  showHexCode = true,
  style,
}: ColorSwatchBadgeProps) {
  const theme = useTheme();
  const normalizedHex = hexValue?.startsWith('#') ? hexValue.toUpperCase() : `#${hexValue || '000000'}`.toUpperCase();
  const spanishName = getSpanishColorName(normalizedHex);
  const accessibleLabel = formatAccessibleColorLabel(normalizedHex, regionLabel);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibleLabel}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        style,
      ]}>
      <View
        importantForAccessibility="no"
        aria-hidden={true}
        style={[
          styles.swatchCircle,
          {
            backgroundColor: normalizedHex,
            borderColor: theme.text,
          },
        ]}
      />

      <View style={styles.textContainer}>
        {regionLabel ? (
          <ThemedText type="small" themeColor="textSecondary">
            {regionLabel}
          </ThemedText>
        ) : null}
        <ThemedText type="smallBold">
          {spanishName}
          {showHexCode ? ` (${normalizedHex})` : ''}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  swatchCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  textContainer: {
    flexShrink: 1,
  },
});

