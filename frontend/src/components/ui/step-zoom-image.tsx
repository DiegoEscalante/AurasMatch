import { Image, ImageContentFit } from 'expo-image';
import React, { useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { announceStatus } from '@/utils/a11y-feedback';

export interface StepZoomImageProps {
  /**
   * Remote or local URI of the look image.
   */
  uri: string;
  /**
   * Required descriptive alternative text read by screen readers (TalkBack, VoiceOver, NVDA).
   */
  altText: string;
  /**
   * Height of the image viewport (defaults to 380).
   */
  height?: number;
  /**
   * Content fit mode (defaults to 'cover').
   */
  contentFit?: ImageContentFit;
  style?: StyleProp<ViewStyle>;
}

const ZOOM_STEPS = [1, 1.5, 2, 2.5] as const;

/**
 * Single-tap Step Zoom Image viewer for makeup detail inspection.
 * Fulfills 2ndPhaseProposal.pdf Section V.A.4 (Alternative Gestures: replaces complex two-finger
 * pinch-to-zoom with accessible single-tap / Enter-key +/- buttons).
 */
export function StepZoomImage({
  uri,
  altText,
  height = 380,
  contentFit = 'cover',
  style,
}: StepZoomImageProps) {
  const theme = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const currentZoom = ZOOM_STEPS[stepIndex];

  const handleZoomOut = () => {
    if (stepIndex <= 0) return;
    const nextIndex = stepIndex - 1;
    setStepIndex(nextIndex);
    announceStatus(`Zoom al ${Math.round(ZOOM_STEPS[nextIndex] * 100)} por ciento`);
  };

  const handleZoomIn = () => {
    if (stepIndex >= ZOOM_STEPS.length - 1) return;
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    announceStatus(`Zoom al ${Math.round(ZOOM_STEPS[nextIndex] * 100)} por ciento`);
  };

  const handleReset = () => {
    setStepIndex(0);
    announceStatus('Zoom restablecido al 100 por ciento');
  };

  return (
    <ThemedView style={[styles.wrapper, style]}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={altText}
        style={[
          styles.viewport,
          {
            height,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}>
        <Image
          source={{ uri }}
          accessibilityLabel={altText}
          contentFit={contentFit}
          transition={150}
          style={[
            styles.image,
            {
              transform: [{ scale: currentZoom }],
            },
          ]}
        />
      </View>

      <View
        accessibilityRole="toolbar"
        accessibilityLabel="Controles de acercamiento de imagen por botones"
        style={[
          styles.controlsRow,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}>
        <AccessiblePressable
          accessibilityRole="button"
          accessibilityLabel="Alejar imagen"
          accessibilityHint="Reduce el nivel de acercamiento del maquillaje"
          disabled={stepIndex === 0}
          onPress={handleZoomOut}
          style={[styles.controlBtn, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">− Alejar</ThemedText>
        </AccessiblePressable>

        <AccessiblePressable
          accessibilityRole="button"
          accessibilityLabel={`Nivel de zoom actual ${Math.round(currentZoom * 100)} por ciento. Toca para restablecer a 1x`}
          disabled={stepIndex === 0}
          onPress={handleReset}
          style={[styles.resetBtn, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">{currentZoom}x</ThemedText>
        </AccessiblePressable>

        <AccessiblePressable
          accessibilityRole="button"
          accessibilityLabel="Acercar imagen"
          accessibilityHint="Aumenta el nivel de acercamiento para ver detalles de ojos y labios"
          disabled={stepIndex === ZOOM_STEPS.length - 1}
          onPress={handleZoomIn}
          style={[styles.controlBtn, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">+ Acercar</ThemedText>
        </AccessiblePressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  viewport: {
    width: '100%',
    borderRadius: Spacing.three,
    overflow: 'hidden',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  controlBtn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  resetBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
});

