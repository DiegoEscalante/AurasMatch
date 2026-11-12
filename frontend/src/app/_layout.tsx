import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AssistiveVoiceBar } from '@/components/ui/assistive-voice-bar';
import { AnalysisLockProvider } from '@/contexts/analysis-lock-context';
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
      <AssistiveVoiceBar />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <AnalysisLockProvider>
          <RootLayoutContent />
        </AnalysisLockProvider>
      </AuthProvider>
    </AccessibilityProvider>
  );
}
