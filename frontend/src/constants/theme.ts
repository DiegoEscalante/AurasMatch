/**
 * Centralized design tokens and WCAG 2.1/2.2 Level AA & AAA verified color palettes.
 * Built to be compact and "Stitch-Ready" so visual styling can be updated in one place.
 */

import '@/global.css';

import { Platform } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark' | 'high_contrast';
export type ResolvedThemeKey = 'light' | 'dark' | 'high_contrast';
export type FontFamilyVariant = 'default' | 'sans_dyslexia' | 'mono_dyslexia';

export const Colors = {
  light: {
    text: '#111318', // 18.5:1 on #FFFFFF
    background: '#FFFFFF',
    backgroundElement: '#F2F3F7',
    backgroundSelected: '#E2E4EC',
    textSecondary: '#4A4E58', // 7.1:1 on #FFFFFF, 6.2:1 on #F2F3F7 (Passes WCAG AA >= 4.5:1)
    primary: '#8E1B4E', // 7.8:1 on #FFFFFF
    onPrimary: '#FFFFFF',
    linkPrimary: '#0052CC', // 7.3:1 on #FFFFFF (Fixes previous #3c87f7 3.48:1 failure)
    border: '#C5C9D3',
    focusRing: '#0052CC',
    success: '#146C32', // 6.6:1 on #FFFFFF
    warning: '#8A4B00', // 6.1:1 on #FFFFFF
    danger: '#B31926', // 6.8:1 on #FFFFFF
  },
  dark: {
    text: '#F7F8FA', // 19.6:1 on #0B0C0E
    background: '#0B0C0E',
    backgroundElement: '#1A1C21',
    backgroundSelected: '#282B33',
    textSecondary: '#B8BDC7', // 9.8:1 on #0B0C0E, 7.6:1 on #1A1C21 (Passes WCAG AA >= 4.5:1)
    primary: '#FF85B3', // 8.9:1 on #0B0C0E
    onPrimary: '#0B0C0E',
    linkPrimary: '#66B2FF', // 9.1:1 on #0B0C0E
    border: '#3A3E4A',
    focusRing: '#66B2FF',
    success: '#5CE085',
    warning: '#FFC457',
    danger: '#FF7A85',
  },
  high_contrast: {
    text: '#FFFFFF', // 21:1 on #000000 (WCAG AAA >= 7:1)
    background: '#000000',
    backgroundElement: '#000000',
    backgroundSelected: '#1F1F1F',
    textSecondary: '#FFFF00', // 19.6:1 on #000000
    primary: '#00FFFF', // 16.7:1 on #000000
    onPrimary: '#000000',
    linkPrimary: '#00FFFF',
    border: '#FFFFFF',
    focusRing: '#FFFF00',
    success: '#00FF66',
    warning: '#FFFF00',
    danger: '#FF6666',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;
export type ThemePalette = (typeof Colors)[ResolvedThemeKey];

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Dyslexia-friendly font families cited in 2ndPhaseProposal.pdf Section V.B.1 [12]
 * (Rello & Baeza-Yates: Sans-Serif Arial/Verdana/Helvetica and Monospace Courier).
 */
export const DyslexiaFontFamilies: Record<FontFamilyVariant, string | undefined> = {
  default: Fonts?.sans,
  sans_dyslexia: Platform.select({
    ios: 'Verdana',
    android: 'sans-serif',
    web: 'Verdana, Arial, Helvetica, sans-serif',
    default: 'sans-serif',
  }),
  mono_dyslexia: Platform.select({
    ios: 'Courier',
    android: 'monospace',
    web: '"Courier New", Courier, monospace',
    default: 'monospace',
  }),
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MinTouchTargetSize = 48; // >= 44pt iOS / 48dp Android WCAG 2.2 AA
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
