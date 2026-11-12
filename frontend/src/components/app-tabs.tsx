import {
  Tabs,
  TabList,
  TabListProps,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import {
  GestureResponderEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  TargetedEvent,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { triggerHapticFeedback } from '@/utils/a11y-feedback';

interface AurasTabButtonProps extends TabTriggerSlotProps {
  label: string;
  accessibilityLabel: string;
  iconIos: string;
  iconAndroid: string;
}

function AurasTabButton({
  label,
  accessibilityLabel,
  iconIos,
  iconAndroid,
  isFocused,
  onPress,
  onFocus,
  onBlur,
  style,
  ref: _ref,
  ...props
}: AurasTabButtonProps) {
  const theme = useTheme();
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);

  const handlePress = (event: GestureResponderEvent) => {
    void triggerHapticFeedback('light');
    onPress?.(event);
  };

  const handleFocus = (event: NativeSyntheticEvent<TargetedEvent>) => {
    setIsKeyboardFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: NativeSyntheticEvent<TargetedEvent>) => {
    setIsKeyboardFocused(false);
    onBlur?.(event);
  };

  const webAriaProps =
    Platform.OS === 'web'
      ? {
          role: 'tab' as const,
          'aria-label': accessibilityLabel,
          'aria-selected': Boolean(isFocused),
          tabIndex: 0 as const,
        }
      : {};

  const activeTextColor = isFocused ? theme.onPrimary : theme.textSecondary;
  const flattenedIncomingStyle =
    typeof style === 'object' ? StyleSheet.flatten(style) : undefined;

  return (
    <Pressable
      {...props}
      {...webAriaProps}
      accessible
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: Boolean(isFocused) }}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={({ pressed }) =>
        StyleSheet.flatten([
          styles.tabTriggerPressable,
          flattenedIncomingStyle,
          pressed && styles.pressed,
        ])
      }>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={StyleSheet.flatten([
          styles.tabPill,
          isFocused && { backgroundColor: theme.primary, borderColor: theme.primary },
          !isFocused && { borderColor: 'transparent' },
          isKeyboardFocused && {
            borderColor: theme.focusRing,
            borderWidth: 2,
          },
        ])}>
        <View importantForAccessibility="no-hide-descendants" aria-hidden={true}>
          <SymbolView
            name={{
              ios: iconIos as any,
              android: iconAndroid as any,
              web: iconAndroid as any,
            }}
            size={18}
            tintColor={activeTextColor}
          />
        </View>
        <ThemedText
          type={isFocused ? 'smallBold' : 'small'}
          style={{ color: activeTextColor }}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function CustomBottomTabList({ children, style, ...props }: TabListProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      accessibilityRole="tablist"
      accessibilityLabel="Navegación principal de AurasMatch"
      style={StyleSheet.flatten([
        style,
        styles.bottomBarWrapper,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
      ])}>
      <View style={styles.bottomBarInner}>{children}</View>
    </View>
  );
}

/**
 * Predictable 3-Tab Bottom Navigation Bar (Feed, Subir, Usuario).
 * Uses `StyleSheet.flatten` on all `<Slot>` children (`TabList` and `TabTrigger`)
 * so `expo-router/ui` never logs the `<Slot>` style array warning.
 */
export default function AppTabs() {
  const theme = useTheme();

  return (
    <Tabs>
      <View
        style={StyleSheet.flatten([
          styles.slotWrapper,
          { backgroundColor: theme.background },
        ])}>
        <TabSlot style={{ flex: 1 }} />
      </View>

      <TabList asChild>
        <CustomBottomTabList>
          <TabTrigger name="index" href="/" asChild>
            <AurasTabButton
              label="Feed"
              accessibilityLabel="Pestaña 1 de 3: Feed comunitario de maquillaje"
              iconIos="sparkles"
              iconAndroid="auto_awesome"
            />
          </TabTrigger>

          <TabTrigger name="upload" href="/upload" asChild>
            <AurasTabButton
              label="Subir"
              accessibilityLabel="Pestaña 2 de 3: Subir y analizar foto de maquillaje"
              iconIos="camera.fill"
              iconAndroid="photo_camera"
            />
          </TabTrigger>

          <TabTrigger name="profile" href="/profile" asChild>
            <AurasTabButton
              label="Usuario"
              accessibilityLabel="Pestaña 3 de 3: Perfil de usuario y opciones de accesibilidad"
              iconIos="person.crop.circle.fill"
              iconAndroid="person"
            />
          </TabTrigger>
        </CustomBottomTabList>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  slotWrapper: {
    flex: 1,
  },
  bottomBarWrapper: {
    width: '100%',
    borderTopWidth: 1.5,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
  },
  tabTriggerPressable: {
    flex: 1,
    minHeight: MinTouchTargetSize,
  },
  tabPill: {
    flex: 1,
    minHeight: MinTouchTargetSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
