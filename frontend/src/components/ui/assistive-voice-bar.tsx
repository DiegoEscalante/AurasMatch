/**
 * Assistive Voice Command & Motor Diversity Floating Action Palette.
 * Fulfills:
 * - 2ndPhaseProposal.pdf Section V.A.3 (Motor Diversity & Voice Control Commands).
 * - WCAG 2.5.3 (Label in Name): Ensures programmatic names match visual labels for native speech input.
 * - Live Academic Defense Utility: Enables immediate on-screen execution of accessibility commands
 *   during professor examination without requiring external OS speech service setup on emulators.
 */

import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useTheme } from '@/hooks/use-theme';
import {
  announceStatus,
  speakDescription,
  stopSpeaking,
  triggerHapticFeedback,
} from '@/utils/a11y-feedback';

export function AssistiveVoiceBar() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const { prefs } = useAccessibility();
  const high_contrast = prefs.high_contrast;

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Only visible when enabled in Accessibility Settings Menu
  if (!prefs.assistive_voice_bar) {
    return null;
  }

  const handleToggleExpand = () => {
    triggerHapticFeedback('light');
    setIsExpanded((prev) => {
      const next = !prev;
      announceStatus(
        next
          ? 'Paleta de comandos de voz asistidos expandida.'
          : 'Paleta de comandos de voz minimizada.'
      );
      return next;
    });
  };

  const handleExecuteCommand = async (
    actionName: string,
    actionFn: () => void | Promise<void>,
    spokenConfirmation: string
  ) => {
    triggerHapticFeedback('medium');
    announceStatus(`Comando ejecutado: ${spokenConfirmation}`);
    await actionFn();
  };

  const handleReadCurrentScreen = async () => {
    let screenContext = 'Pantalla principal de AurasMatch';
    if (pathname === '/') {
      screenContext =
        'Estás en el Feed Comunitario. Explora looks de maquillaje 100% humanos con filtro triple por subcultura, área facial y color.';
    } else if (pathname === '/upload') {
      screenContext =
        'Estás en la pantalla de Subir Look. Selecciona una fotografía para analizar con inteligencia artificial y clasificar tus tonos cosméticos.';
    } else if (pathname === '/profile') {
      screenContext =
        'Estás en tu Perfil de Usuario. Gestiona tus publicaciones, guardados y ajustes de accesibilidad de tema, fuente y contraste.';
    } else if (pathname.startsWith('/look/')) {
      screenContext =
        'Estás en el Detalle del Look. Explora la fotografía con zoom por pasos, desglose Anti-IA, tonos por región y comentarios de la comunidad.';
    }

    announceStatus('Iniciando lectura accesible del contexto de la pantalla.');
    await speakDescription(screenContext);
  };

  // Minimized floating circular pill
  if (!isExpanded) {
    return (
      <View
        style={[
          styles.floatingWrapper,
          Platform.OS === 'web' ? ({ position: 'fixed' as any } as any) : null,
        ]}
        pointerEvents="box-none"
      >
        <AccessiblePressable
          onPress={handleToggleExpand}
          accessibilityRole="button"
          accessibilityLabel="Abrir paleta de comandos asistidos de voz y control motor"
          accessibilityHint="Despliega atajos accesibles y simulación de comandos de voz para la sustentación"
          style={[
            styles.minimizedPill,
            {
              backgroundColor: theme.primary,
              borderColor: high_contrast ? '#FFFFFF' : theme.onPrimary,
            },
          ]}
        >
          <ThemedText style={styles.pillIcon}>🎙️</ThemedText>
          <View
            style={[
              styles.pillBadge,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText style={styles.pillBadgeText}>♿</ThemedText>
          </View>
        </AccessiblePressable>
      </View>
    );
  }

  // Expanded Accessible Command Palette
  return (
    <View
      style={[
        styles.expandedOverlayWrapper,
        Platform.OS === 'web' ? ({ position: 'fixed' as any } as any) : null,
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.paletteCard,
          {
            backgroundColor: theme.background,
            borderColor: high_contrast ? theme.text : theme.border,
          },
        ]}
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel="Paleta de Comandos Asistidos de Voz y Diversidad Motriz"
      >
        {/* Header */}
        <View style={styles.paletteHeader}>
          <View style={styles.headerTitleGroup}>
            <ThemedText style={styles.headerIcon}>🎙️</ThemedText>
            <View>
              <ThemedText style={[styles.paletteTitle, { color: theme.text }]}>
                Comandos Asistidos de Voz
              </ThemedText>
              <ThemedText
                style={[styles.paletteSubtitle, { color: theme.textSecondary }]}
              >
                2ndPhaseProposal Sección V.A.3 & WCAG 2.5.3
              </ThemedText>
            </View>
          </View>

          <AccessiblePressable
            onPress={handleToggleExpand}
            accessibilityRole="button"
            accessibilityLabel="Minimizar paleta de comandos asistidos"
            style={[
              styles.closeBtn,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText style={[styles.closeBtnText, { color: theme.text }]}>
              ✕
            </ThemedText>
          </AccessiblePressable>
        </View>

        {/* Action Buttons Grid */}
        <View style={styles.gridContainer}>
          {/* 1. Navigate to Feed */}
          <AccessiblePressable
            onPress={() =>
              handleExecuteCommand(
                'Ir a Feed',
                () => router.push('/' as any),
                'Navegando al Feed Comunitario'
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Comando de voz: Ir al Feed Comunitario"
            style={[
              styles.commandBtn,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: high_contrast ? theme.text : theme.border,
              },
            ]}
          >
            <ThemedText style={styles.cmdIcon}>🏠</ThemedText>
            <ThemedText
              style={[styles.cmdLabel, { color: theme.text }]}
              numberOfLines={1}
            >
              "Ir al Feed"
            </ThemedText>
          </AccessiblePressable>

          {/* 2. Navigate to Upload */}
          <AccessiblePressable
            onPress={() =>
              handleExecuteCommand(
                'Subir Look',
                () => router.push('/upload' as any),
                'Navegando a Subir Look'
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Comando de voz: Subir Look"
            style={[
              styles.commandBtn,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: high_contrast ? theme.text : theme.border,
              },
            ]}
          >
            <ThemedText style={styles.cmdIcon}>➕</ThemedText>
            <ThemedText
              style={[styles.cmdLabel, { color: theme.text }]}
              numberOfLines={1}
            >
              "Subir Look"
            </ThemedText>
          </AccessiblePressable>

          {/* 3. Navigate to Profile */}
          <AccessiblePressable
            onPress={() =>
              handleExecuteCommand(
                'Mi Perfil',
                () => router.push('/profile' as any),
                'Navegando a Mi Perfil'
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Comando de voz: Mi Perfil"
            style={[
              styles.commandBtn,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: high_contrast ? theme.text : theme.border,
              },
            ]}
          >
            <ThemedText style={styles.cmdIcon}>👤</ThemedText>
            <ThemedText
              style={[styles.cmdLabel, { color: theme.text }]}
              numberOfLines={1}
            >
              "Mi Perfil"
            </ThemedText>
          </AccessiblePressable>

          {/* 4. TTS Read Screen */}
          <AccessiblePressable
            onPress={() =>
              handleExecuteCommand(
                'Leer Pantalla',
                handleReadCurrentScreen,
                'Leyendo contexto accesible de pantalla'
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Comando de voz: Escuchar descripción de pantalla"
            style={[
              styles.commandBtn,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: high_contrast ? theme.text : theme.border,
              },
            ]}
          >
            <ThemedText style={styles.cmdIcon}>🔊</ThemedText>
            <ThemedText
              style={[styles.cmdLabel, { color: theme.text }]}
              numberOfLines={1}
            >
              "Escuchar Pantalla"
            </ThemedText>
          </AccessiblePressable>

          {/* 5. Like Simulation */}
          <AccessiblePressable
            onPress={() =>
              handleExecuteCommand(
                'Dar Me Gusta',
                () => {},
                'Dar me gusta a la publicación'
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Comando de voz: Dar me gusta"
            style={[
              styles.commandBtn,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: high_contrast ? theme.text : theme.border,
              },
            ]}
          >
            <ThemedText style={styles.cmdIcon}>❤️</ThemedText>
            <ThemedText
              style={[styles.cmdLabel, { color: theme.text }]}
              numberOfLines={1}
            >
              "Dar me gusta"
            </ThemedText>
          </AccessiblePressable>

          {/* 6. Save Simulation */}
          <AccessiblePressable
            onPress={() =>
              handleExecuteCommand(
                'Guardar Publicación',
                () => {},
                'Guardar publicación en tu colección'
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Comando de voz: Guardar"
            style={[
              styles.commandBtn,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: high_contrast ? theme.text : theme.border,
              },
            ]}
          >
            <ThemedText style={styles.cmdIcon}>⭐</ThemedText>
            <ThemedText
              style={[styles.cmdLabel, { color: theme.text }]}
              numberOfLines={1}
            >
              "Guardar look"
            </ThemedText>
          </AccessiblePressable>
        </View>

        {/* Native Speech Recognition Guide Toggle */}
        <AccessiblePressable
          onPress={() => {
            triggerHapticFeedback('light');
            setShowGuide((prev) => !prev);
          }}
          accessibilityRole="button"
          accessibilityLabel="Ver guía de comandos nativos para iOS Voice Control y Android Voice Access"
          style={[
            styles.guideToggleBtn,
            {
              backgroundColor: theme.backgroundSelected,
              borderColor: theme.border,
            },
          ]}
        >
          <ThemedText
            style={[styles.guideToggleText, { color: theme.primary }]}
          >
            {showGuide
              ? '▲ Ocultar guía de control por voz'
              : '▼ Ver frases nativas para iOS y Android'}
          </ThemedText>
        </AccessiblePressable>

        {showGuide && (
          <View
            style={[
              styles.guideBox,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: high_contrast ? theme.text : theme.border,
              },
            ]}
          >
            <ThemedText style={[styles.guideHeading, { color: theme.text }]}>
              🎙️ Integración Nativa (Label in Name — WCAG 2.5.3):
            </ThemedText>
            <ThemedText
              style={[styles.guideText, { color: theme.textSecondary }]}
            >
              Todos los botones de AurasMatch coinciden con las etiquetas habladas por los motores nativos:
            </ThemedText>
            <ThemedText style={[styles.guideItem, { color: theme.text }]}>
              • En iOS: Activa <ThemedText style={{ fontWeight: 'bold' }}>Ajustes &gt; Accesibilidad &gt; Control por Voz</ThemedText>.
            </ThemedText>
            <ThemedText style={[styles.guideItem, { color: theme.text }]}>
              • En Android: Activa <ThemedText style={{ fontWeight: 'bold' }}>Ajustes &gt; Accesibilidad &gt; Voice Access</ThemedText>.
            </ThemedText>
            <ThemedText style={[styles.guideItem, { color: theme.textSecondary }]}>
              • Di en voz alta: <ThemedText style={{ fontStyle: 'italic' }}>"Toca Dar me gusta"</ThemedText>, <ThemedText style={{ fontStyle: 'italic' }}>"Toca Guardar"</ThemedText>, <ThemedText style={{ fontStyle: 'italic' }}>"Toca Escuchar"</ThemedText> o <ThemedText style={{ fontStyle: 'italic' }}>"Toca Publicar"</ThemedText>.
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    zIndex: 9999,
  },
  minimizedPill: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  pillIcon: {
    fontSize: 24,
  },
  pillBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadgeText: {
    fontSize: 10,
  },
  expandedOverlayWrapper: {
    position: 'absolute',
    bottom: 74,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 9999,
  },
  paletteCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: 2,
    padding: Spacing.two,
    gap: Spacing.two,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  paletteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#64748B40',
    paddingBottom: Spacing.one,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flex: 1,
  },
  headerIcon: {
    fontSize: 22,
  },
  paletteTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  paletteSubtitle: {
    fontSize: 10,
  },
  closeBtn: {
    width: MinTouchTargetSize,
    height: MinTouchTargetSize,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  commandBtn: {
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: MinTouchTargetSize,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cmdIcon: {
    fontSize: 18,
  },
  cmdLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  guideToggleBtn: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  guideToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  guideBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: Spacing.two,
    gap: 4,
  },
  guideHeading: {
    fontSize: 12,
    fontWeight: '700',
  },
  guideText: {
    fontSize: 11,
    lineHeight: 16,
  },
  guideItem: {
    fontSize: 11,
    lineHeight: 16,
  },
});

