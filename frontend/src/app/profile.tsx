import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContextualAuthPrompt } from '@/components/auth/contextual-auth-prompt';
import { AccessibilitySettingsMenu } from '@/components/profile/accessibility-settings-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { ColorSwatchBadge } from '@/components/ui/color-swatch-badge';
import { VisualAlertBanner } from '@/components/ui/visual-alert-banner';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { ProfileCollectionTab, useUserProfile } from '@/hooks/use-user-profile';
import { useTheme } from '@/hooks/use-theme';
import { FACIAL_REGION_LABELS, FacialRegionKey, LookRow } from '@/types/database';

function ProfileLookItemCard({
  look,
  onAppeal,
}: {
  look: LookRow;
  onAppeal: (id: string) => void;
}) {
  const theme = useTheme();
  const subcultureText =
    look.subculture.length > 0 ? look.subculture.join(' • ') : 'Estilo General';
  const regionEntries = Object.entries(look.extracted_regions || {}) as [
    FacialRegionKey,
    { hex_value: string },
  ][];

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.lookCard, { borderColor: theme.border }]}>
      <View style={styles.lookHeaderRow}>
        <Image
          source={{ uri: look.resolved_image_url }}
          accessibilityLabel={look.description}
          contentFit="cover"
          style={[styles.thumbnail, { borderColor: theme.border }]}
        />

        <View style={styles.lookMetaColumn}>
          <ThemedText type="smallBold">{subcultureText}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
            {look.description}
          </ThemedText>

          <View
            style={[
              styles.verificationPill,
              {
                backgroundColor: look.is_human_verified
                  ? theme.backgroundSelected
                  : theme.background,
                borderColor: look.is_human_verified ? theme.success : theme.warning,
              },
            ]}>
            <ThemedText
              type="smallBold"
              style={{
                color: look.is_human_verified ? theme.success : theme.warning,
              }}>
              {look.is_human_verified
                ? `✅ 100% Humano (IA: ${Math.round(look.ai_confidence_score * 100)}%)`
                : `⚠️ Retenido Anti-IA (IA: ${Math.round(look.ai_confidence_score * 100)}%)`}
            </ThemedText>
          </View>
        </View>
      </View>

      {regionEntries.length > 0 ? (
        <View style={styles.swatchesRow}>
          {regionEntries.slice(0, 2).map(([regionKey, data]) =>
            data?.hex_value ? (
              <ColorSwatchBadge
                key={regionKey}
                hexValue={data.hex_value}
                regionLabel={FACIAL_REGION_LABELS[regionKey] || regionKey}
              />
            ) : null
          )}
        </View>
      ) : null}

      {!look.is_human_verified ? (
        <View style={styles.appealSection}>
          {look.appeal_status === 'pending' ? (
            <VisualAlertBanner
              variant="info"
              autoAnnounce={false}
              title="Apelación en Revisión Manual"
              message="Tu solicitud fue registrada. Un moderador verificará que tu fotografía es 100% humana."
            />
          ) : (
            <AccessiblePressable
              accessibilityRole="button"
              accessibilityLabel="Solicitar apelación manual por falso positivo del filtro Anti-IA"
              hapticOnPress="medium"
              onPress={() => onAppeal(look.id)}
              style={[styles.appealBtn, { backgroundColor: theme.warning }]}>
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                Apelar filtro Anti-IA (Solicitar revisión humana)
              </ThemedText>
            </AccessiblePressable>
          )}
        </View>
      ) : null}
    </ThemedView>
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

        {/* 1. Menú Desplegable de Opciones de Accesibilidad (WCAG 2.4.1 Bypass Blocks) */}
        <AccessibilitySettingsMenu defaultExpanded={!isAuthenticated} />

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
              <View style={styles.listColumn}>
                {activeCollectionLooks.map((look) => (
                  <ProfileLookItemCard
                    key={look.id}
                    look={look}
                    onAppeal={(id) => void requestHumanAppeal(id)}
                  />
                ))}
              </View>
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
    gap: Spacing.three,
  },
  headerBlock: {
    gap: Spacing.one,
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
  listColumn: {
    gap: Spacing.three,
  },
  lookCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
  },
  lookHeaderRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  thumbnail: {
    width: 88,
    height: 88,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  lookMetaColumn: {
    flex: 1,
    gap: Spacing.one,
  },
  verificationPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.two,
    borderWidth: 1,
    marginTop: 2,
  },
  swatchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  appealSection: {
    marginTop: Spacing.one,
  },
  appealBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
});

