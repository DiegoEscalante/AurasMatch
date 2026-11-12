import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';

interface LightingGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LightingGuideModal({ visible, onClose }: LightingGuideModalProps) {
  const theme = useTheme();
  const { prefs } = useAccessibility();
  const high_contrast = prefs.high_contrast;

  const handleClose = () => {
    triggerHapticFeedback('light');
    announceStatus('Guía de iluminación cerrada');
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
        <Pressable
          style={styles.backdropPressable}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar modal tocando fuera"
        />

        <ThemedView
          style={[
            styles.modalDialogCard,
            {
              backgroundColor: theme.background,
              borderColor: high_contrast ? theme.text : theme.border,
            },
          ]}
          accessible={true}
          accessibilityRole="dialog"
          accessibilityLabel="Ventana emergente: Guía de Iluminación y Extracción Facial"
        >
          {/* Header */}
          <View style={styles.dialogHeader}>
            <View style={styles.headerTitleCol}>
              <View style={styles.titleRow}>
                <ThemedText style={styles.headerIcon}>💡</ThemedText>
                <ThemedText
                  style={[
                    styles.dialogTitle,
                    { color: theme.text },
                    high_contrast && styles.highContrastText,
                  ]}
                >
                  Guía de Iluminación
                </ThemedText>
              </View>
              <ThemedText style={[styles.dialogSubtitle, { color: theme.textSecondary }]}>
                Recomendaciones clave para una extracción facial y colorimétrica precisa
              </ThemedText>
            </View>

            <AccessiblePressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar guía de iluminación"
              accessibilityHint="Cierra esta ventana emergente"
              style={[
                styles.closeButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: high_contrast ? theme.text : theme.border,
                },
              ]}
            >
              <ThemedText style={[styles.closeIcon, { color: theme.text }]}>✕</ThemedText>
            </AccessiblePressable>
          </View>

          {/* Body Tips List */}
          <ScrollView
            style={styles.dialogBody}
            contentContainerStyle={styles.dialogBodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.tipCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: high_contrast ? theme.text : theme.border,
                },
              ]}
            >
              <ThemedText style={styles.tipIcon}>☀️</ThemedText>
              <View style={styles.tipTextCol}>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  Luz Frontal Uniforme
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.tipDesc}>
                  Busca luz natural frente a tu rostro o una lámpara blanca frontal. Evita sombras
                  duras o contraluces que alteren el cálculo perceptual CIELAB (L*, a*, b*) de tus
                  sombras y labiales.
                </ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.tipCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: high_contrast ? theme.text : theme.border,
                },
              ]}
            >
              <ThemedText style={styles.tipIcon}>🚫</ThemedText>
              <View style={styles.tipTextCol}>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  Cero Filtros Digitales
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.tipDesc}>
                  Evita fotos descargadas con filtros de redes sociales. El motor Anti-IA analiza
                  metadatos C2PA, frecuencias espectrales FFT y microtextura dérmica; un suavizado
                  excesivo podría clasificar erróneamente tu foto como sintética.
                </ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.tipCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: high_contrast ? theme.text : theme.border,
                },
              ]}
            >
              <ThemedText style={styles.tipIcon}>👁️</ThemedText>
              <View style={styles.tipTextCol}>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  Rasgos Despejados
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.tipDesc}>
                  Mantén labios, cejas y párpados visibles sin flequillos densos o gafas oscuras para
                  que la malla facial de 468 puntos de MediaPipe pueda aislar correctamente cada zona.
                </ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.tipCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: high_contrast ? theme.text : theme.border,
                },
              ]}
            >
              <ThemedText style={styles.tipIcon}>📐</ThemedText>
              <View style={styles.tipTextCol}>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  Encuadre Frontal Centrado
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.tipDesc}>
                  Enfoca de frente a la cámara con el rostro ocupando la mayor parte de la fotografía
                  para evitar distorsiones angulares en la extracción poligonal.
                </ThemedText>
              </View>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.dialogFooter}>
            <AccessiblePressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Entendido, cerrar guía de iluminación"
              style={[
                styles.footerActionBtn,
                {
                  backgroundColor: theme.primary,
                  borderColor: high_contrast ? theme.text : 'transparent',
                },
              ]}
            >
              <ThemedText style={[styles.footerActionText, { color: theme.onPrimary }]}>
                Entendido, cerrar guía
              </ThemedText>
            </AccessiblePressable>
          </View>
        </ThemedView>
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
    padding: Spacing.three,
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalDialogCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
    zIndex: 10,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  headerTitleCol: {
    flex: 1,
    marginRight: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  headerIcon: {
    fontSize: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  dialogSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  highContrastText: {
    fontWeight: '900',
  },
  closeButton: {
    minWidth: MinTouchTargetSize,
    minHeight: MinTouchTargetSize,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dialogBody: {
    maxHeight: 380,
  },
  dialogBodyContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
  },
  tipIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  tipTextCol: {
    flex: 1,
    gap: 2,
  },
  tipDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  dialogFooter: {
    padding: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  footerActionBtn: {
    minHeight: MinTouchTargetSize,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  footerActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
