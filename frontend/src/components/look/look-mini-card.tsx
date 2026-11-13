/**
 * Shared compact 2-column Look Mini Card (`LookMiniCard`).
 * Reused in User Profile collections (`profile.tsx`) and Look Detail similar looks (`look/[id].tsx`).
 * Displays cover photography with loading indicator, optional Anti-AI quarantine badge/appeal,
 * author handle, primary aesthetic subculture, and optional like counter.
 */

import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { resolveLookImageUrl } from '@/services/supabase';
import { isLookHumanApproved, LookRow } from '@/types/database';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';

export interface LookMiniCardProps {
  look: LookRow;
  onPress?: (look: LookRow) => void;
  onAppeal?: (lookId: string) => void;
  showLikeCount?: boolean;
  showAntiAiStatus?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function LookMiniCard({
  look,
  onPress,
  onAppeal,
  showLikeCount = false,
  showAntiAiStatus = false,
  accessibilityLabel,
  accessibilityHint = 'Toca para abrir los detalles completos del look',
}: LookMiniCardProps) {
  const theme = useTheme();
  const { prefs } = useAccessibility();
  const [miniLoading, setMiniLoading] = useState(true);

  const subcultureText =
    look.subculture.length > 0 ? look.subculture.join(', ') : 'Alternativo';
  const authorHandle = look.author_username || 'auras';
  const isHumanApproved = isLookHumanApproved(look.is_human_verified, look.ai_confidence_score);

  const handlePress = () => {
    if (onPress) {
      onPress(look);
      return;
    }
    triggerHapticFeedback('light');
    announceStatus(`Abriendo detalles de look de @${authorHandle}`);
    router.push(`/look/${look.id}` as any);
  };

  return (
    <AccessiblePressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel || `Ver publicación estilo ${subcultureText} por @${authorHandle}`
      }
      accessibilityHint={accessibilityHint}
      style={[
        styles.miniCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: prefs.high_contrast ? theme.text : theme.border,
        },
      ]}
    >
      <View style={styles.miniImageWrapper}>
        {miniLoading && (
          <View style={styles.miniLoadingOverlay}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        )}
        <Image
          source={{ uri: look.resolved_image_url || resolveLookImageUrl(look.image_path) }}
          contentFit="cover"
          style={styles.miniImage}
          onLoadStart={() => setMiniLoading(true)}
          onLoad={() => setMiniLoading(false)}
          onError={() => setMiniLoading(false)}
          accessibilityLabel={`Fotografía del look ${subcultureText}`}
        />
        {showAntiAiStatus && !isHumanApproved && (
          <View style={[styles.miniBadge, { backgroundColor: 'rgba(239, 68, 68, 0.92)' }]}>
            <ThemedText style={styles.miniBadgeText}>⚠️ Retenido Anti-IA</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.miniMeta}>
        <ThemedText style={[styles.miniAuthor, { color: theme.text }]} numberOfLines={1}>
          @{authorHandle}
        </ThemedText>
        <View style={styles.miniSubRow}>
          <ThemedText style={[styles.miniSubculture, { color: theme.primary }]} numberOfLines={1}>
            {look.subculture[0] || 'Look'}
          </ThemedText>
          {showLikeCount && (
            <ThemedText style={[styles.miniLikes, { color: theme.textSecondary }]}>
              ❤️ {look.liked_by?.length || 0}
            </ThemedText>
          )}
        </View>
      </View>

      {showAntiAiStatus && !isHumanApproved && onAppeal && (
        <View style={styles.miniAppealBox}>
          {look.appeal_status === 'pending' ? (
            <ThemedText style={[styles.miniAppealText, { color: theme.primary }]}>
              ⏳ En revisión
            </ThemedText>
          ) : (
            <AccessiblePressable
              accessibilityRole="button"
              accessibilityLabel="Solicitar apelación humana por sospecha de IA"
              hapticOnPress="medium"
              onPress={(e) => {
                e?.stopPropagation?.();
                onAppeal(look.id);
              }}
              style={[styles.miniAppealBtn, { backgroundColor: theme.warning }]}
            >
              <ThemedText style={styles.miniAppealBtnText}>Apelar</ThemedText>
            </AccessiblePressable>
          )}
        </View>
      )}
    </AccessiblePressable>
  );
}

const styles = StyleSheet.create({
  miniCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  miniImageWrapper: {
    width: '100%',
    height: 145,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  miniLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  miniImage: {
    width: '100%',
    height: '100%',
  },
  miniBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  miniMeta: {
    padding: Spacing.two,
    gap: 2,
  },
  miniAuthor: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniSubculture: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  miniLikes: {
    fontSize: 11,
    fontWeight: '500',
  },
  miniAppealBox: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },
  miniAppealBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAppealBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  miniAppealText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
