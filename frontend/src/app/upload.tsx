import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContextualAuthPrompt } from '@/components/auth/contextual-auth-prompt';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { VisualAlertBanner } from '@/components/ui/visual-alert-banner';
import { AIAnalysisResultsCard } from '@/components/upload/ai-analysis-results-card';
import { LightingGuideCollapsible } from '@/components/upload/lighting-guide-collapsible';
import { MaxContentWidth, MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useUploadLook } from '@/hooks/use-upload-look';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';

/**
 * Tab 2: Upload & AI Look Analysis Screen (`upload.tsx`).
 * Implements:
 * - Camera capture and gallery picker (`expo-image-picker`).
 * - Collapsible Lighting Guide (Project Proposal.pdf Section IV.C).
 * - Live connection to Cloud Run FastAPI (`POST /analyze-look/upload`) + Cloudflare R2 + Supabase.
 * - Resilient Testing Fallback Simulation for offline evaluation.
 * - Autosaved draft in AsyncStorage without expiration timers (2ndPhaseProposal.pdf Section V.B).
 * - AI-generated Alt-Text editable by the user for screen readers (2ndPhaseProposal.pdf Section V.D).
 * - Anti-AI verification badge and human appeal mechanism (Project Proposal.pdf Section IV.C).
 */
