import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessibleCollapsible } from '@/components/ui/collapsible';
import { Spacing } from '@/constants/theme';

/**
 * Collapsible Lighting Guide for Upload Screen (`lighting-guide-collapsible.tsx`).
 * Educates users on front lighting, avoiding filters, and keeping facial zones visible
 * to ensure accurate MediaPipe 468-point facial mesh extraction and CIELAB color math.
 * Directly mitigates the real-world limitation identified in Project Proposal.pdf (Section IV.C).
 * Uses AccessibleCollapsible (WCAG 2.4.1 Bypass Blocks).
 */
export function LightingGuideCollapsible() {
  return (
    <AccessibleCollapsible
      title="Guía de Iluminación para Extracción Exacta"
      subtitle="Recomendaciones antes de tomar o subir tu foto">
      <View style={styles.guideContainer}>
        <View style={styles.tipRow}>
          <ThemedText type="smallBold">☀️ Luz Frontal Uniforme:</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Busca luz natural frente a tu rostro o una lámpara blanca frontal. Evita sombras duras
            o contraluces que alteren el cálculo perceptual CIELAB (L*, a*, b*) de tus sombras y labial.
          </ThemedText>
        </View>

        <View style={styles.tipRow}>
          <ThemedText type="smallBold">🚫 Cero Filtros Digitales:</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Evita fotos descargadas con filtros de redes sociales. El motor Anti-IA analiza metadatos
            C2PA, frecuencias espectrales FFT y microtextura dérmica; un suavizado artificial excesivo
            podría clasificar erróneamente tu foto como sintética.
          </ThemedText>
        </View>

        <View style={styles.tipRow}>
          <ThemedText type="smallBold">👁️ Rasgos Despejados:</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Mantén labios, cejas y párpados visibles sin flequillos densos o gafas oscuras para que
            la malla facial de 468 puntos de MediaPipe pueda aislar correctamente cada zona.
          </ThemedText>
        </View>
      </View>
    </AccessibleCollapsible>
  );
}

const styles = StyleSheet.create({
  guideContainer: {
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  tipRow: {
    gap: Spacing.half,
  },
});
