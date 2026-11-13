import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthCard } from '@/components/auth/auth-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessibleModal } from '@/components/ui/accessible-modal';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { MinTouchTargetSize, Spacing } from '@/constants/theme';
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

export interface ContextualAuthModalProps extends ContextualAuthPromptProps {
  visible: boolean;
  onClose: () => void;
  guestButtonLabel?: string;
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

/**
 * Reusable modal version of ContextualAuthPrompt backed by AccessibleModal,
 * shared by the Feed (`index.tsx`) and Look Detail (`look/[id].tsx`) screens.
 */
export function ContextualAuthModal({
  visible,
  onClose,
  title,
  description,
  guestButtonLabel = 'Continuar explorando como visitante',
}: ContextualAuthModalProps) {
  const theme = useTheme();

  return (
    <AccessibleModal
      visible={visible}
      onClose={onClose}
      title="Inicia sesión para interactuar"
      dialogLabel="Aviso de inicio de sesión"
      closeButtonLabel="Cerrar aviso de inicio de sesión"
      closeAnnouncement="Aviso de inicio de sesión cerrado."
      maxWidth={480}
      size="auto"
      footer={
        <AccessiblePressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={guestButtonLabel}
          style={[
            styles.continueGuestBtn,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}
        >
          <ThemedText style={[styles.continueGuestText, { color: theme.textSecondary }]}>
            {guestButtonLabel}
          </ThemedText>
        </AccessiblePressable>
      }
    >
      <ContextualAuthPrompt title={title} description={description} />
    </AccessibleModal>
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
  continueGuestBtn: {
    minHeight: MinTouchTargetSize,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
  },
  continueGuestText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
