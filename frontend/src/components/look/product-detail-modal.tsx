/**
 * Accessible Product Detail Modal Popup (`public.products`).
 * Opens when a user taps a recommended cosmetic SKU in the Look Detail screen.
 * Displays all product details both from outside the modal (facial region,
 * extracted look color, commercial shade, price, brand) and technical data (CIELAB coordinates,
 * Delta E match percentage, SKU identifier).
 * Fulfills Spec 06 Section 5 & 2ndPhaseProposal.pdf Section V.C.3.
 */

import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessibleModal } from '@/components/ui/accessible-modal';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import {
  COSMETIC_CATEGORY_SHORT_LABELS,
  CosmeticCategory,
  FACIAL_REGION_ICONS,
  FacialRegionKey,
  ProductRow,
} from '@/types/database';
import { announceStatus } from '@/utils/a11y-feedback';
import {
  computeDeltaE,
  formatAccessibleColorLabel,
  getSpanishColorName,
  hexToCielab,
} from '@/utils/color-names';

export interface ProductDetailModalProps {
  product: ProductRow | null;
  regionKey?: FacialRegionKey | null;
  regionLabel?: string | null;
  detectedHex?: string | null;
  visible: boolean;
  onClose: () => void;
}

export function ProductDetailModal({
  product,
  regionKey,
  regionLabel,
  detectedHex,
  visible,
  onClose,
}: ProductDetailModalProps) {
  const theme = useTheme();
  const { prefs } = useAccessibility();
  const high_contrast = prefs.high_contrast;

  // Announce modal opening for screen readers
  useEffect(() => {
    if (visible && product) {
      announceStatus(
        `Detalles de producto: ${product.product_name} de ${product.brand || 'marca cosmética'}.`
      );
    }
  }, [visible, product]);

  if (!product) return null;

  const categoryName =
    COSMETIC_CATEGORY_SHORT_LABELS[product.category as CosmeticCategory] ||
    product.category ||
    'Cosmético';

  const accessibleProductColor = formatAccessibleColorLabel(product.hex_value, categoryName);
  const accessibleDetectedColor = detectedHex
    ? formatAccessibleColorLabel(detectedHex, regionLabel || 'Zona facial')
    : null;

  const priceText =
    product.price_usd !== null && product.price_usd !== undefined
      ? `$${product.price_usd.toFixed(2)} USD`
      : 'Precio no disponible';

  // Calculate Delta E match percentage if detectedHex is provided
  let matchPercentage: number | null = null;
  if (detectedHex && product.hex_value) {
    const labDetected = hexToCielab(detectedHex);
    const labProduct: [number, number, number] = [
      product.cielab_l,
      product.cielab_a,
      product.cielab_b,
    ];
    if (labDetected) {
      const deltaE = computeDeltaE(labDetected, labProduct);
      matchPercentage = Math.max(50, Math.min(99, Math.round(100 - deltaE * 1.5)));
    }
  }

  const regionIcon = regionKey ? FACIAL_REGION_ICONS[regionKey] || '✨' : '✨';
  const displayRegionName = regionLabel || (regionKey ? regionKey.toUpperCase() : 'Zona Facial');

  return (
    <AccessibleModal
      visible={visible}
      onClose={onClose}
      eyebrow={(product.brand || 'AurasMatch').toUpperCase()}
      title={product.product_name}
      dialogLabel={`Detalles del cosmético: ${product.product_name}`}
      closeButtonLabel="Cerrar detalles del producto"
      closeButtonHint="Cierra esta ventana y regresa al detalle del look"
      closeAnnouncement="Diálogo de producto cerrado."
      backdropLabel="Cerrar ventana de detalles"
      maxWidth={500}
      size="tall"
      cardBackgroundColor={theme.backgroundElement}
      primaryActionLabel="Entendido"
      primaryActionA11yLabel="Entendido, cerrar detalles"
      scrollContentContainerStyle={styles.scrollContentOverride}
    >
            {/* 1. Facial Region Context Banner (What was previously only shown outside) */}
            <View
              style={[
                styles.regionBanner,
                {
                  backgroundColor: theme.backgroundSelected,
                  borderColor: high_contrast ? theme.text : theme.primary,
                },
              ]}
            >
              <ThemedText style={styles.regionBannerIcon}>{regionIcon}</ThemedText>
              <View style={styles.regionBannerTexts}>
                <ThemedText style={[styles.regionBannerTitle, { color: theme.primary }]}>
                  Recomendado para: {displayRegionName}
                </ThemedText>
                <ThemedText style={[styles.regionBannerDesc, { color: theme.textSecondary }]}>
                  Cosmético seleccionado para recrear el maquillaje de {displayRegionName.toLowerCase()} de esta publicación.
                </ThemedText>
              </View>
            </View>

            {/* 2. Product Official Image */}
            <View style={[styles.imageContainer, { backgroundColor: theme.backgroundSelected }]}>
              <Image
                source={{
                  uri:
                    product.resolved_image_url ||
                    product.image_url ||
                    'https://s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/048/original/open-uri20180708-4-13okqci?1531093614',
                }}
                style={styles.productImage}
                resizeMode="contain"
                accessibilityLabel={`Foto oficial de ${product.product_name}`}
              />
            </View>

            {/* 3. Category & Price Meta Row */}
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: theme.backgroundSelected,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText style={[styles.categoryText, { color: theme.text }]}>
                  {categoryName}
                </ThemedText>
              </View>

              <ThemedText style={[styles.priceText, { color: theme.primary }]}>
                {priceText}
              </ThemedText>
            </View>

            {/* 4. Color Comparison Card: Look Extracted Tone vs Product Tone */}
            <View
              style={[
                styles.comparisonCard,
                {
                  backgroundColor: theme.backgroundSelected,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Coincidencia Cromática Perceptual
              </ThemedText>

              <View style={styles.comparisonGrid}>
                {/* Detected in Face */}
                {detectedHex ? (
                  <View style={styles.comparisonColumn}>
                    <ThemedText style={[styles.comparisonColTitle, { color: theme.textSecondary }]}>
                      Detectado en el Rostro
                    </ThemedText>
                    <View style={styles.swatchInline}>
                      <View
                        style={[
                          styles.colorBoxSmall,
                          {
                            backgroundColor: detectedHex,
                            borderColor: high_contrast ? theme.text : theme.border,
                          },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.colColorName, { color: theme.text }]} numberOfLines={1}>
                          {getSpanishColorName(detectedHex)}
                        </ThemedText>
                        <ThemedText style={[styles.colHexCode, { color: theme.textSecondary }]}>
                          {detectedHex.toUpperCase()}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* Official Cosmetic Shade */}
                <View style={styles.comparisonColumn}>
                  <ThemedText style={[styles.comparisonColTitle, { color: theme.textSecondary }]}>
                    Tono del Cosmético
                  </ThemedText>
                  <View style={styles.swatchInline}>
                    <View
                      style={[
                        styles.colorBoxSmall,
                        {
                          backgroundColor: product.hex_value,
                          borderColor: high_contrast ? theme.text : theme.border,
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.colColorName, { color: theme.text }]} numberOfLines={1}>
                        {product.shade_name || getSpanishColorName(product.hex_value)}
                      </ThemedText>
                      <ThemedText style={[styles.colHexCode, { color: theme.textSecondary }]}>
                        {product.hex_value.toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>

              {/* Match Score Badge */}
              {matchPercentage !== null && (
                <View
                  style={[
                    styles.matchPill,
                    {
                      backgroundColor: high_contrast ? '#000000' : '#DCFCE7',
                      borderColor: high_contrast ? '#FFFFFF' : '#86EFAC',
                    },
                  ]}
                >
                  <ThemedText style={[styles.matchPillText, { color: high_contrast ? '#FFFFFF' : '#166534' }]}>
                    ✓ {matchPercentage}% Coincidencia Cromática con el Look
                  </ThemedText>
                </View>
              )}
            </View>

            {/* 5. Complete Technical Specifications Table */}
            <View
              style={[
                styles.specsTable,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Ficha Técnica del Cosmético
              </ThemedText>

              <View style={styles.specRow}>
                <ThemedText style={[styles.specLabel, { color: theme.textSecondary }]}>
                  Marca Oficial:
                </ThemedText>
                <ThemedText style={[styles.specValue, { color: theme.text }]}>
                  {(product.brand || 'AurasMatch').toUpperCase()}
                </ThemedText>
              </View>

              <View style={styles.specRow}>
                <ThemedText style={[styles.specLabel, { color: theme.textSecondary }]}>
                  Nombre del Producto:
                </ThemedText>
                <ThemedText style={[styles.specValue, { color: theme.text }]}>
                  {product.product_name}
                </ThemedText>
              </View>

              <View style={styles.specRow}>
                <ThemedText style={[styles.specLabel, { color: theme.textSecondary }]}>
                  Categoría Cosmética:
                </ThemedText>
                <ThemedText style={[styles.specValue, { color: theme.text }]}>
                  {categoryName}
                </ThemedText>
              </View>

              <View style={styles.specRow}>
                <ThemedText style={[styles.specLabel, { color: theme.textSecondary }]}>
                  Nombre del Tono:
                </ThemedText>
                <ThemedText style={[styles.specValue, { color: theme.text }]}>
                  {product.shade_name || 'Estándar'}
                </ThemedText>
              </View>

              <View style={styles.specRow}>
                <ThemedText style={[styles.specLabel, { color: theme.textSecondary }]}>
                  Código Hexadecimal:
                </ThemedText>
                <ThemedText style={[styles.specValue, { color: theme.primary, fontWeight: 'bold' }]}>
                  {product.hex_value.toUpperCase()}
                </ThemedText>
              </View>

              <View style={styles.specRow}>
                <ThemedText style={[styles.specLabel, { color: theme.textSecondary }]}>
                  Precio de Referencia:
                </ThemedText>
                <ThemedText style={[styles.specValue, { color: theme.text, fontWeight: 'bold' }]}>
                  {priceText}
                </ThemedText>
              </View>

              <View style={[styles.specRow, { borderBottomWidth: 0 }]}>
                <ThemedText style={[styles.specLabel, { color: theme.textSecondary }]}>
                  SKU en Base de Datos:
                </ThemedText>
                <ThemedText style={[styles.specValue, { color: theme.textSecondary }]}>
                  #{product.id}
                </ThemedText>
              </View>
            </View>

            {/* 6. Scientific CIELAB Metric Card */}
            <View
              style={[
                styles.cielabCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
              accessible={true}
              accessibilityLabel={`Coordenadas CIELAB: Luminancia ${product.cielab_l.toFixed(
                1
              )}, Eje A ${product.cielab_a.toFixed(1)}, Eje B ${product.cielab_b.toFixed(1)}`}
            >
              <ThemedText style={[styles.cielabTitle, { color: theme.text }]}>
                🔬 Espacio de Color Perceptual (CIELAB)
              </ThemedText>
              <ThemedText style={[styles.cielabExplanation, { color: theme.textSecondary }]}>
                Coordenadas científicas extraídas para verificar la exactitud de tono
                frente al tono del rostro del look.
              </ThemedText>

              <View style={styles.cielabValuesGrid}>
                <View style={styles.cielabValueItem}>
                  <ThemedText style={[styles.cielabLetter, { color: theme.primary }]}>
                    L*
                  </ThemedText>
                  <ThemedText style={[styles.cielabNumber, { color: theme.text }]}>
                    {product.cielab_l.toFixed(1)}
                  </ThemedText>
                  <ThemedText style={[styles.cielabDesc, { color: theme.textSecondary }]}>
                    Luminancia
                  </ThemedText>
                </View>

                <View style={styles.cielabValueItem}>
                  <ThemedText style={[styles.cielabLetter, { color: theme.primary }]}>
                    a*
                  </ThemedText>
                  <ThemedText style={[styles.cielabNumber, { color: theme.text }]}>
                    {product.cielab_a.toFixed(1)}
                  </ThemedText>
                  <ThemedText style={[styles.cielabDesc, { color: theme.textSecondary }]}>
                    Verde - Rojo
                  </ThemedText>
                </View>

                <View style={styles.cielabValueItem}>
                  <ThemedText style={[styles.cielabLetter, { color: theme.primary }]}>
                    b*
                  </ThemedText>
                  <ThemedText style={[styles.cielabNumber, { color: theme.text }]}>
                    {product.cielab_b.toFixed(1)}
                  </ThemedText>
                  <ThemedText style={[styles.cielabDesc, { color: theme.textSecondary }]}>
                    Azul - Amarillo
                  </ThemedText>
                </View>
              </View>
            </View>
    </AccessibleModal>
  );
}

const styles = StyleSheet.create({
  scrollContentOverride: {
    padding: Spacing.two,
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  regionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: Spacing.one,
  },
  regionBannerIcon: {
    fontSize: 26,
  },
  regionBannerTexts: {
    flex: 1,
  },
  regionBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  regionBannerDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  productImage: {
    width: '85%',
    height: '85%',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 17,
    fontWeight: '800',
  },
  comparisonCard: {
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
    gap: Spacing.one,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  comparisonColumn: {
    flex: 1,
    gap: 4,
  },
  comparisonColTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  swatchInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  colorBoxSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  colColorName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  colHexCode: {
    fontSize: 10,
  },
  matchPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    marginTop: Spacing.one,
  },
  matchPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  specsTable: {
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  specLabel: {
    fontSize: 12,
  },
  specValue: {
    fontSize: 12,
    maxWidth: '55%',
    textAlign: 'right',
  },
  cielabCard: {
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
    gap: Spacing.one,
  },
  cielabTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  cielabExplanation: {
    fontSize: 11,
    lineHeight: 16,
  },
  cielabValuesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.one,
    paddingTop: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  cielabValueItem: {
    alignItems: 'center',
  },
  cielabLetter: {
    fontSize: 14,
    fontWeight: '800',
  },
  cielabNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cielabDesc: {
    fontSize: 10,
  },
});
