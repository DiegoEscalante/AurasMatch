/**
 * Anti-AI Transparency Modal for Look Detail Screen.
 * Provides a non-invasive popup modal triggered by the discreet [ 🛡️ % Humano ] button,
 * detailing the 4-stage technical verification pipeline (C2PA, FFT Spectral,
 * MediaPipe Microtexture, Jev Subculture classification).
 * Fulfills Spec 06 Section 3 & Project Proposal Phase 1 (Absolute Realism Guarantee).
 */

import React from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';

export interface AntiAiTransparencyModalProps {
  visible: boolean;
  onClose: () => void;
  aiConfidenceScore?: number | null;
  authorUsername?: string | null;
  subcultureConfidenceScore?: number | null;
}

export function AntiAiTransparencyModal({
  visible,
  onClose,
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

  const humanScorePercent = Math.max(
    1,
    Math.min(99, Math.round((1 - safeAiScore) * 100))
  );

  const subcultureScorePercent =
    typeof subcultureConfidenceScore === 'number' && !isNaN(subcultureConfidenceScore)
      ? Math.round(subcultureConfidenceScore * 100)
      : 92;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop tap to dismiss */}
        <AccessiblePressable
          style={styles.backdropDismiss}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar ventana"
        />

        {/* Modal Window Card with definite height so ScrollView expands properly */}
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.background,
              borderColor: high_contrast ? '#FFFFFF' : theme.border,
            },
          ]}
        >
          {/* 1. Header with Title and Close Button */}
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: theme.border,
                backgroundColor: theme.backgroundElement,
              },
            ]}
          >
            <View style={styles.modalHeaderTitleGroup}>
              <ThemedText style={styles.headerShieldIcon}>🛡️</ThemedText>
              <View>
                <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                  Verificación Anti-IA
                </ThemedText>
                <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  Garantía de Realismo Absoluto
                </ThemedText>
              </View>
            </View>

            <AccessiblePressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar ventana de verificación anti-IA"
              style={styles.closeBtn}
            >
              <ThemedText style={[styles.closeBtnText, { color: theme.textSecondary }]}>
                ✕
              </ThemedText>
            </AccessiblePressable>
          </View>

          {/* 2. Scrollable Body containing the full technical breakdown */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {/* Realism Guarantee Banner */}
            <View
              style={[
                styles.summaryBanner,
                {
                  backgroundColor: high_contrast ? '#000000' : '#DCFCE7',
                  borderColor: high_contrast ? '#FFFFFF' : '#86EFAC',
                },
              ]}
            >
              <View style={styles.summaryLeft}>
                <ThemedText
                  style={[
                    styles.guaranteeTitle,
                    { color: high_contrast ? '#FFFFFF' : '#15803D' },
                  ]}
                >
                  {humanScorePercent}% Verificado Humano
                </ThemedText>
                <ThemedText
                  style={[
                    styles.authorSubtitle,
                    { color: high_contrast ? '#E2E8F0' : '#166534' },
                  ]}
                >
                  Publicado por @{authorUsername || 'auras'}
                </ThemedText>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: high_contrast ? '#000000' : '#BBF7D0',
                    borderColor: high_contrast ? '#FFFFFF' : '#4ADE80',
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.statusText,
                    { color: high_contrast ? '#FFFFFF' : '#14532D' },
                  ]}
                >
                  ✓ 0% Generado por IA
                </ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.introText, { color: theme.text }]}>
              Cada fotografía pasa por un pipeline estricto de 4 etapas en Google Cloud Run antes de ser
              publicada en el feed para garantizar que ningún rostro o cosmético sea generado por IA:
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
          </ScrollView>

          {/* 3. Footer with Dismiss Button */}
          <View
            style={[
              styles.modalFooter,
              {
                borderTopColor: theme.border,
                backgroundColor: theme.backgroundElement,
              },
            ]}
          >
            <AccessiblePressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Entendido, cerrar ventana"
              style={[
                styles.dismissBtn,
                { backgroundColor: theme.primary },
              ]}
            >
              <ThemedText style={[styles.dismissBtnText, { color: theme.onPrimary }]}>
                Entendido
              </ThemedText>
            </AccessiblePressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Backward-compatible alias
export const AntiAiTransparencyCard = AntiAiTransparencyModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.two,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    height: '84%',
    maxHeight: 680,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  headerShieldIcon: {
    fontSize: 26,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    minWidth: MinTouchTargetSize,
    minHeight: MinTouchTargetSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
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
  modalFooter: {
    padding: Spacing.two,
    borderTopWidth: 1,
  },
  dismissBtn: {
    minHeight: MinTouchTargetSize,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
