import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AuthCard } from '@/components/auth/auth-card';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { ColorSwatchBadge } from '@/components/ui/color-swatch-badge';
import { AccessibleCollapsible } from '@/components/ui/collapsible';
import { StepZoomImage } from '@/components/ui/step-zoom-image';
import { VisualAlertBanner, VisualAlertVariant } from '@/components/ui/visual-alert-banner';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import { speakDescription, stopSpeaking } from '@/utils/a11y-feedback';

const SAMPLE_VOICE_TEXT =
  'Look verificado 100 por ciento humano de estilo Goth. Labios en tono Negro carbón oscuro y delineado intenso.';

export default function ExploreTestSandboxScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const { prefs, updateAccessibilityPrefs, resetAccessibilityPrefs } = useAccessibility();

  const [alertVariant, setAlertVariant] = useState<VisualAlertVariant | null>('info');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  const handleToggleSpeech = async () => {
    if (isSpeaking) {
      await stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    await speakDescription(SAMPLE_VOICE_TEXT, {
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Laboratorio de Pruebas (Fases 01 y 02)</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            Prueba aquí en vivo el Motor de Accesibilidad (Fase 01) y las Primitivas UI (Fase 02).
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          {/* 1. Prueba de Fase 01: Menú Desplegable de Accesibilidad */}
          <AccessibleCollapsible
            title="1. Opciones de Accesibilidad (Fase 01)"
            subtitle={`Tema: ${prefs.theme_mode} • Escala: ${Math.round(prefs.font_scale * 100)}%`}
            defaultExpanded>
            <View style={styles.group}>
              <ThemedText type="smallBold">Modo de Tema y Contraste (WCAG AA / AAA):</ThemedText>
              <View style={styles.rowWrap}>
                {(['system', 'light', 'dark', 'high_contrast'] as const).map((mode) => {
                  const selected = prefs.theme_mode === mode;
                  return (
                    <AccessiblePressable
                      key={mode}
                      accessibilityRole="button"
                      accessibilityLabel={`Cambiar tema a ${mode}`}
                      accessibilityState={{ selected }}
                      onPress={() => updateAccessibilityPrefs({ theme_mode: mode })}
                      style={[
                        styles.chipButton,
                        {
                          backgroundColor: selected ? theme.primary : theme.background,
                          borderColor: theme.border,
                        },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={selected ? { color: theme.onPrimary } : undefined}>
                        {mode === 'high_contrast'
                          ? 'Alto Contraste (AAA)'
                          : mode === 'light'
                            ? 'Claro'
                            : mode === 'dark'
                              ? 'Oscuro'
                              : 'Sistema'}
                      </ThemedText>
                    </AccessiblePressable>
                  );
                })}
              </View>

              <ThemedText type="smallBold">Escalado de Texto sin Recorte (hasta 200%):</ThemedText>
              <View style={styles.rowWrap}>
                {[1.0, 1.25, 1.5, 2.0].map((scale) => {
                  const selected = prefs.font_scale === scale;
                  return (
                    <AccessiblePressable
                      key={scale}
                      accessibilityRole="button"
                      accessibilityLabel={`Escalar texto al ${Math.round(scale * 100)} por ciento`}
                      accessibilityState={{ selected }}
                      onPress={() => updateAccessibilityPrefs({ font_scale: scale })}
                      style={[
                        styles.chipButton,
                        {
                          backgroundColor: selected ? theme.primary : theme.background,
                          borderColor: theme.border,
                        },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={selected ? { color: theme.onPrimary } : undefined}>
                        {Math.round(scale * 100)}%
                      </ThemedText>
                    </AccessiblePressable>
                  );
                })}
              </View>

              <ThemedText type="smallBold">Tipografía Apta para Dislexia y Animaciones:</ThemedText>
              <View style={styles.rowWrap}>
                <AccessiblePressable
                  accessibilityRole="button"
                  accessibilityLabel="Alternar fuente apta para dislexia Sans-Serif"
                  accessibilityState={{ selected: prefs.font_family_variant === 'sans_dyslexia' }}
                  onPress={() =>
                    updateAccessibilityPrefs({
                      dyslexia_font: prefs.font_family_variant !== 'sans_dyslexia',
                      font_family_variant:
                        prefs.font_family_variant === 'sans_dyslexia' ? 'default' : 'sans_dyslexia',
                    })
                  }
                  style={[
                    styles.chipButton,
                    {
                      backgroundColor:
                        prefs.font_family_variant === 'sans_dyslexia'
                          ? theme.primary
                          : theme.background,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={
                      prefs.font_family_variant === 'sans_dyslexia'
                        ? { color: theme.onPrimary }
                        : undefined
                    }>
                    Dislexia Sans-Serif
                  </ThemedText>
                </AccessiblePressable>

                <AccessiblePressable
                  accessibilityRole="button"
                  accessibilityLabel="Alternar fuente monoespaciada para dislexia"
                  accessibilityState={{ selected: prefs.font_family_variant === 'mono_dyslexia' }}
                  onPress={() =>
                    updateAccessibilityPrefs({
                      dyslexia_font: prefs.font_family_variant !== 'mono_dyslexia',
                      font_family_variant:
                        prefs.font_family_variant === 'mono_dyslexia' ? 'default' : 'mono_dyslexia',
                    })
                  }
                  style={[
                    styles.chipButton,
                    {
                      backgroundColor:
                        prefs.font_family_variant === 'mono_dyslexia'
                          ? theme.primary
                          : theme.background,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={
                      prefs.font_family_variant === 'mono_dyslexia'
                        ? { color: theme.onPrimary }
                        : undefined
                    }>
                    Dislexia Monospace
                  </ThemedText>
                </AccessiblePressable>

                <AccessiblePressable
                  accessibilityRole="button"
                  accessibilityLabel="Alternar reducción de movimiento y animaciones"
                  accessibilityState={{ selected: prefs.reduced_motion }}
                  onPress={() =>
                    updateAccessibilityPrefs({ reduced_motion: !prefs.reduced_motion })
                  }
                  style={[
                    styles.chipButton,
                    {
                      backgroundColor: prefs.reduced_motion ? theme.primary : theme.background,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={prefs.reduced_motion ? { color: theme.onPrimary } : undefined}>
                    {prefs.reduced_motion ? 'Sin Animaciones: SÍ' : 'Sin Animaciones: NO'}
                  </ThemedText>
                </AccessiblePressable>

                <AccessiblePressable
                  accessibilityRole="button"
                  accessibilityLabel="Restablecer opciones de accesibilidad por defecto"
                  onPress={() => resetAccessibilityPrefs()}
                  style={[styles.chipButton, { borderColor: theme.border }]}>
                  <ThemedText type="small">Restablecer</ThemedText>
                </AccessiblePressable>
              </View>
            </View>
          </AccessibleCollapsible>

          {/* 2. Prueba de Traductor de Color CIELAB + ColorSwatchBadge */}
          <AccessibleCollapsible
            title="2. Traductor de Color CIELAB y Badges (Fase 01 + 02)"
            subtitle="Independencia del color para daltonismo"
            badgeText="4">
            <View style={styles.group}>
              <ColorSwatchBadge hexValue="#3B3735" regionLabel="Labios (Look Goth #6290b685)" />
              <ColorSwatchBadge hexValue="#B28378" regionLabel="Delineador ColourPop BFF" />
              <ColorSwatchBadge hexValue="#B81D2A" regionLabel="Labial Rojo Carmín" />
              <ColorSwatchBadge hexValue="#5B1E31" regionLabel="Sombra Vino / Ciruela" />
            </View>
          </AccessibleCollapsible>

          {/* 3. Prueba de Voz (Text-to-Speech) y Alertas Visuales/Hápticas */}
          <AccessibleCollapsible
            title="3. Lectura en Voz Alta (TTS) y Alertas Visuales/Hápticas (Fase 02)"
            subtitle="Diversidad Visual y Auditiva">
            <View style={styles.group}>
              <AccessiblePressable
                accessibilityRole="button"
                accessibilityLabel={
                  isSpeaking
                    ? 'Detener lectura en voz alta'
                    : 'Escuchar descripción de ejemplo en voz alta'
                }
                hapticOnPress="medium"
                onPress={handleToggleSpeech}
                style={[
                  styles.chipButton,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                  {isSpeaking ? '⏹️ Detener lectura en voz alta' : '🔊 Escuchar descripción (TTS)'}
                </ThemedText>
              </AccessiblePressable>

              <View style={styles.rowWrap}>
                {(['info', 'success', 'warning', 'error'] as const).map((v) => (
                  <AccessiblePressable
                    key={v}
                    accessibilityRole="button"
                    accessibilityLabel={`Probar alerta visual de tipo ${v}`}
                    onPress={() => setAlertVariant(v)}
                    style={[styles.chipButton, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold">Alerta: {v.toUpperCase()}</ThemedText>
                  </AccessiblePressable>
                ))}
              </View>

              {alertVariant ? (
                <VisualAlertBanner
                  variant={alertVariant}
                  title={`Ejemplo de Alerta (${alertVariant.toUpperCase()})`}
                  message="Esta alerta combina alto contraste visual, ícono explícito, vibración háptica y región viva para lectores de pantalla."
                  actionLabel="Acción de prueba"
                  onActionPress={() => setAlertVariant('success')}
                  onDismiss={() => setAlertVariant(null)}
                />
              ) : null}
            </View>
          </AccessibleCollapsible>

          {/* 4. Prueba de Zoom por Botones sin Pinch */}
          <AccessibleCollapsible
            title="4. Visor con Zoom por Botones de Un Toque (Fase 02)"
            subtitle="Gestos alternativos sin pinch-to-zoom">
            <StepZoomImage
              uri="https://s3.amazonaws.com/donovanbailey/products/api_featured_images/000/001/048/original/open-uri20180708-4-13okqci?1531093614"
              altText="Fotografía de producto cosmético ColourPop Lippie Pencil tono BFF (#B28378)"
              height={240}
              contentFit="contain"
            />
          </AccessibleCollapsible>

          {/* 5. Prueba de Autenticación y Conexión Supabase (Fase 03) */}
          <AccessibleCollapsible
            title="5. Autenticación y Perfil en Supabase (Fase 03)"
            subtitle="Login, Registro y Sincronización de Accesibilidad"
            defaultExpanded>
            <AuthCard />
          </AccessibleCollapsible>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.two,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  sectionsWrapper: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  group: {
    gap: Spacing.two,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chipButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
  },
});
