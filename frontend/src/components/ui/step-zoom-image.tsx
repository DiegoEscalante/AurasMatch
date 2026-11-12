/**
 * Accessible Step-Zoom & Pinch-to-Zoom Image Viewer.
 * Features:
 * 1. Multi-touch Pinch-to-Zoom with dynamic touch tracking on Android/iOS/Web.
 * 2. Targeted Double-Tap: Zooms directly into the tapped area (eyes, lips) without showing black borders.
 * 3. Smooth Pan / Drag in all directions when zoomed in to explore borders.
 * 4. Discrete +/- buttons displaying percentages (100%, 150%, 200%, etc.) for motor accessibility (WCAG 2.5.1).
 * 5. Subtle, non-intrusive "Arrastra para ver" floating indicator.
 * Fulfills Spec 02, Spec 06 & 2ndPhaseProposal.pdf Section V.A.4.
 */

import { Image, ImageContentFit } from 'expo-image';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';

export interface StepZoomImageProps {
  /**
   * Remote or local URI of the look image.
   */
  uri: string;
  /**
   * Required descriptive alternative text read by screen readers.
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

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 3.5;
const ZOOM_STEP = 0.5;

export function StepZoomImage({
  uri,
  altText,
  height = 380,
  contentFit = 'cover',
  style,
}: StepZoomImageProps) {
  const theme = useTheme();
  const { prefs } = useAccessibility();
  const high_contrast = prefs.high_contrast;

  const [isImageLoading, setIsImageLoading] = useState(true);

  // Zoom scale and pan offset
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Viewport dimensions
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 340,
    height,
  });

  // Mutable refs for latest values inside PanResponder
  const scaleRef = useRef<number>(1);
  scaleRef.current = scale;

  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  panRef.current = pan;

  const viewportRef = useRef<{ width: number; height: number }>({ width: 340, height });
  viewportRef.current = viewportSize;

  // Touch tracking for pinch and double tap
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapTimeRef = useRef<number>(0);

  // Measure viewport layout
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height: h } = event.nativeEvent.layout;
    if (width > 0 && h > 0) {
      setViewportSize({ width, height: h });
    }
  };

  // Helper: Clamp pan coordinates within scaled boundaries (never shows black bars or empty space)
  const clampPan = useCallback((x: number, y: number, currentScale: number) => {
    if (currentScale <= 1.01) {
      return { x: 0, y: 0 };
    }
    const { width, height: h } = viewportRef.current;
    const maxX = ((currentScale - 1) * width) / 2;
    const maxY = ((currentScale - 1) * h) / 2;

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  // Set zoom scale and automatically clamp existing pan offset
  const applyZoom = useCallback(
    (newScale: number, announce: boolean = true) => {
      const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(newScale * 10) / 10));
      setScale(clampedScale);
      setPan((prevPan) => clampPan(prevPan.x, prevPan.y, clampedScale));

      if (announce) {
        announceStatus(`Zoom al ${Math.round(clampedScale * 100)} por ciento.`);
      }
    },
    [clampPan]
  );

  // Reset zoom & pan to 100% origin
  const handleReset = useCallback(() => {
    triggerHapticFeedback('light');
    setScale(1);
    setPan({ x: 0, y: 0 });
    announceStatus('Zoom restablecido al 100 por ciento.');
  }, []);

  // Zoom In button (+50%)
  const handleZoomIn = () => {
    triggerHapticFeedback('light');
    applyZoom(scaleRef.current + ZOOM_STEP);
  };

  // Zoom Out button (-50%)
  const handleZoomOut = () => {
    triggerHapticFeedback('light');
    const nextScale = scaleRef.current - ZOOM_STEP;
    if (nextScale <= 1.05) {
      handleReset();
    } else {
      applyZoom(nextScale);
    }
  };

  // PanResponder for multi-touch Pinch & Pan gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const touches = evt.nativeEvent.touches;
        // Two fingers -> always capture for pinch!
        if (touches && touches.length >= 2) {
          return true;
        }
        // If already zoomed in, capture pan so parent scrollview doesn't steal dragging
        if (scaleRef.current > 1.02) {
          return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
        }
        return false;
      },
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touches = evt.nativeEvent.touches;

        // Double-tap targeted zoom logic
        const now = Date.now();
        if (touches.length === 1 && now - lastTapTimeRef.current < 320) {
          lastTapTimeRef.current = 0;
          if (scaleRef.current > 1.05) {
            handleReset();
          } else {
            triggerHapticFeedback('medium');
            const touch = touches[0];
            const { width, height: h } = viewportRef.current;
            const locationX = touch.locationX ?? width / 2;
            const locationY = touch.locationY ?? h / 2;

            // Target 200% zoom centered on the tapped area
            const targetScale = 2.0;
            const diffX = locationX - width / 2;
            const diffY = locationY - h / 2;
            const targetPanX = -diffX * (targetScale - 1);
            const targetPanY = -diffY * (targetScale - 1);

            // Clamp so we never exceed image boundaries
            const clamped = clampPan(targetPanX, targetPanY, targetScale);
            setScale(targetScale);
            setPan(clamped);
            announceStatus('Zoom al 200 por ciento en zona seleccionada.');
          }
          return;
        }
        lastTapTimeRef.current = now;

        // Reset pinch distance tracking
        initialTouchDistanceRef.current = null;
        startPanRef.current = { ...panRef.current };
      },
      onPanResponderMove: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const touches = evt.nativeEvent.touches;

        // 1. Pinch-to-zoom when 2 fingers are touching
        if (touches && touches.length >= 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const currentDistance = Math.hypot(dx, dy);

          // If this is the first frame with 2 fingers, record baseline distance
          if (initialTouchDistanceRef.current === null) {
            initialTouchDistanceRef.current = currentDistance;
            initialScaleRef.current = scaleRef.current;
            return;
          }

          if (initialTouchDistanceRef.current > 0) {
            const factor = currentDistance / initialTouchDistanceRef.current;
            const targetScale = Math.max(
              MIN_ZOOM,
              Math.min(MAX_ZOOM, initialScaleRef.current * factor)
            );
            setScale(targetScale);
            setPan((prev) => clampPan(prev.x, prev.y, targetScale));
          }
          return;
        }

        // Reset pinch tracking if touch count dropped below 2
        initialTouchDistanceRef.current = null;

        // 2. Pan / Drag movement with 1 finger or mouse drag when zoomed in
        if (scaleRef.current > 1.02) {
          const targetX = startPanRef.current.x + gestureState.dx;
          const targetY = startPanRef.current.y + gestureState.dy;
          const clamped = clampPan(targetX, targetY, scaleRef.current);
          setPan(clamped);
        }
      },
      onPanResponderRelease: () => {
        initialTouchDistanceRef.current = null;
        if (scaleRef.current < 1.08) {
          handleReset();
        }
      },
      onPanResponderTerminate: () => {
        initialTouchDistanceRef.current = null;
      },
    })
  ).current;

  const isZoomed = scale > 1.05;
  const currentPercentage = Math.round(scale * 100);

  return (
    <ThemedView style={[styles.wrapper, style]}>
      {/* Viewport with PanResponder for Gestures */}
      <View
        onLayout={handleLayout}
        {...panResponder.panHandlers}
        style={[
          styles.viewport,
          {
            height,
            backgroundColor: theme.backgroundElement,
            borderColor: high_contrast ? theme.text : theme.border,
          },
        ]}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={`${altText}. Zoom actual: ${currentPercentage} por ciento.`}
        accessibilityHint="Realiza el gesto de pinza o toca dos veces para acercar; arrastra para explorar los bordes."
      >
        {isImageLoading && (
          <View style={styles.imageLoadingOverlay}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}

        <Image
          source={{ uri }}
          accessibilityLabel={altText}
          contentFit={contentFit}
          transition={100}
          onLoadStart={() => setIsImageLoading(true)}
          onLoad={() => setIsImageLoading(false)}
          onError={() => setIsImageLoading(false)}
          style={[
            styles.image,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale },
              ],
            },
          ]}
        />

        {/* Discreet Non-Intrusive Floating Indicator */}
        {isZoomed && (
          <View
            style={[
              styles.discreetHintPill,
              {
                backgroundColor: high_contrast ? '#000000' : 'rgba(0, 0, 0, 0.55)',
                borderColor: high_contrast ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)',
              },
            ]}
            pointerEvents="box-none"
          >
            <ThemedText style={styles.discreetHintText}>
              Arrastra para ver
            </ThemedText>
          </View>
        )}
      </View>

      {/* Accessible Button Toolbar displaying Percentages (WCAG 2.5.1) */}
      <View
        accessibilityRole="toolbar"
        accessibilityLabel="Controles de acercamiento de imagen accesibles"
        style={[
          styles.controlsRow,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: high_contrast ? theme.text : theme.border,
          },
        ]}
      >
        <AccessiblePressable
          accessibilityRole="button"
          accessibilityLabel="Alejar imagen"
          accessibilityHint="Reduce el nivel de acercamiento del maquillaje"
          disabled={!isZoomed}
          onPress={handleZoomOut}
          style={[
            styles.controlBtn,
            {
              borderColor: isZoomed ? theme.primary : theme.border,
              backgroundColor: isZoomed ? theme.backgroundSelected : theme.backgroundElement,
              opacity: isZoomed ? 1 : 0.5,
            },
          ]}
        >
          <ThemedText
            type="smallBold"
            style={{ color: isZoomed ? theme.primary : theme.textSecondary }}
          >
            − Alejar
          </ThemedText>
        </AccessiblePressable>

        {/* Central percentage indicator button (e.g., 100%, 150%, 200%) */}
        <AccessiblePressable
          accessibilityRole="button"
          accessibilityLabel={`Nivel de zoom actual ${currentPercentage} por ciento. Toca para restablecer`}
          disabled={!isZoomed}
          onPress={handleReset}
          style={[
            styles.resetBtn,
            {
              backgroundColor: isZoomed ? theme.primary : theme.backgroundSelected,
              borderColor: theme.border,
            },
          ]}
        >
          <ThemedText
            type="smallBold"
            style={{ color: isZoomed ? theme.onPrimary : theme.text }}
          >
            {currentPercentage}% {isZoomed ? '↺' : ''}
          </ThemedText>
        </AccessiblePressable>

        <AccessiblePressable
          accessibilityRole="button"
          accessibilityLabel="Acercar imagen"
          accessibilityHint="Aumenta el nivel de acercamiento para inspeccionar delineado, cejas y labios"
          disabled={scale >= MAX_ZOOM}
          onPress={handleZoomIn}
          style={[
            styles.controlBtn,
            {
              borderColor: scale < MAX_ZOOM ? theme.primary : theme.border,
              backgroundColor: scale < MAX_ZOOM ? theme.backgroundSelected : theme.backgroundElement,
              opacity: scale < MAX_ZOOM ? 1 : 0.5,
            },
          ]}
        >
          <ThemedText
            type="smallBold"
            style={{ color: scale < MAX_ZOOM ? theme.primary : theme.textSecondary }}
          >
            + Acercar
          </ThemedText>
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
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  discreetHintPill: {
    position: 'absolute',
    top: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  discreetHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    padding: Spacing.one,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  controlBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 44,
  },
  resetBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 72,
  },
});
