/**
 * Floating Triple Filter Overlay Panel for AurasMatch Feed.
 * Appears on top of the feed without displacing or shifting the scroll position.
 * 
 * Dimensions:
 * 1. Aesthetic Subculture (Jirai Kei, Clean Girl, Goth, E-Girl, Y2K)
 * 2. Facial Region (lips, brows, eyelids, lash_line)
 * 3. Cosmetic Color Family (Strict perceptual CIELAB ΔE Spanish descriptive color matching)
 */

import React, { useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import {
  AESTHETIC_SUBCULTURES,
  AestheticSubculture,
  FACIAL_REGIONS,
  FACIAL_REGION_LABELS,
  FacialRegionKey,
} from '@/types/database';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';
import { COLOR_FAMILIES, ColorFamilyId } from '@/utils/color-names';

export interface TripleFilterDropdownProps {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  selectedSubculture: AestheticSubculture | null;
  onSelectSubculture: (subculture: AestheticSubculture | null) => void;
  selectedFacialZone: FacialRegionKey | null;
  onSelectFacialZone: (zone: FacialRegionKey | null) => void;
  selectedColorFamily: ColorFamilyId | null;
  onSelectColorFamily: (color: ColorFamilyId | null) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  totalMatches?: number;
}

export function TripleFilterDropdown({
  isExpanded,
  onExpandedChange,
  selectedSubculture,
  onSelectSubculture,
  selectedFacialZone,
  onSelectFacialZone,
  selectedColorFamily,
  onSelectColorFamily,
  activeFilterCount,
  onClearFilters,
  totalMatches,
}: TripleFilterDropdownProps) {
  const theme = useTheme();
  const { prefs } = useAccessibility();
  const high_contrast = prefs.high_contrast;

  // Allow closing with Escape key on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || !isExpanded || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onExpandedChange(false);
        announceStatus('Panel de filtros cerrado.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded, onExpandedChange]);

  if (!isExpanded) return null;

  const handleSubculturePress = (sub: AestheticSubculture) => {
    triggerHapticFeedback('light');
    if (selectedSubculture === sub) {
      onSelectSubculture(null);
      announceStatus(`Filtro de estilo ${sub} desactivado.`);
    } else {
      onSelectSubculture(sub);
      announceStatus(`Filtro de estilo ${sub} activado.`);
    }
  };

  const handleFacialZonePress = (zone: FacialRegionKey) => {
    triggerHapticFeedback('light');
    const label = FACIAL_REGION_LABELS[zone];
    if (selectedFacialZone === zone) {
      onSelectFacialZone(null);
      announceStatus(`Filtro de área ${label} desactivado.`);
    } else {
      onSelectFacialZone(zone);
      announceStatus(`Filtro de área ${label} activado.`);
    }
  };

  const handleColorFamilyPress = (familyId: ColorFamilyId, familyName: string) => {
    triggerHapticFeedback('light');
    if (selectedColorFamily === familyId) {
      onSelectColorFamily(null);
      announceStatus(`Filtro de color ${familyName} desactivado.`);
    } else {
      onSelectColorFamily(familyId);
      announceStatus(`Filtro de color ${familyName} activado.`);
    }
  };

  const handleClose = () => {
    triggerHapticFeedback('light');
    onExpandedChange(false);
    announceStatus('Filtros aplicados. Regresando al feed.');
  };

  return (
    <View
      style={[
        styles.overlayCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: high_contrast ? theme.text : theme.border,
        },
      ]}
      accessible={true}
      accessibilityLabel="Panel de filtros de búsqueda"
      {...(Platform.OS === 'web' ? { role: 'region' as const } : {})}
    >
      {/* Panel Header */}
      <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.titleGroup}>
          <ThemedText style={[styles.panelTitle, { color: theme.text }]}>
            Filtros de Búsqueda
          </ThemedText>
          {activeFilterCount > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: high_contrast ? '#000000' : theme.primary,
                  borderColor: high_contrast ? theme.text : 'transparent',
                },
              ]}
              accessible={false}
            >
              <ThemedText style={[styles.badgeText, { color: theme.onPrimary }]}>
                {activeFilterCount}
              </ThemedText>
            </View>
          )}
        </View>

        <AccessiblePressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar panel de filtros"
          accessibilityHint="Cierra el panel y regresa al feed de publicaciones"
          style={styles.closeBtn}
        >
          <ThemedText style={[styles.closeBtnText, { color: theme.textSecondary }]}>
            ✕
          </ThemedText>
        </AccessiblePressable>
      </View>

      {/* Scrollable Filter Dimensions */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Clear Filters Action Button — AT THE VERY START */}
        {activeFilterCount > 0 && (
          <View style={styles.clearRowTop}>
            <AccessiblePressable
              onPress={onClearFilters}
              accessibilityRole="button"
              accessibilityLabel="Quitar todos los filtros"
              accessibilityHint="Restablece la búsqueda para ver todas las publicaciones verificadas"
              style={[
                styles.clearButton,
                {
                  backgroundColor: theme.backgroundSelected,
                  borderColor: high_contrast ? theme.text : theme.primary,
                },
              ]}
            >
              <ThemedText style={[styles.clearButtonText, { color: theme.primary }]}>
                ✕ Quitar todos los filtros ({activeFilterCount})
              </ThemedText>
            </AccessiblePressable>
          </View>
        )}

        {/* Guidance Hint */}
        <View
          style={[
            styles.hintBox,
            {
              backgroundColor: theme.backgroundSelected,
              borderColor: theme.border,
            },
          ]}
          accessible={true}
        >
          <ThemedText style={[styles.hintText, { color: theme.textSecondary }]}>
            💡 <ThemedText style={{ fontWeight: 'bold' }}>Combinación Inteligente:</ThemedText> Si seleccionas un Área (ej. Labios) y un Color (ej. Rojo carmín), se buscará ese tono exacto en esa zona facial.
          </ThemedText>
        </View>

        {/* Dimension 1: Aesthetic Subculture */}
        <View style={styles.dimensionSection}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            1. Estilo / Subcultura
          </ThemedText>
          <View style={styles.chipRow}>
            {AESTHETIC_SUBCULTURES.map((sub) => {
              const isSelected = selectedSubculture === sub;
              return (
                <AccessiblePressable
                  key={sub}
                  onPress={() => handleSubculturePress(sub)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`Estilo ${sub}, ${isSelected ? 'seleccionado' : 'no seleccionado'}`}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.backgroundElement,
                      borderColor: isSelected
                        ? theme.text
                        : high_contrast
                        ? theme.border
                        : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? theme.onPrimary : theme.text,
                        fontWeight: isSelected ? 'bold' : 'normal',
                      },
                    ]}
                  >
                    {isSelected ? '✓ ' : ''}{sub}
                  </ThemedText>
                </AccessiblePressable>
              );
            })}
          </View>
        </View>

        {/* Dimension 2: Facial Region */}
        <View style={styles.dimensionSection}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            2. Área Facial / Categoría
          </ThemedText>
          <View style={styles.chipRow}>
            {FACIAL_REGIONS.map((zone) => {
              const isSelected = selectedFacialZone === zone;
              const label = FACIAL_REGION_LABELS[zone];
              return (
                <AccessiblePressable
                  key={zone}
                  onPress={() => handleFacialZonePress(zone)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`Área ${label}, ${isSelected ? 'seleccionada' : 'no seleccionada'}`}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.backgroundElement,
                      borderColor: isSelected
                        ? theme.text
                        : high_contrast
                        ? theme.border
                        : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? theme.onPrimary : theme.text,
                        fontWeight: isSelected ? 'bold' : 'normal',
                      },
                    ]}
                  >
                    {isSelected ? '✓ ' : ''}{label}
                  </ThemedText>
                </AccessiblePressable>
              );
            })}
          </View>
        </View>

        {/* Dimension 3: Color Family */}
        <View style={styles.dimensionSection}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            3. Color Cosmético (CIELAB ΔE)
          </ThemedText>
          <View style={styles.colorGrid}>
            {COLOR_FAMILIES.map((family) => {
              const isSelected = selectedColorFamily === family.id;
              return (
                <AccessiblePressable
                  key={family.id}
                  onPress={() => handleColorFamilyPress(family.id, family.name)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`Color ${family.name}, ${isSelected ? 'seleccionado' : 'no seleccionado'}`}
                  style={[
                    styles.colorCard,
                    {
                      backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement,
                      borderColor: isSelected
                        ? theme.primary
                        : high_contrast
                        ? theme.border
                        : theme.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    importantForAccessibility="no"
                    aria-hidden={true}
                    style={[
                      styles.colorCircle,
                      {
                        backgroundColor: family.sampleHex,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                  <ThemedText
                    style={[
                      styles.colorName,
                      {
                        color: isSelected ? theme.primary : theme.text,
                        fontWeight: isSelected ? 'bold' : 'normal',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {family.name}
                  </ThemedText>
                </AccessiblePressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Panel Footer: Apply Button */}
      <View style={[styles.panelFooter, { borderTopColor: theme.border }]}>
        <AccessiblePressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Aceptar filtros"
          accessibilityHint="Aplica los filtros seleccionados y vuelve al feed"
          style={[styles.applyButton, { backgroundColor: theme.primary }]}
        >
          <ThemedText style={[styles.applyButtonText, { color: theme.onPrimary }]}>
            Aceptar
          </ThemedText>
        </AccessiblePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 16,
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  closeBtn: {
    minWidth: MinTouchTargetSize,
    minHeight: MinTouchTargetSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollArea: {
    flexShrink: 1,
    maxHeight: 380,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  clearRowTop: {
    marginBottom: Spacing.two,
  },
  clearButton: {
    minHeight: MinTouchTargetSize,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  hintBox: {
    padding: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 17,
  },
  dimensionSection: {
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    minHeight: MinTouchTargetSize,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 9999,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  colorCard: {
    minHeight: MinTouchTargetSize,
    minWidth: '47%',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 8,
    gap: Spacing.one,
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  colorName: {
    fontSize: 12,
    flexShrink: 1,
  },
  panelFooter: {
    padding: Spacing.two,
    borderTopWidth: 1,
  },
  applyButton: {
    minHeight: MinTouchTargetSize,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
