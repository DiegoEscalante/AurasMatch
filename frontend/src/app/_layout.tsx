import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AccessibilityProvider, useAccessibility } from '@/hooks/use-accessibility';
import { AuthProvider } from '@/hooks/use-auth';

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { resolvedThemeKey } = useAccessibility();
  const isDarkLike = resolvedThemeKey === 'dark' || resolvedThemeKey === 'high_contrast';

  return (
    <ThemeProvider value={isDarkLike ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </AccessibilityProvider>
  );
}
