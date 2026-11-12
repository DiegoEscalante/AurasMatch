/**
 * Look Detail Screen (`src/app/look/[id].tsx`).
 * Pinterest-style detail screen with:
 * 1. Step-Zoom Accessible Photography (`StepZoomImage`)
 * 2. Accessible Action Bar (Like, Save, Share, TTS voice reading)
 * 3. Anti-AI Transparency Card with 4-stage breakdown
 * 4. Recommended cosmetic products grouped by facial region (`public.products`)
 * 5. Accessible Product Detail Popup Modal (Focus Trap, Escape, Mobile-First)
 * 6. Mini-Feed of similar looks
 * Fulfills Spec 06 & Project Proposal Phase 3.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContextualAuthPrompt } from '@/components/auth/contextual-auth-prompt';
import { AntiAiTransparencyModal } from '@/components/look/anti-ai-transparency-card';
import { CommentsSectionCollapsible } from '@/components/look/comments-section-collapsible';
import { ProductDetailModal } from '@/components/look/product-detail-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { ColorSwatchBadge } from '@/components/ui/color-swatch-badge';
import { StepZoomImage } from '@/components/ui/step-zoom-image';
import { VisualAlertBanner } from '@/components/ui/visual-alert-banner';
import { MaxContentWidth, MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useLookDetail } from '@/hooks/use-look-detail';
import { useTheme } from '@/hooks/use-theme';
import { resolveLookImageUrl } from '@/services/supabase';
import {
  FACIAL_REGIONS,
  FACIAL_REGION_LABELS,
  FacialRegionKey,
  LookRow,
  ProductRow,
} from '@/types/database';
import { triggerHapticFeedback } from '@/utils/a11y-feedback';

const REGION_ICONS: Record<FacialRegionKey, string> = {
  lips: '👄',
  brows: '✨',
  eyelids: '👁️',
  lash_line: '👁️‍🗨️',
};

export default function LookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { prefs } = useAccessibility();
  const high_contrast = prefs.high_contrast;

  const lookId = Array.isArray(id) ? id[0] : id || '';

  const {
    look,
    isLoading,
    errorMessage,
    actionErrorMessage,
    dismissActionError,
    isLiked,
    likeCount,
    isSaved,
    toggleLike,
    toggleSave,
    shareLook,
    isSpeaking,
    speakLookDescription,
    stopSpeakingLook,
    productsByRegion,
    selectedProduct,
    setSelectedProduct,
    similarLooks,
    comments,
    addComment,
    isAddingComment,
  } = useLookDetail(lookId);

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAntiAiModal, setShowAntiAiModal] = useState<boolean>(false);
  const [activeProductCtx, setActiveProductCtx] = useState<{
    product: ProductRow;
    regionKey: FacialRegionKey;
    regionLabel: string;
    detectedHex: string;
  } | null>(null);

  const handleBack = () => {
    triggerHapticFeedback('light');
    stopSpeakingLook();
    router.back();
  };

  const handleLikePress = async () => {
    const res = await toggleLike();
    if (res.requiresAuth) {
      setShowAuthModal(true);
    }
  };

  const handleSavePress = async () => {
    const res = await toggleSave();
    if (res.requiresAuth) {
      setShowAuthModal(true);
    }
  };

  const handleProductPress = (
    product: ProductRow,
    regionKey: FacialRegionKey,
    regionLabel: string,
    detectedHex: string
  ) => {
    triggerHapticFeedback('light');
    setActiveProductCtx({
      product,
      regionKey,
      regionLabel,
      detectedHex,
    });
  };

  const handleSimilarLookPress = (similarLook: LookRow) => {
    triggerHapticFeedback('light');
    stopSpeakingLook();
    router.push(`/look/${similarLook.id}` as any);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
          Cargando detalles de la publicación...
        </ThemedText>
      </ThemedView>
    );
  }

  if (errorMessage || !look) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={styles.errorIcon}>⚠️</ThemedText>
        <ThemedText style={[styles.errorTitle, { color: theme.text }]}>
          {errorMessage || 'Publicación no encontrada'}
        </ThemedText>
        <AccessiblePressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Volver al feed"
          style={[styles.backErrorBtn, { backgroundColor: theme.primary }]}
        >
          <ThemedText style={[styles.backErrorBtnText, { color: theme.onPrimary }]}>
            ← Volver al feed
          </ThemedText>
        </AccessiblePressable>
      </ThemedView>
    );
  }

  const subcultures = look.subculture || [];
  const regions = look.extracted_regions || {};
  const humanScorePercent = Math.max(
    1,
    Math.min(99, Math.round((1 - (look.ai_confidence_score ?? 0)) * 100))
  );

  return (
    <ThemedView style={[styles.mainContainer, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={[styles.contentLimiter, { maxWidth: MaxContentWidth }]}>
        {/* Sticky Top Header with Back button */}
        <View
          style={[
            styles.topHeader,
            {
              backgroundColor: theme.backgroundElement,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <AccessiblePressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Volver al feed principal"
            accessibilityHint="Regresa a la pantalla principal del feed en la misma posición"
            style={styles.backButton}
          >
            <ThemedText style={[styles.backButtonText, { color: theme.primary }]}>
              ← Volver
            </ThemedText>
          </AccessiblePressable>

          <ThemedText style={[styles.screenTitle, { color: theme.text }]} numberOfLines={1}>
            Look de @{look.author_username || 'auras'}
          </ThemedText>

          {/* Share icon button in header */}
          <AccessiblePressable
            onPress={shareLook}
            accessibilityRole="button"
            accessibilityLabel="Compartir esta publicación"
            style={styles.headerShareBtn}
          >
            <ThemedText style={styles.headerShareIcon}>↗️</ThemedText>
          </AccessiblePressable>
        </View>

        {/* Scrollable Look Body */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {/* 1. Step-Zoom Photography */}
          <View style={styles.imageCardWrapper}>
            <StepZoomImage
              uri={look.resolved_image_url || resolveLookImageUrl(look.image_path) || ''}
              height={400}
              altText={`Fotografía de maquillaje estilo ${subcultures.join(
                ', '
              )} de @${look.author_username || 'auras'}`}
            />
          </View>

          {actionErrorMessage ? (
            <VisualAlertBanner
              variant="error"
              title="Error al guardar cambio"
              message={actionErrorMessage}
              onDismiss={dismissActionError}
              style={{ marginBottom: Spacing.three }}
            />
          ) : null}

          {/* 2. Accessible Action Bar (Like, Save, Share, TTS Audio) */}
          <View
            style={[
              styles.actionBar,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: high_contrast ? theme.text : theme.border,
              },
            ]}
          >
            {/* Like Action */}
            <AccessiblePressable
              onPress={handleLikePress}
              accessibilityRole="button"
              accessibilityLabel={`Me gusta. ${likeCount} personas les gusta este look. ${isLiked ? 'Marcado como me gusta.' : 'No marcado.'
                }`}
              accessibilityHint="Toca para alternar me gusta. Requiere inicio de sesión."
              style={[
                styles.actionBtn,
                isLiked && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText style={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</ThemedText>
              <ThemedText
                style={[
                  styles.actionText,
                  { color: isLiked ? '#DC2626' : theme.text, fontWeight: 'bold' },
                ]}
              >
                {likeCount}
              </ThemedText>
            </AccessiblePressable>

            {/* Save Action */}
            <AccessiblePressable
              onPress={handleSavePress}
              accessibilityRole="button"
              accessibilityLabel={`Guardar look en tu perfil. ${isSaved ? 'Guardado actualmente.' : 'No guardado.'
                }`}
              accessibilityHint="Toca para guardar o quitar de tu colección."
              style={[
                styles.actionBtn,
                isSaved && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText style={styles.actionIcon}>{isSaved ? '🔖' : '📑'}</ThemedText>
              <ThemedText
                style={[
                  styles.actionText,
                  { color: isSaved ? theme.primary : theme.text, fontWeight: 'bold' },
                ]}
              >
                {isSaved ? 'Guardado' : 'Guardar'}
              </ThemedText>
            </AccessiblePressable>

            {/* TTS Audio Action */}
            <AccessiblePressable
              onPress={speakLookDescription}
              accessibilityRole="button"
              accessibilityLabel={`Lectura de audio en voz alta. ${isSpeaking ? 'Reproduciendo audio, toca para detener.' : 'Toca para escuchar descripción.'
                }`}
              accessibilityHint="Lee la descripción del look y los tonos de cosméticos detectados."
              style={[
                styles.actionBtn,
                isSpeaking && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText style={styles.actionIcon}>{isSpeaking ? '⏹️' : '🔊'}</ThemedText>
              <ThemedText
                style={[
                  styles.actionText,
                  { color: isSpeaking ? theme.primary : theme.text, fontWeight: 'bold' },
                ]}
              >
                {isSpeaking ? 'Detener' : 'Audio'}
              </ThemedText>
            </AccessiblePressable>

            {/* Share Action */}
            <AccessiblePressable
              onPress={shareLook}
              accessibilityRole="button"
              accessibilityLabel="Compartir publicación"
              style={styles.actionBtn}
            >
              <ThemedText style={styles.actionIcon}>↗️</ThemedText>
              <ThemedText style={[styles.actionText, { color: theme.text, fontWeight: 'bold' }]}>
                Compartir
              </ThemedText>
            </AccessiblePressable>
          </View>

          {/* 3. Subculture Tags */}
          <View style={styles.subcultureRow}>
            {subcultures.map((sub) => (
              <View
                key={sub}
                style={[
                  styles.subcultureBadge,
                  {
                    backgroundColor: theme.primary,
                    borderColor: high_contrast ? theme.text : 'transparent',
                  },
                ]}
              >
                <ThemedText style={[styles.subcultureBadgeText, { color: theme.onPrimary }]}>
                  {sub}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* 4. Creator Info & Look Description */}
          <View
            style={[
              styles.descriptionCard,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Creator Header with Discreet Anti-AI Verification Pill */}
            <View style={styles.authorHeaderRow}>
              <View style={styles.authorInfoGroup}>
                <ThemedText style={styles.authorAvatarBadge}>👤</ThemedText>
                <View>
                  <ThemedText style={[styles.authorUsername, { color: theme.text, fontWeight: 'bold' }]}>
                    @{look.author_username || 'auras'}
                  </ThemedText>
                  <ThemedText style={[styles.authorSubtitle, { color: theme.textSecondary }]}>
                    Creador de la publicación
                  </ThemedText>
                </View>
              </View>

              {/* Discreet button to open Anti-AI verification popup */}
              <AccessiblePressable
                onPress={() => setShowAntiAiModal(true)}
                accessibilityRole="button"
                accessibilityLabel={`Verificado ${humanScorePercent}% humano. Toca para ver reporte de autenticidad anti-IA.`}
                accessibilityHint="Abre una ventana con el análisis forense de la imagen"
                style={[
                  styles.antiAiButton,
                  {
                    backgroundColor: high_contrast ? '#000000' : '#DCFCE7',
                    borderColor: high_contrast ? '#FFFFFF' : '#86EFAC',
                  },
                ]}
              >
                <ThemedText style={styles.antiAiButtonIcon}>🛡️</ThemedText>
                <ThemedText
                  style={[
                    styles.antiAiButtonText,
                    { color: high_contrast ? '#FFFFFF' : '#166534', fontWeight: 'bold' },
                  ]}
                >
                  {humanScorePercent}% Humano
                </ThemedText>
              </AccessiblePressable>
            </View>

            {/* Description Body */}
            {look.description ? (
              <View style={styles.descBodyWrapper}>
                <ThemedText style={[styles.descTitle, { color: theme.textSecondary }]}>
                  Descripción del Look
                </ThemedText>
                <ThemedText style={[styles.descBody, { color: theme.text }]}>
                  {look.description}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {/* 6. Recommended Products by Facial Region */}
          <View style={styles.productsSection}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionHeading, { color: theme.text }]}>
                Cosméticos y Tonos por Región
              </ThemedText>
              <ThemedText style={[styles.sectionSubheading, { color: theme.textSecondary }]}>
                Toca cualquier producto para ver su marca, precio, tono y coordenadas CIELAB.
              </ThemedText>
            </View>

            {FACIAL_REGIONS.map((regionKey) => {
              const regionData = regions[regionKey];
              if (!regionData || !regionData.hex_value) return null;

              const regionLabel = FACIAL_REGION_LABELS[regionKey];
              const regionIcon = REGION_ICONS[regionKey];
              const prods = productsByRegion[regionKey] || [];

              return (
                <View
                  key={regionKey}
                  style={[
                    styles.regionCard,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: high_contrast ? theme.text : theme.border,
                    },
                  ]}
                >
                  {/* Region Header & Swatch */}
                  <View style={styles.regionHeader}>
                    <View style={styles.regionTitleGroup}>
                      <ThemedText style={styles.regionIcon}>{regionIcon}</ThemedText>
                      <ThemedText style={[styles.regionName, { color: theme.text }]}>
                        {regionLabel}
                      </ThemedText>
                    </View>

                    <ColorSwatchBadge
                      hexValue={regionData.hex_value}
                      regionLabel={regionLabel}
                    />
                  </View>

                  {/* Recommended Products for this zone */}
                  {prods.length > 0 ? (
                    <View style={styles.productsList}>
                      {prods.map((product) => (
                        <AccessiblePressable
                          key={product.id}
                          onPress={() =>
                            handleProductPress(
                              product,
                              regionKey,
                              regionLabel,
                              regionData.hex_value
                            )
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Cosmético: ${product.product_name} de ${product.brand || 'Auras'
                            }. Tono ${product.shade_name || ''}. Precio $${product.price_usd ? product.price_usd.toFixed(2) : ''
                            } USD. Toca para ver detalles completos.`}
                          accessibilityHint="Abre la ventana con especificaciones, imagen y coordenadas CIELAB del producto"
                          style={[
                            styles.productChip,
                            {
                              backgroundColor: theme.backgroundSelected,
                              borderColor: high_contrast ? theme.text : theme.border,
                            },
                          ]}
                        >
                          <View style={styles.productChipLeft}>
                            {product.resolved_image_url ? (
                              <Image
                                source={{ uri: product.resolved_image_url }}
                                style={styles.productThumb}
                                resizeMode="cover"
                              />
                            ) : (
                              <View
                                style={[
                                  styles.thumbPlaceholder,
                                  { backgroundColor: product.hex_value },
                                ]}
                              />
                            )}
                            <View style={styles.productInfo}>
                              <ThemedText
                                style={[styles.productBrand, { color: theme.primary }]}
                              >
                                {(product.brand || 'AurasMatch').toUpperCase()}
                              </ThemedText>
                              <ThemedText
                                style={[styles.productTitle, { color: theme.text }]}
                                numberOfLines={1}
                              >
                                {product.product_name}
                              </ThemedText>
                              <ThemedText
                                style={[styles.productShade, { color: theme.textSecondary }]}
                                numberOfLines={1}
                              >
                                {product.shade_name || 'Tono recomendado'}
                              </ThemedText>
                            </View>
                          </View>

                          <View style={styles.productChipRight}>
                            <ThemedText style={[styles.productPrice, { color: theme.text }]}>
                              {product.price_usd !== null
                                ? `$${product.price_usd.toFixed(2)}`
                                : ''}
                            </ThemedText>
                            <ThemedText style={[styles.viewDetailsText, { color: theme.primary }]}>
                              Detalles
                            </ThemedText>
                          </View>
                        </AccessiblePressable>
                      ))}
                    </View>
                  ) : (
                    <ThemedText style={[styles.noProductsText, { color: theme.textSecondary }]}>
                      Tono detectado por MediaPipe en {regionLabel.toLowerCase()}.
                    </ThemedText>
                  )}
                </View>
              );
            })}
          </View>

          {/* 7. Community Comments (WCAG 2.4.1 Bypass Blocks via AccessibleCollapsible) */}
          <View style={styles.commentsSection}>
            <CommentsSectionCollapsible
              comments={comments}
              onAddComment={addComment}
              isAddingComment={isAddingComment}
              onRequireAuth={() => setShowAuthModal(true)}
              defaultExpanded={false}
            />
          </View>

          {/* 8. Similar Looks Mini-Feed */}
          {similarLooks.length > 0 && (
            <View style={styles.similarSection}>
              <View style={styles.sectionHeader}>
                <ThemedText style={[styles.sectionHeading, { color: theme.text }]}>
                  Looks Similares Recomendados
                </ThemedText>
                <ThemedText style={[styles.sectionSubheading, { color: theme.textSecondary }]}>
                  Publicaciones 100% humanas con estilos y tonos afines
                </ThemedText>
              </View>

              <View style={styles.similarGrid}>
                {similarLooks.map((item) => (
                  <AccessiblePressable
                    key={item.id}
                    onPress={() => handleSimilarLookPress(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver look similar de estilo ${item.subculture.join(
                      ', '
                    )} por @${item.author_username || 'auras'}`}
                    style={[
                      styles.similarCard,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: high_contrast ? theme.text : theme.border,
                      },
                    ]}
                  >
                    <Image
                      source={{
                        uri: item.resolved_image_url || resolveLookImageUrl(item.image_path),
                      }}
                      style={styles.similarImage}
                      resizeMode="cover"
                    />
                    <View style={styles.similarMeta}>
                      <ThemedText
                        style={[styles.similarAuthor, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        @{item.author_username || 'auras'}
                      </ThemedText>
                      <ThemedText
                        style={[styles.similarSubculture, { color: theme.primary }]}
                        numberOfLines={1}
                      >
                        {item.subculture[0] || 'Look'}
                      </ThemedText>
                    </View>
                  </AccessiblePressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* 8. Product Detail Popup Modal */}
      <ProductDetailModal
        product={activeProductCtx?.product || null}
        regionKey={activeProductCtx?.regionKey}
        regionLabel={activeProductCtx?.regionLabel}
        detectedHex={activeProductCtx?.detectedHex}
        visible={Boolean(activeProductCtx)}
        onClose={() => setActiveProductCtx(null)}
      />

      {/* 9. Anti-AI Transparency Breakdown Modal */}
      <AntiAiTransparencyModal
        visible={showAntiAiModal}
        onClose={() => setShowAntiAiModal(false)}
        aiConfidenceScore={look.ai_confidence_score}
        authorUsername={look.author_username}
        subcultureConfidenceScore={look.subculture_confidence_score}
      />

      {/* 9. Contextual Auth Modal for Gradual Engagement */}
      <Modal
        visible={showAuthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.background,
                borderColor: high_contrast ? theme.border : theme.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                Inicia sesión para interactuar
              </ThemedText>
              <AccessiblePressable
                onPress={() => setShowAuthModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar aviso de inicio de sesión"
                style={styles.modalCloseBtn}
              >
                <ThemedText style={[styles.modalCloseText, { color: theme.textSecondary }]}>
                  ✕
                </ThemedText>
              </AccessiblePressable>
            </View>

            <ContextualAuthPrompt
              title="Guarda este look y comparte tu aprecio"
              description="Puedes seguir navegando y explorando cosméticos libremente sin cuenta, pero para guardar publicaciones y dar me gusta necesitas iniciar sesión o registrarte."
            />

            <AccessiblePressable
              onPress={() => setShowAuthModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Continuar explorando como invitado"
              style={[
                styles.continueGuestBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            >
              <ThemedText style={[styles.continueGuestText, { color: theme.text }]}>
                Continuar explorando como invitado
              </ThemedText>
            </AccessiblePressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  contentLimiter: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  loadingText: {
    fontSize: 14,
    marginTop: Spacing.two,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.one,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  backErrorBtn: {
    minHeight: MinTouchTargetSize,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backErrorBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backButton: {
    minHeight: MinTouchTargetSize,
    paddingHorizontal: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.one,
  },
  headerShareBtn: {
    minWidth: MinTouchTargetSize,
    minHeight: MinTouchTargetSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerShareIcon: {
    fontSize: 20,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.two,
    paddingBottom: Spacing.five * 2,
    gap: Spacing.two,
  },
  imageCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: MinTouchTargetSize,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 13,
  },
  subcultureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  subcultureBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  subcultureBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  descriptionCard: {
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
    gap: Spacing.two,
  },
  authorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.25)',
  },
  authorInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  authorAvatarBadge: {
    fontSize: 24,
  },
  authorUsername: {
    fontSize: 15,
  },
  authorSubtitle: {
    fontSize: 11,
  },
  antiAiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    minHeight: 34,
  },
  antiAiButtonIcon: {
    fontSize: 13,
  },
  antiAiButtonText: {
    fontSize: 12,
  },
  descBodyWrapper: {
    gap: 4,
  },
  descTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  productsSection: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  sectionHeader: {
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionSubheading: {
    fontSize: 12,
    marginTop: 2,
  },
  regionCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  regionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  regionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  regionIcon: {
    fontSize: 22,
  },
  regionName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productsList: {
    gap: Spacing.one,
  },
  productChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.one,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: MinTouchTargetSize,
  },
  productChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flex: 1,
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  thumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
  },
  productBrand: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  productShade: {
    fontSize: 11,
  },
  productChipRight: {
    alignItems: 'flex-end',
    marginLeft: Spacing.one,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '800',
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  noProductsText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  commentsSection: {
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  similarSection: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  similarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  similarCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  similarImage: {
    width: '100%',
    height: 140,
  },
  similarMeta: {
    padding: Spacing.one,
  },
  similarAuthor: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  similarSubculture: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.two,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    minWidth: MinTouchTargetSize,
    minHeight: MinTouchTargetSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  continueGuestBtn: {
    minHeight: MinTouchTargetSize,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  continueGuestText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
