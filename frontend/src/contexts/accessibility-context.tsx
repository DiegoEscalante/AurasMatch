import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme, useWindowDimensions } from 'react-native';

import {
  Colors,
  DyslexiaFontFamilies,
  type FontFamilyVariant,
  type ResolvedThemeKey,
  type ThemeMode,
  type ThemePalette,
} from '@/constants/theme';

const STORAGE_KEY = '@aurasmatch/accessibility_prefs_v1';

/**
 * Matches and extends `public.profiles.accessibility_prefs` JSONB column in Supabase.
 */
export interface AccessibilityPrefs {
  theme_mode: ThemeMode;
  high_contrast: boolean;
  dyslexia_font: boolean;
  font_family_variant: FontFamilyVariant;
  font_scale: number; // 1.0 (100%) up to 2.0 (200%)
  reduced_motion: boolean;
}

export const DEFAULT_ACCESSIBILITY_PREFS: AccessibilityPrefs = {
  theme_mode: 'system',
  high_contrast: false,
  dyslexia_font: false,
  font_family_variant: 'default',
  font_scale: 1.0,
  reduced_motion: false,
};

interface AccessibilityContextValue {
  prefs: AccessibilityPrefs;
  resolvedThemeKey: ResolvedThemeKey;
  palette: ThemePalette;
  effectiveFontScale: number;
  activeFontFamily: string | undefined;
  isLoaded: boolean;
  updateAccessibilityPrefs: (partial: Partial<AccessibilityPrefs>) => Promise<void>;
  resetAccessibilityPrefs: () => Promise<void>;
  hydrateFromProfilePrefs: (dbPrefs?: Record<string, unknown> | null) => Promise<void>;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function clampFontScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1.0;
  return Math.min(2.0, Math.max(1.0, Math.round(scale * 100) / 100));
}

