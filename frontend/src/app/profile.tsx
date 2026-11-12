import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContextualAuthPrompt } from '@/components/auth/contextual-auth-prompt';
import { AccessibilityModal } from '@/components/accessibility/accessibility-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { VisualAlertBanner } from '@/components/ui/visual-alert-banner';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { ProfileCollectionTab, useUserProfile } from '@/hooks/use-user-profile';
import { useTheme } from '@/hooks/use-theme';
import { LookRow } from '@/types/database';
import { resolveLookImageUrl } from '@/services/supabase';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';

function ProfileLookMiniCard({
  look,
  onAppeal,
}: {
  look: LookRow;
  onAppeal: (id: string) => void;
}) {
  const theme = useTheme();
  const [miniLoading, setMiniLoading] = React.useState(true);
  const subcultureText =
    look.subculture.length > 0 ? look.subculture.join(', ') : 'Alternativo';

  const handlePress = () => {
    triggerHapticFeedback('light');
    announceStatus(`Abriendo detalles de look de @${look.author_username || 'auras'}`);
    router.push(`/look/${look.id}` as any);
  };

  return (
    <AccessiblePressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Ver publicación estilo ${subcultureText} por @${look.author_username || 'auras'}`}
      accessibilityHint="Toca para abrir los detalles completos del look"
      style={[
        styles.miniCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}>
      <View style={styles.miniImageWrapper}>
        {miniLoading && (
          <View style={styles.miniLoadingOverlay}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        )}
        <Image
          source={{ uri: look.resolved_image_url || resolveLookImageUrl(look.image_path) }}
          contentFit="cover"
          style={styles.miniImage}
          onLoadStart={() => setMiniLoading(true)}
          onLoad={() => setMiniLoading(false)}
          onError={() => setMiniLoading(false)}
          accessibilityLabel={`Fotografía del look ${subcultureText}`}
        />
        {!look.is_human_verified && (
          <View style={[styles.miniBadge, { backgroundColor: 'rgba(239, 68, 68, 0.92)' }]}>
            <ThemedText style={styles.miniBadgeText}>⚠️ Retenido Anti-IA</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.miniMeta}>
        <ThemedText style={[styles.miniAuthor, { color: theme.text }]} numberOfLines={1}>
          @{look.author_username || 'auras'}
        </ThemedText>
        <View style={styles.miniSubRow}>
          <ThemedText style={[styles.miniSubculture, { color: theme.primary }]} numberOfLines={1}>
            {look.subculture[0] || 'Estilo'}
          </ThemedText>
          <ThemedText style={[styles.miniLikes, { color: theme.textSecondary }]}>
            ❤️ {look.liked_by?.length || 0}
          </ThemedText>
        </View>
      </View>

      {!look.is_human_verified && (
        <View style={styles.miniAppealBox}>
          {look.appeal_status === 'pending' ? (
            <ThemedText style={[styles.miniAppealText, { color: theme.primary }]}>
              ⏳ En revisión
            </ThemedText>
          ) : (
            <AccessiblePressable
              accessibilityRole="button"
              accessibilityLabel="Solicitar apelación humana por sospecha de IA"
              hapticOnPress="medium"
              onPress={(e) => {
                e?.stopPropagation?.();
                onAppeal(look.id);
              }}
              style={[styles.miniAppealBtn, { backgroundColor: theme.warning }]}>
              <ThemedText style={styles.miniAppealBtnText}>Apelar</ThemedText>
            </AccessiblePressable>
          )}
        </View>
      )}
    </AccessiblePressable>
  );
}

/**
 * Tab 3: User Profile & Accessibility Settings Screen (`profile.tsx`).
 * Implements:
 * - Unified Accessible Collapsible Menu (`AccessibilitySettingsMenu`) at the top (WCAG 2.4.1 Bypass Blocks).
 * - Gradual Engagement (`ContextualAuthPrompt`): Allows browsing and adjusting accessibility without an account,
 *   and prompts for login/registration to view personal Uploads, Likes, and Saved looks.
 */
export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { profile, isAuthenticated, isDemoSession, signOut } = useAuth();
  const [showA11yModal, setShowA11yModal] = React.useState(false);
  const {
    activeTab,
    setActiveTab,
    myUploadedLooks,
    myLikedLooks,
    mySavedLooks,
    activeCollectionLooks,
    isLoading,
    errorMessage,
    refreshProfileData,
    requestHumanAppeal,
  } = useUserProfile();

  const topPadding = Platform.OS === 'web' ? Spacing.four : Math.max(insets.top, Spacing.three);

  const tabsConfig: { id: ProfileCollectionTab; label: string; count: number }[] = [
    { id: 'uploads', label: 'Publicaciones', count: myUploadedLooks.length },
    { id: 'likes', label: 'Likes', count: myLikedLooks.length },
    { id: 'saved', label: 'Guardados', count: mySavedLooks.length },
  ];

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: topPadding, paddingBottom: Spacing.six },
      ]}>
      <ThemedView style={styles.container}>
        <View style={styles.headerBlock}>
          <ThemedText type="subtitle">Usuario y Accesibilidad</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Configura tu experiencia visual, cognitiva y motora, o gestiona tus colecciones.
          </ThemedText>
        </View>

        {/* 1. Botón de Apertura de Modal de Accesibilidad (reemplaza el menú desplegable duplicado) */}
        <AccessiblePressable
          onPress={() => {
            triggerHapticFeedback('light');
            setShowA11yModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Abrir opciones de accesibilidad universal"
          accessibilityHint="Abre la ventana modal con ajustes de alto contraste, tipografía, tamaño de texto y reducción de movimiento"
          style={[
            styles.a11yBannerBtn,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.a11yBannerLeft}>
            <ThemedText style={styles.a11yBannerIcon}>♿</ThemedText>
            <View style={styles.a11yBannerTexts}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>
                Opciones de Accesibilidad
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Alto Contraste AAA • Dislexia • Escala • Movimiento
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.a11yBannerChevron, { color: theme.primary }]}>
            Configurar ⚙️
          </ThemedText>
        </AccessiblePressable>

        {/* 2. Gradual Engagement: Si no ha iniciado sesión, pide cuenta aquí; si ya inició, muestra su perfil */}
        {!isAuthenticated || !profile ? (
          <ContextualAuthPrompt
            title="Tu Perfil y Colecciones Personales"
            description="Inicia sesión o regístrate para ver tus publicaciones verificadas, los maquillajes a los que diste Me gusta y tus looks guardados."
          />
        ) : (
          <View style={styles.profileContent}>
            <ThemedView
              type="backgroundElement"
              style={[styles.userCard, { borderColor: theme.border }]}>
              <View style={styles.userTopRow}>
                <View
                  importantForAccessibility="no-hide-descendants"
                  aria-hidden={true}
                  style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
                  <ThemedText type="subtitle" style={{ color: theme.onPrimary }}>
                    {profile.username.slice(0, 1).toUpperCase()}
                  </ThemedText>
                </View>

                <View style={styles.userInfoColumn}>
                  <ThemedText type="smallBold">@{profile.username}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {isDemoSession
                      ? 'Perfil Real de Demostración (Supabase)'
                      : 'Cuenta Verificada en Supabase'}
                  </ThemedText>
                </View>
              </View>

              {/* Contadores Numéricos Reales */}
              <View
                accessible
                accessibilityLabel={`Estadísticas de perfil: ${myUploadedLooks.length} publicaciones, ${myLikedLooks.length} me gusta, ${mySavedLooks.length} guardados`}
                style={[styles.statsRow, { borderColor: theme.border }]}>
                <View style={styles.statItem}>
                  <ThemedText type="smallBold">{myUploadedLooks.length}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Publicaciones
                  </ThemedText>
                </View>
                <View style={styles.statItem}>
                  <ThemedText type="smallBold">{myLikedLooks.length}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Likes
                  </ThemedText>
                </View>
                <View style={styles.statItem}>
                  <ThemedText type="smallBold">{mySavedLooks.length}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Guardados
                  </ThemedText>
                </View>
              </View>

              <View style={styles.userActionsRow}>
                <AccessiblePressable
                  accessibilityRole="button"
                  accessibilityLabel="Actualizar colecciones del perfil"
                  onPress={() => void refreshProfileData()}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}>
                  <ThemedText type="smallBold">Actualizar datos</ThemedText>
                </AccessiblePressable>

                <AccessiblePressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar sesión de la cuenta actual"
                  hapticOnPress="medium"
                  onPress={() => void signOut()}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: theme.background, borderColor: theme.danger },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>
                    Cerrar sesión
                  </ThemedText>
                </AccessiblePressable>
              </View>
            </ThemedView>

            {errorMessage ? (
              <VisualAlertBanner
                variant="warning"
                title="Aviso de Sincronización"
                message={errorMessage}
              />
            ) : null}

            {/* Selector de las 3 Colecciones del Usuario */}
            <View
              accessibilityRole="tablist"
              accessibilityLabel="Colecciones del usuario"
              style={styles.collectionTabsRow}>
              {tabsConfig.map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <AccessiblePressable
                    key={tab.id}
                    accessibilityRole="tab"
                    accessibilityLabel={`${tab.label}: ${tab.count} elementos`}
                    accessibilityState={{ selected }}
                    onPress={() => setActiveTab(tab.id)}
                    style={[
                      styles.collectionTabBtn,
                      {
                        backgroundColor: selected
                          ? theme.primary
                          : theme.backgroundElement,
                        borderColor: theme.border,
                      },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={selected ? { color: theme.onPrimary } : undefined}>
                      {tab.label} ({tab.count})
                    </ThemedText>
                  </AccessiblePressable>
                );
              })}
            </View>

            {/* Contenido de la Colección Seleccionada */}
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Cargando tus colecciones desde Supabase...
                </ThemedText>
              </View>
            ) : activeCollectionLooks.length === 0 ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.emptyCard, { borderColor: theme.border }]}>
                <ThemedText type="smallBold">
                  {activeTab === 'uploads'
                    ? 'Aún no tienes publicaciones en esta cuenta'
                    : activeTab === 'likes'
                      ? 'Todavía no has marcado looks con Me gusta'
                      : 'Todavía no has guardado looks en tu colección'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {activeTab === 'uploads'
                    ? 'Usa la pestaña Subir para analizar tu maquillaje y obtener recomendaciones de los 3,085 cosméticos.'
                    : 'Explora la pestaña Feed para descubrir looks verificados 100% humanos.'}
                </ThemedText>
                <AccessiblePressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    activeTab === 'uploads' ? 'Ir a la pestaña Subir' : 'Ir a la pestaña Feed'
                  }
                  onPress={() => router.push(activeTab === 'uploads' ? '/upload' : '/')}
                  style={[styles.ctaButton, { backgroundColor: theme.primary }]}>
                  <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                    {activeTab === 'uploads' ? 'Ir a Subir Look' : 'Explorar el Feed'}
                  </ThemedText>
                </AccessiblePressable>
              </ThemedView>
            ) : (
              <View style={styles.miniGrid}>
                {activeCollectionLooks.map((look) => (
                  <ProfileLookMiniCard
                    key={look.id}
                    look={look}
                    onAppeal={(id) => void requestHumanAppeal(id)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Modal de Accesibilidad Universal (reemplaza el menú desplegable anterior) */}
        <AccessibilityModal
          visible={showA11yModal}
          onClose={() => setShowA11yModal(false)}
        />
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
  headerBlock: {
    gap: Spacing.one,
  },
  a11yBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
  },
  a11yBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  a11yBannerIcon: {
    fontSize: 24,
  },
  a11yBannerTexts: {
    flex: 1,
    gap: 2,
  },
  a11yBannerChevron: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: Spacing.two,
  },
  profileContent: {
    gap: Spacing.three,
  },
  userCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.three,
  },
  userTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoColumn: {
    flex: 1,
    gap: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  userActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  collectionTabsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  collectionTabBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  loadingBox: {
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  ctaButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
  },
  miniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
    width: '100%',
  },
  miniCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  miniImageWrapper: {
    width: '100%',
    height: 145,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  miniLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  miniImage: {
    width: '100%',
    height: '100%',
  },
  miniBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  miniMeta: {
    padding: Spacing.two,
    gap: 2,
  },
  miniAuthor: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniSubculture: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  miniLikes: {
    fontSize: 11,
    fontWeight: '500',
  },
  miniAppealBox: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },
  miniAppealBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAppealBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  miniAppealText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});

