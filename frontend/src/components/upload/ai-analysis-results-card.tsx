import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { ColorSwatchBadge } from '@/components/ui/color-swatch-badge';
import { MinTouchTargetSize, Spacing } from '@/constants/theme';
import { LookAnalysisData } from '@/hooks/use-upload-look';
import { useTheme } from '@/hooks/use-theme';
import {
  AppealStatus,
  FACIAL_REGION_LABELS,
  FacialRegionKey,
  isLookHumanApproved,
} from '@/types/database';
import { formatAccessibleColorLabel, getSpanishColorName } from '@/utils/color-names';

interface AIAnalysisResultsCardProps {
  data: LookAnalysisData;
  appealStatus: AppealStatus;
  isAppealing: boolean;
  onSubmitAppeal: () => void;
}

const REGION_ORDER: FacialRegionKey[] = ['lips', 'eyelids', 'brows', 'lash_line'];

/**
 * AI Analysis Results Card (`ai-analysis-results-card.tsx`).
 * Displays classified aesthetic subculture, 3-stage Anti-AI verification badge,
 * human appeal option for false positives, and extracted facial tone swatches.
 * Accessible with WCAG 2.1/2.2 AA compliant contrast, labels, and hit areas.
 */
export function AIAnalysisResultsCard({
  data,
  appealStatus,
  isAppealing,
  onSubmitAppeal,
}: AIAnalysisResultsCardProps) {
  const theme = useTheme();

  const subcultureName = data.choice || data.subculture?.[0] || 'Clean Girl';
  const subcultureConfidence = Math.round((data.subculture_confidence_score || 0.9) * 100);
  const aiScorePct = Math.round((data.ai_confidence_score || 0) * 100);

  const isHuman = isLookHumanApproved(data.is_human_verified, data.ai_confidence_score);

  return (
    <ThemedView
      style={[
        styles.card,
        {
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
        },
      ]}
      accessible={true}
      accessibilityLabel={`Resultados de análisis de IA para estilo ${subcultureName}`}>
      {/* Subculture classification badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <ThemedText type="small" themeColor="textSecondary">
            Subcultura Estética Clasificada
          </ThemedText>
          <View style={styles.subculturePill}>
            <ThemedText type="subtitle">✨ {subcultureName}</ThemedText>
            <View
              style={[
                styles.confidenceBadge,
                { backgroundColor: theme.primary + '22' },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 12 }}>
                {subcultureConfidence}% afinidad
              </ThemedText>
            </View>
          </View>
        </View>

        {data.is_simulated && (
          <View
            style={[
              styles.simulationPill,
              { backgroundColor: theme.textSecondary + '20' },
            ]}>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
              Modo Prueba
            </ThemedText>
          </View>
        )}
      </View>

      {/* Anti-AI Hybrid Realism Status */}
      <View
        style={[
          styles.antiAIBanner,
          {
            backgroundColor: isHuman ? '#10B98118' : '#F59E0B18',
            borderColor: isHuman ? '#10B98155' : '#F59E0B55',
          },
        ]}>
        <View style={styles.antiAITextBlock}>
          <ThemedText
            type="default"
            style={{ fontWeight: '700', color: isHuman ? '#059669' : '#D97706' }}>
            {isHuman
              ? '🛡️ 100% Origen Humano Verificado'
              : '⚠️ Posible Imagen Sintética / IA'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isHuman
              ? `Aprobada por el motor Anti-IA (C2PA, FFT y microtextura). Confianza sintética: ${aiScorePct}%.`
              : `El motor detectó patrones sintéticos (Confianza IA: ${aiScorePct}%). Puedes apelar si es un falso positivo.`}
          </ThemedText>
        </View>

        {/* Human Appeal Button if rejected */}
        {!isHuman && (
          <View style={styles.appealActionContainer}>
            {appealStatus === 'none' && (
              <AccessiblePressable
                accessibilityLabel="Solicitar apelación de foto humana real"
                accessibilityHint="Envía tu fotografía a revisión manual por un moderador humano para desbloquear su publicación"
                disabled={isAppealing}
                onPress={onSubmitAppeal}
                style={[
                  styles.appealButton,
                  { backgroundColor: theme.primary },
                ]}>
                {isAppealing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText
                    type="small"
                    style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    Solicitar Apelación Humana
                  </ThemedText>
                )}
              </AccessiblePressable>
            )}

            {appealStatus === 'pending' && (
              <View style={[styles.statusPill, { backgroundColor: '#F59E0B25' }]}>
                <ThemedText type="small" style={{ color: '#D97706', fontWeight: '600' }}>
                  🕒 Apelación en revisión humana
                </ThemedText>
              </View>
            )}

            {appealStatus === 'approved' && (
              <View style={[styles.statusPill, { backgroundColor: '#10B98125' }]}>
                <ThemedText type="small" style={{ color: '#059669', fontWeight: '600' }}>
                  ✅ Apelación aprobada por moderación
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Extracted Facial Regions Grid */}
      <View style={styles.regionsContainer}>
        <ThemedText type="default" style={{ fontWeight: '700' }}>
          Paleta Facial Extraída (MediaPipe + CIELAB)
        </ThemedText>

        <View style={styles.regionsGrid}>
          {REGION_ORDER.map((regionKey) => {
            const detail = data.extracted_regions?.[regionKey];
            if (!detail || !detail.hex_value) return null;

            const regionLabel = FACIAL_REGION_LABELS[regionKey] || regionKey;
            const colorName = getSpanishColorName(detail.hex_value);
            const accessibleLabel = formatAccessibleColorLabel(detail.hex_value, regionLabel);
            const skuCount = detail.recommended_skus
              ? Object.keys(detail.recommended_skus).length
              : 0;

            return (
              <View
                key={regionKey}
                style={[
                  styles.regionCard,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
                accessible={true}
                accessibilityLabel={accessibleLabel}>
                <View style={styles.regionHeader}>
                  <ThemedText type="small" style={{ fontWeight: '600' }}>
                    {regionLabel}
                  </ThemedText>
                  <ColorSwatchBadge hexValue={detail.hex_value} showHexCode={false} />
                </View>

                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }} numberOfLines={1}>
                  {colorName}
                </ThemedText>

                <ThemedText type="code" style={{ fontWeight: '700' }}>
                  {detail.hex_value.toUpperCase()}
                </ThemedText>

                {skuCount > 0 && (
                  <ThemedText type="small" style={{ color: theme.primary, fontSize: 12, marginTop: Spacing.half }}>
                    {skuCount} {skuCount === 1 ? 'cosmético afín' : 'cosméticos afines'}
                  </ThemedText>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleGroup: {
    gap: Spacing.half,
  },
  subculturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  confidenceBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 9999,
  },
  simulationPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 9999,
  },
  antiAIBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  antiAITextBlock: {
    gap: Spacing.half,
  },
  appealActionContainer: {
    marginTop: Spacing.one,
  },
  appealButton: {
    minHeight: MinTouchTargetSize,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  regionsContainer: {
    gap: Spacing.two,
  },
  regionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  regionCard: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  regionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
