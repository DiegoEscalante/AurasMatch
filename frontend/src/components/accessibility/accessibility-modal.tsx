/**
 * Accessibility Modal Dialog for AurasMatch.
 * Fulfills W3C WAI-ARIA 1.2 "Modal Dialog" (`role="dialog"`, `aria-modal="true"`).
 *
 * Provides quick access to all universal accessibility settings:
 * 1. Visual Theme & AAA High Contrast (WCAG 1.4.3 & 1.4.6).
 * 2. Scalable Typography up to 200% without layout breakage (WCAG 1.4.4 Resize Text).
 * 3. Dyslexia-friendly typography (Sans-Serif & Monospaced).
 * 4. Photosensitivity & Reduced Motion prevention (WCAG 2.3.3 Animation from Interactions).
 * 5. Motor Diversity Voice & Touch Assistant bar (WCAG 2.5.3 Label in Name).
 *
 * Automatically persists to `public.profiles.accessibility_prefs` JSONB column in Supabase
 * when an authenticated session is active.
 */

import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { MaxContentWidth, MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { syncAccessibilityPrefsToProfile } from '@/services/supabase';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';

export interface AccessibilityModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AccessibilityModal({ visible, onClose }: AccessibilityModalProps) {
  const theme = useTheme();
  const { prefs, updateAccessibilityPrefs, resetAccessibilityPrefs } = useAccessibility();
  const { user, profile, isAuthenticated } = useAuth();
  const high_contrast = prefs.high_contrast;

  const activeUserId = profile?.id || user?.id;

  const handleUpdate = async (partial: Parameters<typeof updateAccessibilityPrefs>[0]) => {
    triggerHapticFeedback('light');
    await updateAccessibilityPrefs(partial);
    if (activeUserId && !activeUserId.startsWith('demo-')) {
      const nextPrefs = { ...prefs, ...partial };
      void syncAccessibilityPrefsToProfile(activeUserId, nextPrefs);
    }
  };

  const handleReset = async () => {
    triggerHapticFeedback('medium');
    await resetAccessibilityPrefs();
    announceStatus('Opciones de accesibilidad restablecidas a los valores por defecto.');
    if (activeUserId && !activeUserId.startsWith('demo-')) {
      void syncAccessibilityPrefsToProfile(activeUserId, {
        theme_mode: 'system',
        high_contrast: false,
        dyslexia_font: false,
        font_family_variant: 'default',
        font_scale: 1.0,
        reduced_motion: false,
        assistive_voice_bar: false,
      });
    }
  };

  const handleClose = () => {
    triggerHapticFeedback('light');
    announceStatus('Menú modal de accesibilidad cerrado.');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop tap to dismiss */}
        <AccessiblePressable
          style={styles.backdropDismiss}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú de accesibilidad"
          accessibilityHint="Cierra esta ventana superpuesta y regresa a la pantalla principal"
        />

        {/* Modal Window Dialog */}
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.background,
              borderColor: high_contrast ? '#FFFFFF' : theme.border,
              maxWidth: MaxContentWidth,
            },
          ]}
          accessible={true}
          accessibilityRole="none"
          accessibilityLabel="Diálogo Modal de Accesibilidad"
        >
          {/* Header */}
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
              <ThemedText style={styles.headerIcon}>♿</ThemedText>
              <View>
                <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                  Accesibilidad Universal
                </ThemedText>
                <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  Estándar W3C WAI-ARIA • Diálogo Modal
                </ThemedText>
              </View>
            </View>

            <AccessiblePressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar diálogo de accesibilidad"
              style={styles.closeBtn}
            >
              <ThemedText style={[styles.closeBtnText, { color: theme.textSecondary }]}>
                ✕
              </ThemedText>
            </AccessiblePressable>
          </View>

          {/* Database Persistence Status Badge */}
          <View
            style={[
              styles.syncStatusBanner,
              {
                backgroundColor: isAuthenticated
                  ? high_contrast
                    ? '#000000'
                    : '#DCFCE7'
                  : high_contrast
                    ? '#000000'
                    : theme.backgroundElement,
                borderColor: isAuthenticated
                  ? high_contrast
                    ? '#FFFFFF'
                    : '#86EFAC'
                  : theme.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.syncStatusText,
                {
                  color: isAuthenticated
                    ? high_contrast
                      ? '#FFFFFF'
                      : '#166534'
                    : theme.textSecondary,
                },
              ]}
            >
              {isAuthenticated && profile
                ? `✓ Sincronizado en la nube para @${profile.username} (Supabase)`
                : '💾 Guardado localmente en este dispositivo'}
            </ThemedText>
          </View>

          {/* Scrollable Settings Body */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {/* 1. Tema y Alto Contraste */}
            <View style={styles.controlSection}>
              <ThemedText type="smallBold" style={{ color: theme.text, marginBottom: 6 }}>
                1. Modo Visual y Contraste (WCAG AA / AAA):
              </ThemedText>
              <View style={styles.chipsRow}>
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
                      accessibilityLabel={`Tema visual ${item.label}`}
                      accessibilityState={{ selected }}
                      onPress={() => handleUpdate({ theme_mode: item.key })}
                      style={[
                        styles.chipOption,
                        {
                          backgroundColor: selected ? theme.primary : theme.backgroundElement,
                          borderColor: high_contrast ? '#FFFFFF' : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={selected ? { color: theme.onPrimary } : { color: theme.text }}
                      >
                        {item.label}
                      </ThemedText>
                    </AccessiblePressable>
                  );
                })}
              </View>
            </View>

            {/* 2. Escalado de Texto */}
            <View style={styles.controlSection}>
              <ThemedText type="smallBold" style={{ color: theme.text, marginBottom: 6 }}>
                2. Tamaño de Texto sin Recorte (100% a 200%):
              </ThemedText>
              <View style={styles.chipsRow}>
                {[1.0, 1.25, 1.5, 1.75, 2.0].map((scale) => {
                  const selected = prefs.font_scale === scale;
                  const pct = Math.round(scale * 100);
                  return (
                    <AccessiblePressable
                      key={scale}
                      accessibilityRole="button"
                      accessibilityLabel={`Escalar tamaño de letra al ${pct} por ciento`}
                      accessibilityState={{ selected }}
                      onPress={() => handleUpdate({ font_scale: scale })}
                      style={[
                        styles.chipOption,
                        {
                          backgroundColor: selected ? theme.primary : theme.backgroundElement,
                          borderColor: high_contrast ? '#FFFFFF' : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={selected ? { color: theme.onPrimary } : { color: theme.text }}
                      >
                        {pct}%
                      </ThemedText>
                    </AccessiblePressable>
                  );
                })}
              </View>
            </View>

            {/* 3. Tipografía para Dislexia */}
            <View style={styles.controlSection}>
              <ThemedText type="smallBold" style={{ color: theme.text, marginBottom: 6 }}>
                3. Tipografía Especial Apta para Dislexia:
              </ThemedText>
              <View style={styles.chipsRow}>
                {(
                  [
                    { key: 'default', label: 'Estándar' },
                    { key: 'sans_dyslexia', label: 'Sans-Serif (Arial/Verdana)' },
                    { key: 'mono_dyslexia', label: 'Monoespaciada (Courier)' },
                  ] as const
                ).map((fontOpt) => {
                  const selected = prefs.font_family_variant === fontOpt.key;
                  return (
                    <AccessiblePressable
                      key={fontOpt.key}
                      accessibilityRole="button"
                      accessibilityLabel={`Tipografía ${fontOpt.label}`}
                      accessibilityState={{ selected }}
                      onPress={() =>
                        handleUpdate({
                          dyslexia_font: fontOpt.key !== 'default',
                          font_family_variant: fontOpt.key,
                        })
                      }
                      style={[
                        styles.chipOption,
                        {
                          backgroundColor: selected ? theme.primary : theme.backgroundElement,
                          borderColor: high_contrast ? '#FFFFFF' : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={selected ? { color: theme.onPrimary } : { color: theme.text }}
                      >
                        {fontOpt.label}
                      </ThemedText>
                    </AccessiblePressable>
                  );
                })}
              </View>
            </View>

            {/* 4. Reducción de Movimiento */}
            <View style={styles.controlSection}>
              <ThemedText type="smallBold" style={{ color: theme.text, marginBottom: 6 }}>
                4. Fotosensibilidad y Animaciones (WCAG 2.3.3):
              </ThemedText>
              <AccessiblePressable
                accessibilityRole="switch"
                accessibilityLabel="Reducción de movimiento"
                accessibilityState={{ checked: prefs.reduced_motion }}
                onPress={() => handleUpdate({ reduced_motion: !prefs.reduced_motion })}
                style={[
                  styles.toggleCard,
                  {
                    backgroundColor: prefs.reduced_motion
                      ? theme.primary
                      : theme.backgroundElement,
                    borderColor: high_contrast ? '#FFFFFF' : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={prefs.reduced_motion ? { color: theme.onPrimary } : { color: theme.text }}
                >
                  {prefs.reduced_motion
                    ? '✓ Reducir Animaciones: ACTIVADO'
                    : '○ Reducir Animaciones: DESACTIVADO'}
                </ThemedText>
              </AccessiblePressable>
            </View>

            {/* 5. Asistencia Motriz y Comandos de Voz */}
            <View style={styles.controlSection}>
              <ThemedText type="smallBold" style={{ color: theme.text, marginBottom: 6 }}>
                5. Barra Flotante de Asistencia Motriz y Voz (WCAG 2.5.3):
              </ThemedText>
              <AccessiblePressable
                accessibilityRole="switch"
                accessibilityLabel="Barra flotante de asistencia por voz"
                accessibilityState={{ checked: prefs.assistive_voice_bar }}
                onPress={() =>
                  handleUpdate({ assistive_voice_bar: !prefs.assistive_voice_bar })
                }
                style={[
                  styles.toggleCard,
                  {
                    backgroundColor: prefs.assistive_voice_bar
                      ? theme.primary
                      : theme.backgroundElement,
                    borderColor: high_contrast ? '#FFFFFF' : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={
                    prefs.assistive_voice_bar ? { color: theme.onPrimary } : { color: theme.text }
                  }
                >
                  {prefs.assistive_voice_bar
                    ? '✓ Barra Flotante de Asistencia: VISIBLE'
                    : '○ Barra Flotante de Asistencia: OCULTA'}
                </ThemedText>
              </AccessiblePressable>
            </View>

            {/* Reset Button */}
            <View style={styles.footerSection}>
              <AccessiblePressable
                onPress={handleReset}
                accessibilityRole="button"
                accessibilityLabel="Restablecer todas las opciones de accesibilidad a los valores originales"
                style={[
                  styles.resetBtn,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: high_contrast ? '#FFFFFF' : theme.border,
                  },
                ]}
              >
                <ThemedText style={[styles.resetBtnText, { color: theme.textSecondary }]}>
                  ↺ Restablecer valores predeterminados
                </ThemedText>
              </AccessiblePressable>
            </View>
          </ScrollView>

          {/* Modal Action Footer */}
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
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Guardar cambios y cerrar ventana de accesibilidad"
              style={[
                styles.saveCloseBtn,
                {
                  backgroundColor: theme.primary,
                  borderColor: high_contrast ? '#FFFFFF' : 'transparent',
                },
              ]}
            >
              <ThemedText style={[styles.saveCloseBtnText, { color: theme.onPrimary }]}>
                Guardar y Cerrar
              </ThemedText>
            </AccessiblePressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  headerIcon: {
    fontSize: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  closeBtn: {
    minHeight: MinTouchTargetSize,
    minWidth: MinTouchTargetSize,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.one,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  syncStatusBanner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollArea: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  controlSection: {
    marginBottom: Spacing.two,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chipOption: {
    minHeight: MinTouchTargetSize,
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCard: {
    minHeight: MinTouchTargetSize,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSection: {
    marginTop: Spacing.one,
    alignItems: 'center',
  },
  resetBtn: {
    minHeight: MinTouchTargetSize,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalFooter: {
    padding: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  saveCloseBtn: {
    width: '100%',
    minHeight: MinTouchTargetSize,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
