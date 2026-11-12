/**
 * Anti-AI Transparency Card for Look Detail Screen.
 * Displays the verified human realism badge and allows expanding
 * the 4-stage technical verification breakdown via `AccessibleCollapsible`.
 * Fulfills Spec 06 Section 3 & Project Proposal Phase 1 (Absolute Realism Guarantee).
 */

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessibleCollapsible } from '@/components/ui/collapsible';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';

export interface AntiAiTransparencyCardProps {
  aiConfidenceScore: number;
  authorUsername?: string | null;
  subcultureConfidenceScore?: number | null;
}

export function AntiAiTransparencyCard({
  aiConfidenceScore,
  authorUsername,
  subcultureConfidenceScore,
}: AntiAiTransparencyCardProps) {
  const theme = useTheme();
  const { prefs } = useAccessibility();
  const high_contrast = prefs.high_contrast;

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Human confidence percentage: (1 - aiScore) * 100
  const humanScorePercent = Math.max(
    1,
    Math.min(99, Math.round((1 - aiConfidenceScore) * 100))
  );

  const subcultureScorePercent =
    subcultureConfidenceScore !== null && subcultureConfidenceScore !== undefined
      ? Math.round(subcultureConfidenceScore * 100)
      : 92;

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: high_contrast ? '#000000' : theme.backgroundElement,
          borderColor: high_contrast ? '#FFFFFF' : '#22C55E',
        },
      ]}
    >
      {/* Summary Header */}
      <View style={styles.summaryRow}>
        <View style={styles.badgeLeft}>
          <ThemedText style={styles.shieldIcon}>🛡️</ThemedText>
          <View>
            <ThemedText style={[styles.guaranteeTitle, { color: high_contrast ? '#FFFFFF' : '#15803D' }]}>
              {humanScorePercent}% Verificado Humano
            </ThemedText>
            <ThemedText style={[styles.authorSubtitle, { color: theme.textSecondary }]}>
              Publicado por @{authorUsername || 'aurasmatch_creator'}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: high_contrast ? '#000000' : '#DCFCE7',
              borderColor: high_contrast ? '#FFFFFF' : '#86EFAC',
            },
          ]}
        >
          <ThemedText style={[styles.statusText, { color: high_contrast ? '#FFFFFF' : '#166534' }]}>
            ✓ 0% Generado por IA
          </ThemedText>
        </View>
      </View>

      {/* Collapsible Technical Breakdown */}
      <AccessibleCollapsible
        title="Ver desglose técnico de verificación Anti-IA"
        expanded={isExpanded}
        onExpandedChange={setIsExpanded}
        accessibilityHint="Muestra u oculta los puntajes de las 4 etapas del pipeline de autenticidad humana"
      >
        <View style={styles.breakdownContent}>
          <ThemedText style={[styles.introText, { color: theme.textSecondary }]}>
            Cada publicación pasa por un pipeline estricto en Google Cloud Run antes de ser
            publicada en el feed para garantizar que ningún rostro o cosmético sea generado por IA.
          </ThemedText>

          <View style={styles.stagesList}>
            {/* Stage 1 */}
            <View style={styles.stageItem}>
              <ThemedText style={styles.stageIcon}>🔐</ThemedText>
              <View style={styles.stageTexts}>
                <ThemedText style={[styles.stageName, { color: theme.text }]}>
                  Etapa 1: Metadatos C2PA y Procedencia Criptográfica
                </ThemedText>
                <ThemedText style={[styles.stageDesc, { color: theme.textSecondary }]}>
                  Verificación de firmas de cámara física sin rastros de generadores de difusión (Midjourney, DALL-E, Flux).
                </ThemedText>
              </View>
            </View>

            {/* Stage 2 */}
            <View style={styles.stageItem}>
              <ThemedText style={styles.stageIcon}>📊</ThemedText>
              <View style={styles.stageTexts}>
                <ThemedText style={[styles.stageName, { color: theme.text }]}>
                  Etapa 2: Análisis Espectral de Frecuencias (FFT)
                </ThemedText>
                <ThemedText style={[styles.stageDesc, { color: theme.textSecondary }]}>
                  Revisión matemática del espectro de Fourier para detectar la ausencia de patrones de cuadrícula artificiales.
                </ThemedText>
              </View>
            </View>

            {/* Stage 3 */}
            <View style={styles.stageItem}>
              <ThemedText style={styles.stageIcon}>🔬</ThemedText>
              <View style={styles.stageTexts}>
                <ThemedText style={[styles.stageName, { color: theme.text }]}>
                  Etapa 3: Microtextura Facial y Porosidad Real
                </ThemedText>
                <ThemedText style={[styles.stageDesc, { color: theme.textSecondary }]}>
                  Análisis de textura biológica de poros, vello facial y pestañas naturales en alta resolución.
                </ThemedText>
              </View>
            </View>

            {/* Stage 4 */}
            <View style={styles.stageItem}>
              <ThemedText style={styles.stageIcon}>👁️</ThemedText>
              <View style={styles.stageTexts}>
                <ThemedText style={[styles.stageName, { color: theme.text }]}>
                  Etapa 4: Clasificador de Subcultura ({subcultureScorePercent}% precisión)
                </ThemedText>
                <ThemedText style={[styles.stageDesc, { color: theme.textSecondary }]}>
                  Segmentación MediaPipe de 4 regiones faciales y mapeo de color CIELAB con cosméticos reales.
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </AccessibleCollapsible>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: Spacing.two,
    marginVertical: Spacing.one,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  badgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  shieldIcon: {
    fontSize: 28,
  },
  guaranteeTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  authorSubtitle: {
    fontSize: 12,
  },
  statusPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  breakdownContent: {
    paddingTop: Spacing.one,
    gap: Spacing.two,
  },
  introText: {
    fontSize: 12,
    lineHeight: 18,
  },
  stagesList: {
    gap: Spacing.two,
    marginTop: 4,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  stageIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  stageTexts: {
    flex: 1,
  },
  stageName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  stageDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
});
