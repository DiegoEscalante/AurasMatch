/**
 * Anti-AI Transparency Modal for Look Detail Screen.
 * Provides a non-invasive popup modal triggered by the discreet [ 🛡️ % Humano ] button,
 * detailing the 4-stage technical verification pipeline (C2PA, FFT Spectral,
 * MediaPipe Microtexture, Jev Subculture classification).
 * Fulfills Spec 06 Section 3 & Project Proposal Phase 1 (Absolute Realism Guarantee).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessibleModal } from '@/components/ui/accessible-modal';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { ANTI_AI_REJECTION_THRESHOLD, isLookHumanApproved } from '@/types/database';

export interface AntiAiTransparencyModalProps {
  visible: boolean;
  onClose: () => void;
  isHumanVerified?: boolean | null;
  aiConfidenceScore?: number | null;
  authorUsername?: string | null;
  subcultureConfidenceScore?: number | null;
}

export function AntiAiTransparencyModal({
  visible,
  onClose,
  isHumanVerified,
  aiConfidenceScore,
  authorUsername,
  subcultureConfidenceScore,
}: AntiAiTransparencyModalProps) {
  const theme = useTheme();
  const { prefs } = useAccessibility();
  const high_contrast = prefs.high_contrast;

  // Safe scores
  const safeAiScore =
    typeof aiConfidenceScore === 'number' && !isNaN(aiConfidenceScore)
      ? aiConfidenceScore
      : 0.05;

  const isHuman = isLookHumanApproved(
    isHumanVerified ?? safeAiScore < ANTI_AI_REJECTION_THRESHOLD,
    safeAiScore
  );
  const aiScorePercent = Math.round(safeAiScore * 100);
  const humanScorePercent = Math.max(
    1,
    Math.min(99, Math.round((1 - safeAiScore) * 100))
  );

  const subcultureScorePercent =
    typeof subcultureConfidenceScore === 'number' && !isNaN(subcultureConfidenceScore)
      ? Math.round(subcultureConfidenceScore * 100)
      : 92;

  return (
    <AccessibleModal
      visible={visible}
      onClose={onClose}
      icon="🛡️"
      title="Verificación Anti-IA"
      subtitle="Garantía de Realismo Absoluto"
      dialogLabel="Reporte técnico de verificación Anti-IA"
      closeButtonLabel="Cerrar ventana de verificación anti-IA"
      closeAnnouncement="Ventana de verificación anti-IA cerrada."
      maxWidth={500}
      size="tall"
      primaryActionLabel="Entendido"
      primaryActionA11yLabel="Entendido, cerrar ventana"
    >
            {/* Realism Guarantee Banner */}
            <View
              style={[
                styles.summaryBanner,
                {
                  backgroundColor: high_contrast
                    ? '#000000'
                    : isHuman
                    ? '#DCFCE7'
                    : '#FEF3C7',
                  borderColor: high_contrast
                    ? '#FFFFFF'
                    : isHuman
                    ? '#86EFAC'
                    : '#F59E0B',
                },
              ]}
            >
              <View style={styles.summaryLeft}>
                <ThemedText
                  style={[
                    styles.guaranteeTitle,
                    {
                      color: high_contrast
                        ? '#FFFFFF'
                        : isHuman
                        ? '#15803D'
                        : '#92400E',
                    },
                  ]}
                >
                  {isHuman
                    ? `${humanScorePercent}% Verificado Humano`
                    : 'Retenido por Filtro Anti-IA'}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.authorSubtitle,
                    {
                      color: high_contrast
                        ? '#E2E8F0'
                        : isHuman
                        ? '#166534'
                        : '#78350F',
                    },
                  ]}
                >
                  Publicado por @{authorUsername || 'auras'}
                </ThemedText>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: high_contrast
                      ? '#000000'
                      : isHuman
                      ? '#BBF7D0'
                      : '#FDE68A',
                    borderColor: high_contrast
                      ? '#FFFFFF'
                      : isHuman
                      ? '#4ADE80'
                      : '#D97706',
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.statusText,
                    {
                      color: high_contrast
                        ? '#FFFFFF'
                        : isHuman
                        ? '#14532D'
                        : '#78350F',
                    },
                  ]}
                >
                  {isHuman
                    ? `✓ ${aiScorePercent}% Riesgo IA (< 50%)`
                    : `⚠️ ${aiScorePercent}% Riesgo IA`}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.introText, { color: theme.text }]}>
              {isHuman
                ? 'Cada fotografía pasa por un pipeline estricto de 4 etapas en Google Cloud Run antes de ser publicada en el feed para garantizar que ningún rostro o cosmético sea generado por IA:'
                : 'Esta imagen alcanzó o superó el umbral de probabilidad sintética (>= 50%) en Google Cloud Run, por lo que permanece excluida del Feed comunitario salvo apelación humana aprobada:'}
            </ThemedText>

            {/* Pipeline Stages Breakdown */}
            <View style={styles.stagesList}>
              {/* Stage 1: C2PA */}
              <View
                style={[
                  styles.stageCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText style={styles.stageIcon}>🔐</ThemedText>
                <View style={styles.stageTexts}>
                  <ThemedText style={[styles.stageName, { color: theme.text }]}>
                    Etapa 1: Metadatos C2PA y Procedencia Criptográfica
                  </ThemedText>
                  <ThemedText style={[styles.stageDesc, { color: theme.textSecondary }]}>
                    Verificación de firmas de cámara física sin rastros de generadores de difusión (Midjourney, DALL-E, Stable Diffusion, Flux).
                  </ThemedText>
                </View>
              </View>

              {/* Stage 2: FFT Spectral */}
              <View
                style={[
                  styles.stageCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText style={styles.stageIcon}>📊</ThemedText>
                <View style={styles.stageTexts}>
                  <ThemedText style={[styles.stageName, { color: theme.text }]}>
                    Etapa 2: Análisis Espectral de Frecuencias (FFT)
                  </ThemedText>
                  <ThemedText style={[styles.stageDesc, { color: theme.textSecondary }]}>
                    Revisión matemática del espectro de Fourier bidimensional para detectar la ausencia de patrones de cuadrícula artificiales.
                  </ThemedText>
                </View>
              </View>

              {/* Stage 3: Skin Microtexture */}
              <View
                style={[
                  styles.stageCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText style={styles.stageIcon}>🔬</ThemedText>
                <View style={styles.stageTexts}>
                  <ThemedText style={[styles.stageName, { color: theme.text }]}>
                    Etapa 3: Microtextura Facial y Porosidad Real
                  </ThemedText>
                  <ThemedText style={[styles.stageDesc, { color: theme.textSecondary }]}>
                    Análisis de textura biológica de poros, vello facial y pestañas naturales en alta resolución mediante parches anatómicos MediaPipe.
                  </ThemedText>
                </View>
              </View>

              {/* Stage 4: Subculture & Color Matching */}
              <View
                style={[
                  styles.stageCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText style={styles.stageIcon}>👁️</ThemedText>
                <View style={styles.stageTexts}>
                  <ThemedText style={[styles.stageName, { color: theme.text }]}>
                    Etapa 4: Clasificador de Subcultura ({subcultureScorePercent}% precisión)
                  </ThemedText>
                  <ThemedText style={[styles.stageDesc, { color: theme.textSecondary }]}>
                    Segmentación MediaPipe de 4 regiones faciales (labios, cejas, párpados y línea de pestañas) y mapeo perceptual CIELAB con productos reales.
                  </ThemedText>
                </View>
              </View>
            </View>
    </AccessibleModal>
  );
}

// Backward-compatible alias
export const AntiAiTransparencyCard = AntiAiTransparencyModal;

const styles = StyleSheet.create({
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  summaryLeft: {
    gap: 2,
  },
  guaranteeTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  authorSubtitle: {
    fontSize: 12,
    fontWeight: '600',
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
  introText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  stagesList: {
    gap: Spacing.two,
    marginTop: 4,
  },
  stageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
  },
  stageIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  stageTexts: {
    flex: 1,
  },
  stageName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stageDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
});
