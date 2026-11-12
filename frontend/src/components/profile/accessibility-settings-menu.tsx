import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { AccessibleCollapsible } from '@/components/ui/collapsible';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';

export interface AccessibilitySettingsMenuProps {
  defaultExpanded?: boolean;
}

/**
 * Reusable Accessible Collapsible Menu for all Accessibility Preferences.
 * Fulfills:
 * - WCAG 2.4.1 (Bypass Blocks): Keyboard/screen-reader users can skip all controls with one Tab/swipe
 *   if they only want to reach their profile collections below.
 * - 2ndPhaseProposal.pdf: High Contrast AAA, Dyslexia Fonts (Sans-Serif & Monospace),
 *   Text Scaling up to 200%, and Reduced Motion.
 */
export function AccessibilitySettingsMenu({
  defaultExpanded = false,
}: AccessibilitySettingsMenuProps) {
  const theme = useTheme();
  const { prefs, updateAccessibilityPrefs, resetAccessibilityPrefs } = useAccessibility();

  const activeThemeLabel =
    prefs.theme_mode === 'high_contrast'
      ? 'Alto Contraste (AAA)'
      : prefs.theme_mode === 'dark'
        ? 'Oscuro'
        : prefs.theme_mode === 'light'
          ? 'Claro'
          : 'Sistema';

  return (
    <AccessibleCollapsible
      title="Opciones de Accesibilidad"
      subtitle={`Tema: ${activeThemeLabel} • Escala: ${Math.round(prefs.font_scale * 100)}%`}
      defaultExpanded={defaultExpanded}>
      <View style={styles.sectionGroup}>
        {/* 1. Tema y Contraste */}
        <View style={styles.controlBlock}>
          <ThemedText type="smallBold">
            1. Tema Visual y Modo de Alto Contraste (WCAG AA / AAA):
          </ThemedText>
          <View style={styles.rowWrap}>
            {(
              [
                { key: 'system', label: 'Sistema' },
                { key: 'light', label: 'Claro (AA)' },
                { key: 'dark', label: 'Oscuro (AA)' },
                { key: 'high_contrast', label: 'Alto Contraste (AAA)' },
              ] as const
            ).map((item) => {
              const selected = prefs.theme_mode === item.key;
              return (
                <AccessiblePressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Modo de tema: ${item.label}`}
                  accessibilityState={{ selected }}
                  onPress={() => updateAccessibilityPrefs({ theme_mode: item.key })}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? theme.primary : theme.background,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={selected ? { color: theme.onPrimary } : undefined}>
                    {item.label}
                  </ThemedText>
                </AccessiblePressable>
              );
            })}
          </View>
        </View>

        {/* 2. Escalado de Texto */}
        <View style={styles.controlBlock}>
          <ThemedText type="smallBold">
            2. Tamaño de Texto Escalable sin Recorte (100% a 200%):
          </ThemedText>
          <View style={styles.rowWrap}>
            {[1.0, 1.25, 1.5, 1.75, 2.0].map((scale) => {
              const selected = prefs.font_scale === scale;
              const pct = Math.round(scale * 100);
              return (
                <AccessiblePressable
                  key={scale}
                  accessibilityRole="button"
                  accessibilityLabel={`Escalar texto al ${pct} por ciento`}
                  accessibilityState={{ selected }}
                  onPress={() => updateAccessibilityPrefs({ font_scale: scale })}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? theme.primary : theme.background,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={selected ? { color: theme.onPrimary } : undefined}>
                    {pct}%
                  </ThemedText>
                </AccessiblePressable>
              );
            })}
          </View>
        </View>

        {/* 3. Fuentes para Dislexia */}
        <View style={styles.controlBlock}>
          <ThemedText type="smallBold">
            3. Tipografía Apta para Dislexia:
          </ThemedText>
          <View style={styles.rowWrap}>
            {(
              [
                { key: 'default', label: 'Estándar' },
                { key: 'sans_dyslexia', label: 'Sans-Serif Legible (Verdana/Arial)' },
                { key: 'mono_dyslexia', label: 'Monoespaciada (Courier)' },
              ] as const
            ).map((fontOpt) => {
              const selected = prefs.font_family_variant === fontOpt.key;
              return (
                <AccessiblePressable
                  key={fontOpt.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Fuente tipográfica: ${fontOpt.label}`}
                  accessibilityState={{ selected }}
                  onPress={() =>
                    updateAccessibilityPrefs({
                      dyslexia_font: fontOpt.key !== 'default',
                      font_family_variant: fontOpt.key,
                    })
                  }
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? theme.primary : theme.background,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={selected ? { color: theme.onPrimary } : undefined}>
                    {fontOpt.label}
                  </ThemedText>
                </AccessiblePressable>
              );
            })}
          </View>
        </View>

        {/* 4. Reducción de Movimiento y Restablecer */}
        <View style={styles.controlBlock}>
          <ThemedText type="smallBold">
            4. Prevención de Fotosensibilidad y Animaciones:
          </ThemedText>
          <View style={styles.rowWrap}>
            <AccessiblePressable
              accessibilityRole="switch"
              accessibilityLabel="Reducir movimiento y desactivar animaciones"
              accessibilityState={{ checked: prefs.reduced_motion, selected: prefs.reduced_motion }}
              onPress={() =>
                updateAccessibilityPrefs({ reduced_motion: !prefs.reduced_motion })
              }
              style={[
                styles.optionChip,
                {
                  backgroundColor: prefs.reduced_motion ? theme.primary : theme.background,
                  borderColor: theme.border,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={prefs.reduced_motion ? { color: theme.onPrimary } : undefined}>
                {prefs.reduced_motion
                  ? 'Reducir Animaciones: ACTIVADO'
                  : 'Reducir Animaciones: DESACTIVADO'}
              </ThemedText>
            </AccessiblePressable>

            <AccessiblePressable
              accessibilityRole="button"
              accessibilityLabel="Restablecer opciones de accesibilidad a sus valores originales"
              onPress={() => void resetAccessibilityPrefs()}
              style={[
                styles.optionChip,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}>
              <ThemedText type="small">Restablecer ajustes</ThemedText>
            </AccessiblePressable>
          </View>
        </View>
      </View>
    </AccessibleCollapsible>
  );
}

const styles = StyleSheet.create({
  sectionGroup: {
    gap: Spacing.three,
  },
  controlBlock: {
    gap: Spacing.two,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    alignItems: 'center',
  },
});

