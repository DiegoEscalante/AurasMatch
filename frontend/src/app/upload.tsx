import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContextualAuthPrompt } from '@/components/auth/contextual-auth-prompt';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessibleCollapsible } from '@/components/ui/collapsible';
import { VisualAlertBanner } from '@/components/ui/visual-alert-banner';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

/**
 * Tab 2: Upload & AI Look Analysis Screen (`upload.tsx`).
 * Implements Gradual Engagement (ContextualAuthPrompt when unauthenticated)
 * and the Collapsible Lighting Guide (Project Proposal.pdf Section IV.B).
 * Full camera/gallery + Cloud Run `POST /analyze-look` pipeline will be connected in Phase 07.
 */
export default function UploadLookScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isAuthenticated, profile } = useAuth();
  const topPadding = Platform.OS === 'web' ? Spacing.four : Math.max(insets.top, Spacing.three);

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: topPadding, paddingBottom: Spacing.six },
      ]}>
      <ThemedView style={styles.container}>
        <View style={styles.headerBlock}>
          <ThemedText type="subtitle">Subir y Analizar Maquillaje</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Verifica que tu look es 100% humano, clasifica su subcultura y extrae los tonos exactos
            de ojos y labios en espacio CIELAB.
          </ThemedText>
        </View>

        <AccessibleCollapsible
          title="Guía de Iluminación para Extracción Exacta"
          subtitle="Recomendaciones antes de tomar tu foto">
          <View style={styles.guideList}>
            <ThemedText type="small">
              • Busca luz frontal natural o blanca uniforme para no alterar el cálculo perceptual
              CIELAB de tus sombras y labial.
            </ThemedText>
            <ThemedText type="small">
              • Evita filtros de redes sociales: el motor Anti-IA de 3 etapas analiza metadatos
              C2PA, frecuencias espectrales y microtextura dérmica.
            </ThemedText>
            <ThemedText type="small">
              • Mantén visibles labios, cejas y párpados para la malla facial de 468 puntos de
              MediaPipe.
            </ThemedText>
          </View>
        </AccessibleCollapsible>

        {!isAuthenticated || !profile ? (
          <ContextualAuthPrompt
            title="Inicia Sesión para Subir y Analizar tu Look"
            description="Puedes explorar el Feed libremente sin cuenta. Para enviar fotografías al motor de inteligencia artificial y atribuirlas a tu perfil, inicia sesión o entra con @aurasmatch_bot."
          />
        ) : (
          <VisualAlertBanner
            variant="info"
            autoAnnounce={false}
            title={`Listo para subir como @${profile.username}`}
            message="La captura de cámara/galería, el autoguardado de borrador sin temporizador y la conexión con POST /analyze-look en Google Cloud Run se activan en la Fase 07."
          />
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  headerBlock: {
    gap: Spacing.one,
  },
  guideList: {
    gap: Spacing.two,
  },
});

