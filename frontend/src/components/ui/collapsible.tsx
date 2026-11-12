import { SymbolView } from 'expo-symbols';
import React, { PropsWithChildren, useEffect, useState } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { announceStatus } from '@/utils/a11y-feedback';

export interface AccessibleCollapsibleProps extends PropsWithChildren {
  /**
   * Visible title displayed in the collapsible trigger button.
   */
  title: string;
  /**
   * Optional subtitle or active filter summary shown next to the title.
   */
  subtitle?: string;
  /**
   * Optional badge text (e.g., active filter count "2") shown on the right.
   */
  badgeText?: string;
  /**
   * Uncontrolled initial open state (defaults to false).
   */
  defaultExpanded?: boolean;
  /**
   * Controlled open state (when provided, overrides internal state).
   */
  expanded?: boolean;
  /**
   * Callback fired whenever the collapsible opens or closes.
   */
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Optional explicit accessibilityHint for the trigger button.
   */
  accessibilityHint?: string;
  /**
   * Optional container style override.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional content wrapper style override.
   */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Unified Accessible Collapsible Menu Pattern (WCAG 2.4.1 Bypass Blocks / WAI-ARIA Disclosure).
 * Used across AurasMatch for:
 * 1) Feed Triple Filter dropdown next to the search bar
 * 2) Profile Accessibility Options menu
 * 3) Look Detail Anti-AI Technical Breakdown & Comments
 * 4) Upload Lighting Guide
 *
 * Keyboard & Screen Reader behavior:
 * - If the user tabs past the header without pressing Enter/Space, focus skips all internal controls
 *   and jumps directly to the next section (preventing focus traps and cognitive overload).
 * - Respects `reduced_motion` from AccessibilityContext.
 * - Supports Escape key on Web to collapse.
 */
export function AccessibleCollapsible({
  children,
  title,
  subtitle,
  badgeText,
  defaultExpanded = false,
  expanded,
  onExpandedChange,
  accessibilityHint,
  style,
  contentStyle,
}: AccessibleCollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultExpanded);
  const isControlled = typeof expanded === 'boolean';
  const isOpen = isControlled ? expanded : internalOpen;

  const theme = useTheme();
  const { prefs } = useAccessibility();
  const reduced_motion = prefs.reduced_motion;

  const setOpenState = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onExpandedChange?.(nextOpen);
    announceStatus(`${title} ${nextOpen ? 'desplegado' : 'contraído'}`);
  };

  // Allow closing with Escape key on Web when open
  useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenState(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const fullLabel = [
    title,
    subtitle ? `(${subtitle})` : null,
    badgeText ? `${badgeText} activos` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const defaultHint =
    accessibilityHint ??
    (isOpen
      ? 'Presiona dos veces o Enter para ocultar esta sección'
      : 'Presiona dos veces o Enter para desplegar las opciones, o pasa al siguiente elemento para omitirlas');

  const ContentContainer = reduced_motion ? View : Animated.View;
  const animationProps = reduced_motion ? {} : { entering: FadeIn.duration(180) };

  return (
    <ThemedView style={style}>
      <AccessiblePressable
        accessibilityRole="button"
        accessibilityLabel={fullLabel}
        accessibilityHint={defaultHint}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setOpenState(!isOpen)}
        style={[
          styles.heading,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}>
        <View
          importantForAccessibility="no-hide-descendants"
          aria-hidden={true}
          style={[styles.iconBadge, { backgroundColor: theme.backgroundSelected }]}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            weight="bold"
            tintColor={theme.text}
            style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
          />
        </View>

        <View style={styles.titleColumn}>
          <ThemedText type="smallBold">{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>

        {badgeText ? (
          <View
            importantForAccessibility="no-hide-descendants"
            aria-hidden={true}
            style={[styles.badge, { backgroundColor: theme.primary }]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {badgeText}
            </ThemedText>
          </View>
        ) : null}
      </AccessiblePressable>

      {isOpen ? (
        <ContentContainer {...animationProps}>
          <ThemedView
            type="backgroundElement"
            style={[
              styles.content,
              { borderColor: theme.border },
              contentStyle,
            ]}>
            {children}
          </ThemedView>
        </ContentContainer>
      ) : null}
    </ThemedView>
  );
}

/**
 * Alias kept for backwards compatibility with existing template imports.
 */
export const Collapsible = AccessibleCollapsible;

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  iconBadge: {
    width: Spacing.four,
    height: Spacing.four,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginTop: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
  },
});
