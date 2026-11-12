/**
 * Pinterest-Style Community Look Card for AurasMatch Feed.
 * Features:
 * - 100% Human-verified Anti-AI badge (WCAG AAA green).
 * - Multi-subculture tag pills.
 * - Extracted facial region color swatches with descriptive CIELAB Spanish names.
 * - Multiplatform Text-to-Speech (TTS) audio description button.
 * - Like & Save buttons with haptic feedback and Gradual Engagement triggers.
 * - Native Screen Reader Accessibility Actions (activate, like, save, speak).
 */

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  AccessibilityActionEvent,
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { ColorSwatchBadge } from '@/components/ui/color-swatch-badge';
import { MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { FACIAL_REGION_LABELS, FacialRegionKey, LookRow } from '@/types/database';
import {
  announceStatus,
  speakDescription,
  stopSpeaking,
  triggerHapticFeedback,
} from '@/utils/a11y-feedback';

export interface LookCardProps {
  look: LookRow;
  onLike: (lookId: string) => Promise<{ requiresAuth: boolean }>;
  onSave: (lookId: string) => Promise<{ requiresAuth: boolean }>;
  onRequireAuth?: () => void;
  isSingleColumn?: boolean;
}

export function LookCard({
  look,
  onLike,
  onSave,
  onRequireAuth,
  isSingleColumn = false,
}: LookCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const { prefs } = useAccessibility();
  const high_contrast = prefs.high_contrast;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imageError, setImageError] = useState(false);

  const subcultureText =
    look.subculture.length > 0 ? look.subculture.join(', ') : 'Alternativo';

  const likeCount = look.liked_by.length;
  const isLiked = Boolean(look.is_liked_by_me);
  const isSaved = Boolean(look.is_saved_by_me);

  // Region swatches list
  const regionEntries = Object.entries(look.extracted_regions || {}) as [
    FacialRegionKey,
    { hex_value: string }
  ][];

  // Primary press / details interaction (Full screen detail will be activated in Phase 06)
  const handleOpenDetails = () => {
    triggerHapticFeedback('light');
    announceStatus(`Publicación de @${look.author_username || 'auras'}. ${subcultureText}.`);
  };

  // Toggle Like with gradual engagement check
  const handleLikePress = async () => {
    const res = await onLike(look.id);
    if (res.requiresAuth && onRequireAuth) {
      onRequireAuth();
    }
  };

  // Toggle Save with gradual engagement check
  const handleSavePress = async () => {
    const res = await onSave(look.id);
    if (res.requiresAuth && onRequireAuth) {
      onRequireAuth();
    }
  };

  // Toggle TTS Audio
  const handleToggleSpeak = async () => {
    triggerHapticFeedback('medium');
    if (isSpeaking) {
      await stopSpeaking();
      setIsSpeaking(false);
      announceStatus('Audio detenido.');
    } else {
      setIsSpeaking(true);
      const textToRead = `Look de estilo ${subcultureText}. ${look.description}. Verificado 100% humano.`;
      announceStatus('Iniciando lectura de audio del look.');
      await speakDescription(textToRead, {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  // Screen reader native accessibility actions
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    switch (event.nativeEvent.actionName) {
      case 'activate':
        handleOpenDetails();
        break;
      case 'like':
        handleLikePress();
        break;
      case 'save':
        handleSavePress();
        break;
      case 'speak':
        handleToggleSpeak();
        break;
    }
  };

  const fullA11yLabel = `Publicación de @${look.author_username || 'auras'}, estilo ${subcultureText}, verificado 100% humano. ${look.description}. ${likeCount} me gusta, ${isLiked ? 'te gusta' : 'no te gusta'}. ${isSaved ? 'guardado en tu perfil' : 'no guardado'}.`;

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: high_contrast ? theme.border : theme.border,
        },
      ]}
    >
      {/* Primary Pressable for image and text */}
      <AccessiblePressable
        onPress={handleOpenDetails}
        accessibilityRole="button"
        accessibilityLabel={fullA11yLabel}
        accessibilityHint="Toca para ver detalles completos y productos recomendados"
        accessibilityActions={[
          { name: 'activate', label: 'Ver detalles del look' },
          { name: 'like', label: isLiked ? 'Quitar me gusta' : 'Dar me gusta' },
          { name: 'save', label: isSaved ? 'Eliminar de guardados' : 'Guardar look' },
          { name: 'speak', label: isSpeaking ? 'Detener audio' : 'Escuchar descripción de audio' },
        ]}
        onAccessibilityAction={handleAccessibilityAction}
        style={styles.clickableHeader}
      >
        {/* Look Image with 100% Human Verification Badge */}
        <View style={styles.imageWrapper}>
          <Image
            source={{
              uri: imageError
                ? 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'
                : look.resolved_image_url || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
            }}
            style={[
              styles.image,
              {
                height: isSingleColumn ? 260 : 190,
              },
            ]}
            resizeMode="cover"
            onError={() => setImageError(true)}
            accessible={true}
            accessibilityLabel={`Foto del look estilo ${subcultureText}`}
          />

          {/* 100% Human Verified Badge (Anti-AI Pillar) */}
          <View
            style={[
              styles.verifiedBadge,
              {
                backgroundColor: high_contrast ? '#000000' : '#14532D',
                borderColor: high_contrast ? '#FFFFFF' : '#22C55E',
              },
            ]}
            accessible={false}
          >
            <ThemedText
              style={[
                styles.verifiedText,
                { color: high_contrast ? '#FFFFFF' : '#86EFAC' },
              ]}
            >
              ✓ 100% Humano
            </ThemedText>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.cardBody}>
          {/* Subculture Pill & Author */}
          <View style={styles.subcultureRow}>
            <View
              style={[
                styles.subculturePill,
                {
                  backgroundColor: theme.backgroundSelected,
                  borderColor: high_contrast ? theme.border : 'transparent',
                },
              ]}
            >
              <ThemedText
                style={[styles.subcultureText, { color: theme.primary }]}
                numberOfLines={1}
              >
                {subcultureText}
              </ThemedText>
            </View>

            <ThemedText
              style={[styles.authorText, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              @{look.author_username || 'auras'}
            </ThemedText>
          </View>

          {/* Extracted Swatches preview */}
          {regionEntries.length > 0 && (
            <View style={styles.swatchRow} accessible={false}>
              {regionEntries.slice(0, 4).map(([zone, detail]) => (
                <View key={zone} style={styles.swatchItem}>
                  <ColorSwatchBadge
                    hexValue={detail.hex_value}
                    regionLabel={FACIAL_REGION_LABELS[zone] || zone}
                    showHexCode={false}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Description */}
          <ThemedText
            style={[styles.descriptionText, { color: theme.text }]}
            numberOfLines={isSingleColumn ? 3 : 2}
          >
            {look.description}
          </ThemedText>
        </View>
      </AccessiblePressable>

      {/* Action Buttons Bar */}
      <View
        style={[
          styles.actionsBar,
          {
            borderTopColor: theme.border,
          },
        ]}
      >
        {/* Like Button */}
        <AccessiblePressable
          onPress={handleLikePress}
          accessibilityRole="button"
          accessibilityLabel={`${isLiked ? 'Quitar me gusta' : 'Dar me gusta'}, ${likeCount} me gusta`}
          accessibilityHint="Actualiza el contador de me gusta de este look"
          style={styles.actionButton}
        >
          <ThemedText
            style={[
              styles.actionIcon,
              { color: isLiked ? '#DC2626' : theme.textSecondary },
            ]}
          >
            {isLiked ? '♥' : '♡'}
          </ThemedText>
          <ThemedText
            style={[
              styles.actionLabel,
              { color: isLiked ? '#DC2626' : theme.textSecondary },
            ]}
          >
            {likeCount}
          </ThemedText>
        </AccessiblePressable>

        {/* Save Button */}
        <AccessiblePressable
          onPress={handleSavePress}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Eliminar de guardados' : 'Guardar publicación'}
          accessibilityHint="Añade esta publicación a tu colección en la pestaña Usuario"
          style={styles.actionButton}
        >
          <ThemedText
            style={[
              styles.actionIcon,
              { color: isSaved ? theme.primary : theme.textSecondary },
            ]}
          >
            {isSaved ? '★' : '☆'}
          </ThemedText>
          <ThemedText
            style={[
              styles.actionLabel,
              { color: isSaved ? theme.primary : theme.textSecondary },
            ]}
          >
            {isSaved ? 'Guardado' : 'Guardar'}
          </ThemedText>
        </AccessiblePressable>

        {/* TTS Audio Button */}
        <AccessiblePressable
          onPress={handleToggleSpeak}
          accessibilityRole="button"
          accessibilityLabel={isSpeaking ? 'Detener lectura' : 'Escuchar descripción por voz'}
          accessibilityHint="Lee en voz alta los detalles del look con síntesis de voz accesible"
          style={[
            styles.actionButton,
            isSpeaking && {
              backgroundColor: theme.backgroundSelected,
              borderRadius: 8,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.actionIcon,
              { color: isSpeaking ? theme.primary : theme.textSecondary },
            ]}
          >
            {isSpeaking ? '⏹' : '🔊'}
          </ThemedText>
          <ThemedText
            style={[
              styles.actionLabel,
              { color: isSpeaking ? theme.primary : theme.textSecondary },
            ]}
          >
            {isSpeaking ? 'Pausar' : 'Voz'}
          </ThemedText>
        </AccessiblePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  clickableHeader: {
    padding: 0,
    borderRadius: 0,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#000000',
  },
  image: {
    width: '100%',
    backgroundColor: '#1E293B',
  },
  verifiedBadge: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardBody: {
    padding: Spacing.two,
  },
  subcultureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  subculturePill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    maxWidth: '65%',
  },
  subcultureText: {
    fontSize: 11,
    fontWeight: '700',
  },
  authorText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginVertical: Spacing.one,
  },
  swatchItem: {
    marginRight: Spacing.one,
    marginBottom: Spacing.half,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.one,
    paddingVertical: 4,
  },
  actionButton: {
    minHeight: MinTouchTargetSize,
    minWidth: MinTouchTargetSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
    gap: 4,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
