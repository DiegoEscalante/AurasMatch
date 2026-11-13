import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessibleModal } from '@/components/ui/accessible-modal';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface LightingGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LightingGuideModal({ visible, onClose }: LightingGuideModalProps) {
  const theme = useTheme();

  return (
    <AccessibleModal
      visible={visible}
      onClose={onClose}
      icon="💡"
      title="Guía de Iluminación"
      subtitle="Recomendaciones clave para una extracción facial y colorimétrica precisa"
      dialogLabel="Ventana emergente: Guía de Iluminación y Extracción Facial"
      closeButtonLabel="Cerrar guía de iluminación"
      closeButtonHint="Cierra esta ventana emergente"
      closeAnnouncement="Guía de iluminación cerrada"
      maxWidth={480}
      size="auto"
      primaryActionLabel="Entendido, cerrar guía"
      primaryActionA11yLabel="Entendido, cerrar guía de iluminación"
    >
      <View
        style={[
          styles.tipCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
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
                  borderColor: theme.border,
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
                  borderColor: theme.border,
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
                  borderColor: theme.border,
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
    </AccessibleModal>
  );
}

const styles = StyleSheet.create({
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
});
