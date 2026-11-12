import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { ColorSwatchBadge } from '@/components/ui/color-swatch-badge';
import { AccessibleCollapsible } from '@/components/ui/collapsible';
import { StepZoomImage } from '@/components/ui/step-zoom-image';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { speakDescription, stopSpeaking } from '@/utils/a11y-feedback';

const SAMPLE_FEED_SPEECH =
  'Bienvenido a AurasMatch. Feed de maquillaje verificado 100 por ciento humano con extracción de color CIELAB y recomendación de 3085 cosméticos.';

/**
 * Tab 1: Community Feed Screen (`index.tsx`).
 * In Phase 05 this screen is upgraded with the persistent search bar, fuzzy autocomplete,
 * Triple Filter collapsible menu, and full verified human looks grid.
 */
export default function FeedHomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isAuthenticated, profile } = useAuth();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const topPadding = Platform.OS === 'web' ? Spacing.four : Math.max(insets.top, Spacing.three);

  const handleToggleSpeech = async () => {
    if (isSpeaking) {
      await stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    await speakDescription(SAMPLE_FEED_SPEECH, {
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: topPadding, paddingBottom: Spacing.six },
      ]}>
      <ThemedView style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.titleCol}>
            <ThemedText type="subtitle">AurasMatch • Feed</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isAuthenticated && profile
                ? `Explorando como @${profile.username} • 100% Humano`
                : 'Modo Exploración Libre (Sin Muro de Login) • 100% Humano'}
            </ThemedText>
          </View>

          <AccessiblePressable
            accessibilityRole="button"
            accessibilityLabel={
              isSpeaking ? 'Detener lectura en voz alta' : 'Escuchar resumen del Feed en voz alta'
            }
            onPress={() => void handleToggleSpeech()}
            style={[
              styles.ttsBtn,
              { backgroundColor: theme.primary, borderColor: theme.border },
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {isSpeaking ? '⏹️ Detener' : '🔊 Escuchar'}
            </ThemedText>
          </AccessiblePressable>
        </View>

        <ThemedView
          type="backgroundElement"
          style={[styles.heroCard, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">
            Navegación de 3 Pestañas Activa (Fase 04 Completada)
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            • Toca la pestaña &quot;Usuario&quot; en la barra inferior para probar el Menú
            Desplegable de Accesibilidad, el Login Gradual y tus colecciones de Publicaciones, Likes
            y Guardados.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            • En la Fase 05 conectaremos aquí la Barra de Búsqueda Persistente con el Botón
            Desplegable de Filtro Triple (Subcultura + Región Facial + Color CIELAB) y las tarjetas
            estilo Pinterest.
          </ThemedText>

          <AccessiblePressable
            accessibilityRole="button"
            accessibilityLabel="Ir a la pestaña Usuario y Accesibilidad"
            onPress={() => router.push('/profile')}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              Abrir Pestaña Usuario y Accesibilidad
            </ThemedText>
          </AccessiblePressable>
        </ThemedView>

        <AccessibleCollapsible
          title="Vista Previa de Primitivas (Color CIELAB y Zoom por Botones)"
          subtitle="Despliega para probar muestras de color y zoom accesible">
          <View style={styles.previewGroup}>
            <ColorSwatchBadge hexValue="#3B3735" regionLabel="Labios (Look Goth #6290b685)" />
            <ColorSwatchBadge hexValue="#B28378" regionLabel="Delineador ColourPop BFF (#1)" />
            <StepZoomImage
              uri="https://s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/048/original/open-uri20180708-4-13okqci?1531093614"
              altText="Fotografía de producto cosmético ColourPop Lippie Pencil tono BFF (#B28378)"
              height={220}
              contentFit="contain"
            />
          </View>
        </AccessibleCollapsible>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  ttsBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
  },
  heroCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
  },
  primaryBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  previewGroup: {
    gap: Spacing.two,
  },
});