export default function UploadLookScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated, profile } = useAuth();

  const {
    status,
    imageUri,
    analysisResult,
    altText,
    suggestedAltText,
    errorMessage,
    isNoFaceDetected,
    isNetworkError,
    appealStatus,
    isAppealing,
    isPublished,
    publishedLookId,
    hasDraft,
    pickImageFromGallery,
    takePhotoWithCamera,
    clearImage,
    setAltText,
    restoreSuggestedAltText,
    analyzeLook,
    runSimulatedAnalysis,
    publishLook,
    submitAppeal,
    discardDraft,
  } = useUploadLook();

  const topPadding = Platform.OS === 'web' ? Spacing.four : Math.max(insets.top, Spacing.three);

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: topPadding, paddingBottom: Spacing.six },
      ]}
      keyboardShouldPersistTaps="handled">
      <ThemedView style={styles.container}>
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <ThemedText type="subtitle">Subir y Analizar Maquillaje</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Verifica que tu look es 100% humano, clasifica su subcultura estética y extrae los
            tonos exactos de ojos y labios en espacio CIELAB.
          </ThemedText>
        </View>

        {/* Lighting Guide Dropdown (WCAG 2.4.1 Bypass Blocks) */}
        <LightingGuideCollapsible />

        {/* Gradual Engagement Check */}
        {!isAuthenticated || !profile ? (
          <ContextualAuthPrompt
            title="Inicia Sesión para Subir y Analizar tu Look"
            description="Puedes explorar el Feed libremente sin cuenta. Para subir fotografías al motor de inteligencia artificial y publicarlas en tu perfil, inicia sesión o usa la cuenta bot de prueba @aurasmatch_bot."
          />
        ) : (
          <View style={styles.contentFlow}>
            {/* Restored Draft Banner (2ndPhaseProposal.pdf Section V.B - No expiration) */}
            {hasDraft && !isPublished && (
              <VisualAlertBanner
                variant="info"
                autoAnnounce={false}
                title="Borrador Activo Guardado"
                message="Tu foto y descripción se guardan localmente sin límite de tiempo para que nunca pierdas tu trabajo si cambias de pestaña."
                actionLabel="Descartar borrador"
                onActionPress={discardDraft}
              />
            )}

            {/* Step 1: Image Capture / Selection */}
            {!imageUri ? (
              <View
                style={[
                  styles.pickerCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}>
                <View style={styles.pickerHeader}>
                  <ThemedText type="default" style={{ fontWeight: '700' }}>
                    Selecciona tu Fotografía
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Usa luz frontal y mantén visibles ojos y labios sin filtros.
                  </ThemedText>
                </View>

                <View style={styles.pickerButtonsRow}>
                  <AccessiblePressable
                    accessibilityLabel="Tomar foto con la cámara del dispositivo"
                    accessibilityHint="Abre la cámara frontal o trasera para capturar tu maquillaje"
                    onPress={takePhotoWithCamera}
                    style={[
                      styles.pickerButton,
                      { backgroundColor: theme.primary },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: '#FFFFFF', fontWeight: '700' }}>
                      📷 Tomar Foto
                    </ThemedText>
                  </AccessiblePressable>

                  <AccessiblePressable
                    accessibilityLabel="Elegir foto de la galería del dispositivo"
                    accessibilityHint="Abre la galería de fotos para seleccionar un look guardado"
                    onPress={pickImageFromGallery}
                    style={[
                      styles.pickerButton,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        borderWidth: 1,
                      },
                    ]}>
                    <ThemedText type="small" style={{ fontWeight: '700' }}>
                      🖼️ Galería
                    </ThemedText>
                  </AccessiblePressable>
                </View>
              </View>
            ) : (
              /* Image Preview & Action Controls */
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}>
                <View style={styles.previewImageContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImage}
                    contentFit="cover"
                    accessibilityLabel="Vista previa de la fotografía de maquillaje seleccionada"
                  />
                </View>

                {/* Change / Clear Image Controls */}
                <View style={styles.previewActionsRow}>
                  <AccessiblePressable
                    accessibilityLabel="Cambiar fotografía"
                    accessibilityHint="Abre la galería para elegir una foto diferente"
                    onPress={pickImageFromGallery}
                    disabled={status === 'analyzing' || status === 'publishing'}
                    style={[
                      styles.smallActionButton,
                      { borderColor: theme.border, borderWidth: 1 },
                    ]}>
                    <ThemedText type="small" style={{ fontSize: 12, fontWeight: '600' }}>
                      🔄 Cambiar foto
                    </ThemedText>
                  </AccessiblePressable>

                  <AccessiblePressable
                    accessibilityLabel="Eliminar fotografía seleccionada"
                    accessibilityHint="Borra la imagen actual y limpia el borrador"
                    onPress={clearImage}
                    disabled={status === 'analyzing' || status === 'publishing'}
                    style={[
                      styles.smallActionButton,
                      { borderColor: '#EF444455', borderWidth: 1 },
                    ]}>
                    <ThemedText type="small" style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>
                      🗑️ Eliminar
                    </ThemedText>
                  </AccessiblePressable>
                </View>

                {/* Trigger Analysis Button (Before Analysis) */}
                {status === 'ready_to_analyze' && (
                  <AccessiblePressable
                    accessibilityLabel="Analizar maquillaje con inteligencia artificial"
                    accessibilityHint="Envía la imagen a Cloud Run para clasificar subcultura y extraer colores con MediaPipe"
                    onPress={analyzeLook}
                    style={[
                      styles.analyzeButton,
                      { backgroundColor: theme.primary },
                    ]}>
                    <ThemedText
                      type="default"
                      style={{ color: '#FFFFFF', fontWeight: '700' }}>
                      ✨ Analizar Maquillaje con IA
                    </ThemedText>
                  </AccessiblePressable>
                )}
              </View>
            )}

            {/* Analyzing Progress State */}
            {status === 'analyzing' && (
              <View
                style={[
                  styles.loadingCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
                accessible={true}
                accessibilityLiveRegion="polite"
                accessibilityLabel="Analizando fotografía con visión por computadora y filtro Anti-IA">
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText type="default" style={{ fontWeight: '700' }}>
                  Analizando Malla Facial y Forensia Anti-IA...
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                  MediaPipe está aislando labios y párpados, extrayendo tonos CIELAB y verificando
                  autenticidad en Google Cloud Run.
                </ThemedText>
              </View>
            )}

            {/* Error States: 422 No Face Detected */}
            {isNoFaceDetected && (
              <VisualAlertBanner
                variant="warning"
                title="Rostro No Detectado por MediaPipe"
                message="No se identificaron los 468 puntos de la malla facial. Asegúrate de encuadrar el rostro de frente, con suficiente luz natural y sin obstrucciones en ojos o boca."
                actionLabel="Probar con otra foto"
                onActionPress={pickImageFromGallery}
              />
            )}

            {/* Error States: Network Connection Error (with Resilient Simulation Fallback) */}
            {isNetworkError && (
              <View style={styles.errorContainer}>
                <VisualAlertBanner
                  variant="info"
                  title="Servidor Cloud Run en Reposo o Desconectado"
                  message={
                    errorMessage ||
                    'No se pudo conectar con el endpoint /analyze-look/upload. Puedes reintentar o usar la simulación asistida para probar el flujo completo.'
                  }
                  actionLabel="Reintentar llamada"
                  onActionPress={analyzeLook}
                />

                <AccessiblePressable
                  accessibilityLabel="Activar simulación asistida de análisis"
                  accessibilityHint="Genera una extracción realista local para probar la tarjeta de resultados y el editor de Alt-Text sin depender de la red"
                  onPress={runSimulatedAnalysis}
                  style={[
                    styles.simulationButton,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.primary, borderWidth: 1 },
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: theme.primary, fontWeight: '700' }}>
                    🧪 Probar con Simulación de Análisis (Fallback Asistido)
                  </ThemedText>
                </AccessiblePressable>
              </View>
            )}

            {/* General Error State */}
            {status === 'error' && !isNoFaceDetected && !isNetworkError && errorMessage && (
              <VisualAlertBanner
                variant="error"
                title="Error durante el Análisis"
                message={errorMessage}
                actionLabel="Reintentar"
                onActionPress={analyzeLook}
              />
            )}

            {/* Step 2: Analysis Results Card */}
            {analysisResult && (
              <>
                <AIAnalysisResultsCard
                  data={analysisResult}
                  appealStatus={appealStatus}
                  isAppealing={isAppealing}
                  onSubmitAppeal={submitAppeal}
                />

                {/* Step 3: Editable AI Alt-Text Editor (2ndPhaseProposal.pdf Section V.D) */}
                <View
                  style={[
                    styles.altTextCard,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}>
                  <View style={styles.altTextHeader}>
                    <ThemedText type="default" style={{ fontWeight: '700' }}>
                      Texto Descriptivo (Alt-Text) para Accesibilidad
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Descripción generada por la IA para usuarios con lectores de pantalla
                      (TalkBack, VoiceOver o NVDA). Puedes revisarla o editarla libremente:
                    </ThemedText>
                  </View>

                  <TextInput
                    style={[
                      styles.altTextInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    multiline={true}
                    numberOfLines={4}
                    value={altText}
                    onChangeText={setAltText}
                    placeholder="Escribe o ajusta la descripción accesible de tu maquillaje..."
                    placeholderTextColor={theme.textSecondary}
                    accessible={true}
                    accessibilityLabel="Texto alternativo descriptivo del look para lectores de pantalla"
                    accessibilityHint="Edita la descripción que escucharán los usuarios con discapacidad visual"
                  />

                  <View style={styles.altTextFooter}>
                    <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                      {altText.length} caracteres
                    </ThemedText>

                    <View style={styles.altTextActionsRow}>
                      {altText.length > 0 && (
                        <AccessiblePressable
                          accessibilityLabel="Borrar todo el texto descriptivo"
                          accessibilityHint="Elimina todo el contenido del campo de texto para comenzar a escribir desde cero"
                          onPress={() => {
                            setAltText('');
                            void triggerHapticFeedback('light');
                            announceStatus('Texto descriptivo borrado');
                          }}
                          style={styles.textActionButton}>
                          <ThemedText
                            type="small"
                            style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>
                            🗑️ Borrar todo
                          </ThemedText>
                        </AccessiblePressable>
                      )}

                      {altText !== suggestedAltText && (
                        <AccessiblePressable
                          accessibilityLabel="Restaurar descripción sugerida por IA"
                          accessibilityHint="Sobrescribe el texto actual con la sugerencia original calculada por la inteligencia artificial"
                          onPress={restoreSuggestedAltText}
                          style={styles.textActionButton}>
                          <ThemedText
                            type="small"
                            style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>
                            ↺ Restaurar sugerencia de IA
                          </ThemedText>
                        </AccessiblePressable>
                      )}
                    </View>
                  </View>
                </View>

                {/* Step 4: Publish Action or Success Feedback */}
                {!isPublished ? (
                  <View style={styles.publishBlock}>
                    <AccessiblePressable
                      accessibilityLabel="Publicar look de maquillaje en la comunidad"
                      accessibilityHint="Guarda tu publicación en Supabase con su descripción y colores extraídos para que aparezca en el Feed"
                      disabled={status === 'publishing'}
                      onPress={publishLook}
                      style={[
                        styles.publishButton,
                        { backgroundColor: theme.primary },
                      ]}>
                      {status === 'publishing' ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText
                          type="default"
                          style={{ color: '#FFFFFF', fontWeight: '700' }}>
                          🚀 Publicar Look en la Comunidad
                        </ThemedText>
                      )}
                    </AccessiblePressable>

                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={{ fontSize: 12, textAlign: 'center' }}>
                      Al publicar, tu look se integrará al catálogo con su paleta de tonos CIELAB y
                      los productos afines recomendados.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.successBlock}>
                    <VisualAlertBanner
                      variant="success"
                      title="¡Look Publicado con Éxito!"
                      message="Tu maquillaje ya forma parte de AurasMatch con su clasificación estética, paleta exacta y descripción accesible."
                    />

                    <View style={styles.successActionsRow}>
                      {publishedLookId && (
                        <AccessiblePressable
                          accessibilityLabel="Ver detalle de la publicación recién subida"
                          accessibilityHint="Navega a la pantalla completa de detalle estilo Pinterest de este look"
                          onPress={() => router.push(`/look/${publishedLookId}` as any)}
                          style={[
                            styles.successButton,
                            { backgroundColor: theme.primary },
                          ]}>
                          <ThemedText
                            type="small"
                            style={{ color: '#FFFFFF', fontWeight: '700' }}>
                            🔍 Ver Publicación en Detalle
                          </ThemedText>
                        </AccessiblePressable>
                      )}

                      <AccessiblePressable
                        accessibilityLabel="Subir otro maquillaje"
                        accessibilityHint="Limpia la pantalla para comenzar a analizar una nueva foto"
                        onPress={discardDraft}
                        style={[
                          styles.successButton,
                          {
                            backgroundColor: theme.background,
                            borderColor: theme.border,
                            borderWidth: 1,
                          },
                        ]}>
                        <ThemedText type="small" style={{ fontWeight: '700' }}>
                          ➕ Subir Otro Look
                        </ThemedText>
                      </AccessiblePressable>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}
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
    gap: Spacing.four,
  },
  headerBlock: {
    gap: Spacing.half,
  },
  contentFlow: {
    gap: Spacing.four,
  },
  pickerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  pickerHeader: {
    gap: Spacing.half,
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  pickerButton: {
    flex: 1,
    minWidth: 140,
    minHeight: MinTouchTargetSize,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
    alignItems: 'center',
  },
  previewImageContainer: {
    width: '100%',
    maxHeight: 340,
    aspectRatio: 4 / 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#00000010',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
    width: '100%',
  },
  smallActionButton: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButton: {
    width: '100%',
    minHeight: MinTouchTargetSize,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.one,
  },
  loadingCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.six,
    gap: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    gap: Spacing.two,
  },
  simulationButton: {
    minHeight: MinTouchTargetSize,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  altTextCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  altTextHeader: {
    gap: Spacing.half,
  },
  altTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    lineHeight: 20,
  },
  altTextFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.half,
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  altTextActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  textActionButton: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.one,
  },
  publishBlock: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  publishButton: {
    minHeight: MinTouchTargetSize,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    width: '100%',
  },
  successBlock: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  successActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  successButton: {
    flex: 1,
    minWidth: 150,
    minHeight: MinTouchTargetSize,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
