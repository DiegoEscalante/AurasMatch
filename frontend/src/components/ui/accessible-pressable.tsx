import React, { useState } from 'react';
import {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
  AccessibilityRole,
  AccessibilityState,
  GestureResponderEvent,
   NativeSyntheticEvent,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  TargetedEvent,
  ViewStyle,
} from 'react-native';

import { MinTouchTargetSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { HapticFeedbackType, triggerHapticFeedback } from '@/utils/a11y-feedback';

export interface AccessiblePressableProps extends Omit<PressableProps, 'style'> {
  /**
   * Required descriptive label for screen readers (TalkBack, VoiceOver, NVDA).
   */
  accessibilityLabel: string;
  /**
   * Optional hint describing the outcome of activating the control.
   */
  accessibilityHint?: string;
  /**
   * Semantic role (defaults to 'button').
   */
  accessibilityRole?: AccessibilityRole;
  /**
   * Current interactive state (disabled, selected, checked, busy, expanded).
   */
  accessibilityState?: AccessibilityState;
  /**
   * Optional custom accessibility actions for assistive tech.
   */
  accessibilityActions?: ReadonlyArray<AccessibilityActionInfo>;
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  /**
   * Haptic feedback triggered on press (defaults to 'light').
   */
  hapticOnPress?: HapticFeedbackType;
  /**
   * Enforces at least 48x48 dp touch target (defaults to true).
   */
  enforceMinTouchSize?: boolean;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean; focused: boolean }) => StyleProp<ViewStyle>);
}

const DEFAULT_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * Stitch-Ready Accessible Pressable primitive for Mobile (TalkBack/VoiceOver) and Web (Keyboard/ARIA).
 * Guarantees:
 * - Minimum 48x48 dp touch target + 8 dp hitSlop for limited mobility (WCAG 2.5.5 / 2ndPhaseProposal V.A).
 * - Visible high-contrast focus ring when navigated via keyboard Tab (2ndPhaseProposal V.A.3).
 * - Synchronized React Native accessibility props and Web ARIA attributes.
 */
export function AccessiblePressable({
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  accessibilityActions,
  onAccessibilityAction,
  hapticOnPress = 'light',
  enforceMinTouchSize = true,
  hitSlop = DEFAULT_HIT_SLOP,
  disabled,
  onPress,
  onFocus,
  onBlur,
  style,
  children,
  ...rest
}: AccessiblePressableProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const mergedA11yState: AccessibilityState = {
    ...accessibilityState,
    disabled: Boolean(disabled ?? accessibilityState?.disabled),
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (mergedA11yState.disabled) return;
    if (hapticOnPress !== 'none') {
      void triggerHapticFeedback(hapticOnPress);
    }
    onPress?.(event);
  };

  const handleFocus = (event: NativeSyntheticEvent<TargetedEvent>) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: NativeSyntheticEvent<TargetedEvent>) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  const webAriaProps =
    Platform.OS === 'web'
      ? {
          'aria-label': accessibilityLabel,
          'aria-expanded': mergedA11yState.expanded,
          'aria-selected': mergedA11yState.selected,
          'aria-busy': mergedA11yState.busy,
          'aria-disabled': mergedA11yState.disabled,
          tabIndex: mergedA11yState.disabled ? (-1 as const) : (0 as const),
        }
      : {};

  return (
    <Pressable
      {...rest}
      {...webAriaProps}
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={mergedA11yState}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      disabled={mergedA11yState.disabled}
      hitSlop={hitSlop}
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={({ pressed }) => {
        const customStyle =
          typeof style === 'function' ? style({ pressed, focused: isFocused }) : style;
        return [
          enforceMinTouchSize && styles.minTouchTarget,
          pressed && !mergedA11yState.disabled && styles.pressed,
          mergedA11yState.disabled && styles.disabled,
          isFocused && {
            borderColor: theme.focusRing,
            borderWidth: 2,
          },
          customStyle,
        ];
      }}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  minTouchTarget: {
    minWidth: MinTouchTargetSize,
    minHeight: MinTouchTargetSize,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.5,
  },
});

