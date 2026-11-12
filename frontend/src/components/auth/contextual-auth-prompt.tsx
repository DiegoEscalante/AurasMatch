import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthCard } from '@/components/auth/auth-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ContextualAuthPromptProps {
  /**
   * Action-oriented heading explaining why signing in is requested at this moment.
   */
  title: string;
  /**
   * Clear explanation of what the user unlocks after signing in (Gradual Engagement).
   */
  description: string;
}

/**
 * Gradual Engagement / Deferred Authentication prompt (NN/g, Apple HIG, WCAG 2.2 SC 3.3.8).
 * Lets users browse the app freely and only asks for authentication when they trigger
 * an account-bound action (viewing personal collections, saving/liking looks, or uploading a look).
 */
export function ContextualAuthPrompt({
  title,
  description,
}: ContextualAuthPromptProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <ThemedView
        type="backgroundElement"
        style={[styles.bannerHeader, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </ThemedView>

      <AuthCard />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.three,
  },
  bannerHeader: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.one,
  },
});