function normalizePrefs(raw?: Partial<AccessibilityPrefs> | null): AccessibilityPrefs {
  const merged = { ...DEFAULT_ACCESSIBILITY_PREFS, ...(raw ?? {}) };
  const fontScale = clampFontScale(Number(merged.font_scale ?? 1.0));
  const highContrast =
    Boolean(merged.high_contrast) || merged.theme_mode === 'high_contrast';
  const themeMode: ThemeMode = highContrast
    ? 'high_contrast'
    : merged.theme_mode === 'light' || merged.theme_mode === 'dark'
      ? merged.theme_mode
      : 'system';

  const dyslexiaFont = Boolean(merged.dyslexia_font);
  const fontVariant: FontFamilyVariant =
    merged.font_family_variant === 'sans_dyslexia' || merged.font_family_variant === 'mono_dyslexia'
      ? merged.font_family_variant
      : dyslexiaFont
        ? 'sans_dyslexia'
        : 'default';

  return {
    theme_mode: themeMode,
    high_contrast: highContrast,
    dyslexia_font: dyslexiaFont || fontVariant !== 'default',
    font_family_variant: dyslexiaFont || fontVariant !== 'default' ? fontVariant : 'default',
    font_scale: fontScale,
    reduced_motion: Boolean(merged.reduced_motion),
  };
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { fontScale: systemFontScale } = useWindowDimensions();
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_ACCESSIBILITY_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialPrefs() {
      try {
        const [storedJson, osReduceMotion] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY).catch(() => null),
          AccessibilityInfo.isReduceMotionEnabled().catch(() => false),
        ]);

        if (!isMounted) return;

        if (storedJson) {
          const parsed = JSON.parse(storedJson) as Partial<AccessibilityPrefs>;
          setPrefs(normalizePrefs(parsed));
        } else if (osReduceMotion) {
          setPrefs((prev) => ({ ...prev, reduced_motion: true }));
        }
      } catch {
        // Fallback to defaults if storage is unavailable
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }

    loadInitialPrefs();

    const motionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (reduceMotionEnabled) => {
        setPrefs((prev) => ({ ...prev, reduced_motion: reduceMotionEnabled }));
      }
    );

    return () => {
      isMounted = false;
      motionSubscription.remove();
    };
  }, []);

  const persistPrefs = useCallback(async (next: AccessibilityPrefs) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const updateAccessibilityPrefs = useCallback(
    async (partial: Partial<AccessibilityPrefs>) => {
      setPrefs((prev) => {
        const updated = { ...prev, ...partial };
        // Keep high_contrast and theme_mode synchronized
        if (partial.high_contrast === true) {
          updated.theme_mode = 'high_contrast';
        } else if (partial.high_contrast === false && prev.theme_mode === 'high_contrast') {
          updated.theme_mode = 'system';
        } else if (partial.theme_mode && partial.theme_mode !== 'high_contrast') {
          updated.high_contrast = false;
        }
        // Keep dyslexia_font and font_family_variant synchronized
        if (partial.dyslexia_font === false) {
          updated.font_family_variant = 'default';
        } else if (
          partial.dyslexia_font === true &&
          updated.font_family_variant === 'default'
        ) {
          updated.font_family_variant = 'sans_dyslexia';
        }
        const normalized = normalizePrefs(updated);
        void persistPrefs(normalized);
        return normalized;
      });
    },
    [persistPrefs]
  );

  const resetAccessibilityPrefs = useCallback(async () => {
    setPrefs(DEFAULT_ACCESSIBILITY_PREFS);
    await persistPrefs(DEFAULT_ACCESSIBILITY_PREFS);
  }, [persistPrefs]);

  const hydrateFromProfilePrefs = useCallback(
    async (dbPrefs?: Record<string, unknown> | null) => {
      if (!dbPrefs || typeof dbPrefs !== 'object') return;
      const normalized = normalizePrefs(dbPrefs as Partial<AccessibilityPrefs>);
      setPrefs(normalized);
      await persistPrefs(normalized);
    },
    [persistPrefs]
  );

  const resolvedThemeKey: ResolvedThemeKey = useMemo(() => {
    if (prefs.high_contrast || prefs.theme_mode === 'high_contrast') {
      return 'high_contrast';
    }
    if (prefs.theme_mode === 'dark') return 'dark';
    if (prefs.theme_mode === 'light') return 'light';
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }, [prefs.high_contrast, prefs.theme_mode, systemColorScheme]);

  const palette = Colors[resolvedThemeKey];

  // Combine user's in-app font_scale with OS fontScale, capped safely at 2.0 (200%)
  const effectiveFontScale = useMemo(() => {
    const osScale = systemFontScale && systemFontScale > 1 ? systemFontScale : 1;
    return clampFontScale(Math.max(prefs.font_scale, osScale));
  }, [prefs.font_scale, systemFontScale]);

  const activeFontFamily = useMemo(() => {
    if (!prefs.dyslexia_font) return DyslexiaFontFamilies.default;
    return DyslexiaFontFamilies[prefs.font_family_variant];
  }, [prefs.dyslexia_font, prefs.font_family_variant]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      prefs,
      resolvedThemeKey,
      palette,
      effectiveFontScale,
      activeFontFamily,
      isLoaded,
      updateAccessibilityPrefs,
      resetAccessibilityPrefs,
      hydrateFromProfilePrefs,
    }),
    [
      prefs,
      resolvedThemeKey,
      palette,
      effectiveFontScale,
      activeFontFamily,
      isLoaded,
      updateAccessibilityPrefs,
      resetAccessibilityPrefs,
      hydrateFromProfilePrefs,
    ]
  );

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    // Fallback if used outside provider during initial mount/tests
    return {
      prefs: DEFAULT_ACCESSIBILITY_PREFS,
      resolvedThemeKey: 'light',
      palette: Colors.light,
      effectiveFontScale: 1.0,
      activeFontFamily: DyslexiaFontFamilies.default,
      isLoaded: true,
      updateAccessibilityPrefs: async () => {},
      resetAccessibilityPrefs: async () => {},
      hydrateFromProfilePrefs: async () => {},
    };
  }
  return context;
}

