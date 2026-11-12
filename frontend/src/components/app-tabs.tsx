/**
 * Predictable 3-Tab Bottom Navigation Bar (Feed, Subir, Usuario).
 * Uses Expo Router's `<Slot />` to render the active screen directly,
 * avoiding `expo-router/ui`'s `useVisibleTabsWithRedirect` which erroneously
 * closes or redirects dynamic stack screens (like `/look/[id]`) in an instant.
 * Fulfills Spec 00, Spec 04, Spec 06 & Mobile-First Cross-Platform Rule.
 */

import { Slot, usePathname, useRouter } from 'expo-router';
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
import { useAnalysisLock } from '@/contexts/analysis-lock-context';
import { useTheme } from '@/hooks/use-theme';
import { triggerHapticFeedback } from '@/utils/a11y-feedback';

interface AurasTabButtonProps {
  label: string;
  accessibilityLabel: string;
  iconIos: string;
  iconAndroid: string;
  isFocused: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: any;
}

function AurasTabButton({
  label,
  accessibilityLabel,
  iconIos,
  iconAndroid,
  isFocused,
  disabled = false,
  onPress,
  style,
}: AurasTabButtonProps) {
  const theme = useTheme();
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);

  const handlePress = (_event: GestureResponderEvent) => {
    if (disabled) return;
    void triggerHapticFeedback('light');
    onPress();
  };

  const handleFocus = (_event: NativeSyntheticEvent<TargetedEvent>) => {
    if (disabled) return;
    setIsKeyboardFocused(true);
  };

  const handleBlur = (_event: NativeSyntheticEvent<TargetedEvent>) => {
    setIsKeyboardFocused(false);
  };

  const webAriaProps =
    Platform.OS === 'web'
      ? {
          role: 'tab' as const,
          'aria-label': accessibilityLabel,
          'aria-selected': Boolean(isFocused),
          'aria-disabled': Boolean(disabled),
          tabIndex: (disabled ? -1 : 0) as 0 | -1,
        }
      : {};

  const activeTextColor = isFocused ? theme.onPrimary : theme.textSecondary;
  const flattenedIncomingStyle =
    typeof style === 'object' ? StyleSheet.flatten(style) : undefined;

  return (
    <Pressable
      {...webAriaProps}
      accessible={true}
      accessibilityRole="tab"
      accessibilityLabel={
        disabled
          ? `${accessibilityLabel}. Deshabilitado temporalmente durante el análisis.`
          : accessibilityLabel
      }
      accessibilityState={{
        selected: Boolean(isFocused),
        disabled: Boolean(disabled),
      }}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={({ pressed }) =>
        StyleSheet.flatten([
          styles.tabTriggerPressable,
          flattenedIncomingStyle,
          pressed && !disabled && styles.pressed,
          disabled && { opacity: 0.38 },
        ])
      }
    >
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
        ])}
      >
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
          style={{ color: activeTextColor }}
        >
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function CustomBottomTabList({
  children,
  style,
  isLocked = false,
}: {
  children: React.ReactNode;
  style?: any;
  isLocked?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents={isLocked ? 'none' : 'auto'}
      accessibilityRole="tablist"
      accessibilityLabel="Navegación principal de AurasMatch"
      style={StyleSheet.flatten([
        style,
        styles.bottomBarWrapper,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
          opacity: isLocked ? 0.45 : 1,
        },
      ])}
    >
      <View style={styles.bottomBarInner}>{children}</View>
    </View>
  );
}

export default function AppTabs() {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { isAnalyzing } = useAnalysisLock();

  // Active tab determination based on pathname
  const isFeedFocused =
    pathname === '/' || pathname === '' || pathname.startsWith('/look');
  const isUploadFocused = pathname.startsWith('/upload');
  const isProfileFocused = pathname.startsWith('/profile');

  return (
    <View style={[styles.rootContainer, { backgroundColor: theme.background }]}>
      {/* Route slot renders the active screen (feed, upload, profile, or look/[id]) */}
      <View style={styles.slotWrapper}>
        <Slot />
      </View>

      {/* Persistent Bottom Tab Bar */}
      <CustomBottomTabList isLocked={isAnalyzing}>
        <AurasTabButton
          label="Feed"
          accessibilityLabel="Pestaña 1 de 3: Feed comunitario de maquillaje"
          iconIos="sparkles"
          iconAndroid="auto_awesome"
          isFocused={isFeedFocused}
          disabled={isAnalyzing}
          onPress={() => router.push('/')}
        />

        <AurasTabButton
          label="Subir"
          accessibilityLabel="Pestaña 2 de 3: Subir y analizar foto de maquillaje"
          iconIos="camera.fill"
          iconAndroid="photo_camera"
          isFocused={isUploadFocused}
          disabled={isAnalyzing}
          onPress={() => router.push('/upload')}
        />

        <AurasTabButton
          label="Usuario"
          accessibilityLabel="Pestaña 3 de 3: Perfil de usuario y opciones de accesibilidad"
          iconIos="person.crop.circle.fill"
          iconAndroid="person"
          isFocused={isProfileFocused}
          disabled={isAnalyzing}
          onPress={() => router.push('/profile')}
        />
      </CustomBottomTabList>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
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
