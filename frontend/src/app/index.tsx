/**
 * Community Feed Screen (`src/app/index.tsx`).
 * Phase 05: Feed 100% Humano + Barra Persistente con Filtro Triple Desplegable y Tolerancia a Errores.
 *
 * Implements:
 * 1. Persistent Search Bar with clear button and Levenshtein typo-tolerant autocomplete chips (decoupled from list to keep keyboard open).
 * 2. Accessible Collapsible Triple Filter (Subculture + Facial Zone + CIELAB Color).
 * 3. Contextual Intelligent Combination logic (Subculture, Zone + Color, Color alone, Zone alone).
 * 4. Responsive Pinterest 2-column layout (automatically switching to 1 column at >=150% font scale or narrow screens < 340px).
 * 5. Screen reader live region announcing match count (WCAG 4.1.3 Status Messages).
 * 6. Gradual Engagement modal for guest interactions (Like/Save).
 */

import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContextualAuthPrompt } from '@/components/auth/contextual-auth-prompt';
import { LookCard } from '@/components/feed/look-card';
import { TripleFilterDropdown } from '@/components/feed/triple-filter-dropdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { VisualAlertBanner } from '@/components/ui/visual-alert-banner';
import { MaxContentWidth, MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useAuth } from '@/hooks/use-auth';
import { useFeed } from '@/hooks/use-feed';
import { useTheme } from '@/hooks/use-theme';
import { LookRow } from '@/types/database';
import { announceStatus, triggerHapticFeedback } from '@/utils/a11y-feedback';

export default function FeedHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { prefs, effectiveFontScale } = useAccessibility();
  const high_contrast = prefs.high_contrast;
  const font_scale = effectiveFontScale;
  const { isAuthenticated, profile } = useAuth();
  const { width } = useWindowDimensions();

  const [showAuthModal, setShowAuthModal] = useState(false);

  const {
    looks,
    filteredLooks,
    isLoading,
    isRefreshing,
    errorMessage,
    dismissError,
    searchQuery,
    setSearchQuery,
    selectedSubculture,
    setSelectedSubculture,
    selectedFacialZone,
    setSelectedFacialZone,
    selectedColorFamily,
    setSelectedColorFamily,
    isFilterOpen,
    setIsFilterOpen,
    activeFilterCount,
    suggestions,
    applySuggestion,
    clearFilters,
    refreshFeed,
    toggleLike,
    toggleSave,
  } = useFeed();

  // Responsive column calculation:
  // Switches to 1 column at >=150% font scale (WCAG 1.4.4 Resize Text) OR on extremely narrow screens (< 340px)
  const isSingleColumn = useMemo(() => {
    return font_scale >= 1.5 || width < 340;
  }, [font_scale, width]);

  const topPadding = Platform.OS === 'web' ? Spacing.two : Math.max(insets.top, Spacing.one);

  // Clear search query
  const handleClearSearch = () => {
    triggerHapticFeedback('light');
    setSearchQuery('');
    announceStatus('Búsqueda borrada.');
  };

  // Toggle filter menu
  const handleToggleFilterMenu = () => {
    triggerHapticFeedback('light');
    const nextState = !isFilterOpen;
    setIsFilterOpen(nextState);
    announceStatus(
      nextState
        ? 'Panel de filtro triple desplegado.'
        : 'Panel de filtro triple cerrado.'
    );
  };

  // Empty State when no looks match filters
  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={[styles.stateText, { color: theme.textSecondary }]}>
            Cargando publicaciones verificadas de AurasMatch...
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.centerState}>
        <ThemedText style={styles.emptyIcon}>🔍</ThemedText>
        <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
          No se encontraron publicaciones
        </ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Ningún look verificado coincide con la combinación de filtros seleccionada.
        </ThemedText>
        {activeFilterCount > 0 || searchQuery.length > 0 ? (
          <AccessiblePressable
            onPress={clearFilters}
            accessibilityRole="button"
            accessibilityLabel="Limpiar todos los filtros"
            style={[
              styles.emptyButton,
              {
                backgroundColor: theme.primary,
                borderColor: high_contrast ? theme.text : 'transparent',
              },
            ]}
          >
            <ThemedText style={[styles.emptyButtonText, { color: theme.onPrimary }]}>
              Limpiar filtros y ver todos
            </ThemedText>
          </AccessiblePressable>
        ) : null}
      </View>
    );
  };

  // Render header inside FlatList (predictive chips + alerts + live count)
  // Kept lightweight so the feed position never jumps when filters are toggled
  const renderListHeader = () => (
    <View style={styles.scrollableHeaderContent}>
      {/* Typo-Tolerant Predictive Autocomplete Chips */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ThemedText style={[styles.suggestionsLabel, { color: theme.textSecondary }]}>
            Sugerencias predictivas:
          </ThemedText>
          <View style={styles.suggestionsRow}>
            {suggestions.map((item) => (
              <AccessiblePressable
                key={item.id}
                onPress={() => applySuggestion(item)}
                accessibilityRole="button"
                accessibilityLabel={`Sugerencia: ${item.label}`}
                style={[
                  styles.suggestionChip,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: high_contrast ? theme.border : theme.primary,
                  },
                ]}
              >
                <ThemedText style={[styles.suggestionChipText, { color: theme.primary }]}>
                  {item.label}
                </ThemedText>
              </AccessiblePressable>
            ))}
          </View>
        </View>
      )}

      {/* Error Banner if fetch or mutation failed */}
      {errorMessage && (
        <View style={styles.alertWrapper}>
          <VisualAlertBanner
            variant="warning"
            title="Aviso de Base de Datos"
            message={errorMessage}
            onDismiss={dismissError}
          />
        </View>
      )}

      {/* Live Region announcing match count for screen readers */}
      <View
        accessible={true}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Se encontraron ${filteredLooks.length} publicaciones verificadas.`}
        style={styles.liveRegionWrapper}
      >
        <ThemedText style={[styles.resultsCountText, { color: theme.textSecondary }]}>
          Mostrando {filteredLooks.length} de {looks.length} looks verificados
          {activeFilterCount > 0 ? ` (${activeFilterCount} filtros aplicados)` : ''}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.mainContainer, { paddingTop: topPadding }]}>
      <View style={[styles.contentLimiter, { maxWidth: MaxContentWidth }]}>
        {/* Persistent Fixed Top Bar: Title & Search Bar (stays sticky so keyboard stays open) */}
        <View style={styles.persistentHeaderWrapper}>
          {/* Title & Human Guarantee badge */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <ThemedText style={[styles.appTitle, { color: theme.text }]}>
                AurasMatch
              </ThemedText>
              <View
                style={[
                  styles.guaranteeBadge,
                  {
                    backgroundColor: high_contrast ? '#000000' : '#14532D',
                    borderColor: high_contrast ? '#FFFFFF' : '#22C55E',
                  },
                ]}
                accessible={true}
                accessibilityRole="text"
                accessibilityLabel="Garantía de Realismo Absoluto: Todo el contenido está verificado contra Inteligencia Artificial"
              >
                <ThemedText
                  style={[
                    styles.guaranteeText,
                    { color: high_contrast ? '#FFFFFF' : '#86EFAC' },
                  ]}
                >
                  ✓ Feed 100% Humano
                </ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              {isAuthenticated && profile
                ? `Hola @${profile.username} • Explora tendencias y colores reales`
                : 'Exploración libre de maquillaje • Elige tus tonos y estilos'}
            </ThemedText>
          </View>

          {/* Persistent Search Bar Row */}
          <View style={styles.searchBarRow}>
            {/* Search Input Box */}
            <View
              style={[
                styles.searchInputWrapper,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: high_contrast ? theme.border : theme.border,
                },
              ]}
            >
              <ThemedText style={[styles.searchIcon, { color: theme.textSecondary }]}>
                🔍
              </ThemedText>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar por estilo, color, tag o zona..."
                placeholderTextColor={theme.textSecondary}
                accessibilityRole="search"
                accessibilityLabel="Buscar publicaciones, estilos o colores"
                accessibilityHint="Escribe el nombre de un estilo, color o zona facial con autocompletado tolerante a errores"
                style={[
                  styles.searchInput,
                  {
                    color: theme.text,
                  },
                ]}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <AccessiblePressable
                  onPress={handleClearSearch}
                  accessibilityRole="button"
                  accessibilityLabel="Borrar texto de búsqueda"
                  style={styles.clearSearchBtn}
                >
                  <ThemedText style={[styles.clearSearchIcon, { color: theme.textSecondary }]}>
                    ✕
                  </ThemedText>
                </AccessiblePressable>
              )}
            </View>

            {/* Filter Trigger Button */}
            <AccessiblePressable
              onPress={handleToggleFilterMenu}
              accessibilityRole="button"
              accessibilityState={{ expanded: isFilterOpen }}
              accessibilityLabel={`Filtros de búsqueda. ${
                activeFilterCount > 0 ? `${activeFilterCount} filtros activos.` : 'Ningún filtro activo.'
              } ${isFilterOpen ? 'Panel abierto' : 'Panel cerrado'}`}
              accessibilityHint="Toca para desplegar u ocultar los filtros por subcultura, área facial y color"
              style={[
                styles.filterToggleBtn,
                {
                  backgroundColor:
                    isFilterOpen || activeFilterCount > 0 ? theme.primary : theme.backgroundElement,
                  borderColor: high_contrast ? theme.text : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.filterToggleIcon,
                  {
                    color:
                      isFilterOpen || activeFilterCount > 0 ? theme.onPrimary : theme.text,
                  },
                ]}
              >
                ⚙️
              </ThemedText>
              {activeFilterCount > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    {
                      backgroundColor: high_contrast ? '#000000' : '#DC2626',
                      borderColor: '#FFFFFF',
                    },
                  ]}
                  accessible={false}
                >
                  <ThemedText style={styles.filterBadgeText}>
                    {activeFilterCount}
                  </ThemedText>
                </View>
              )}
            </AccessiblePressable>
          </View>
        </View>

        {/* Scrollable Pinterest Looks List */}
        <FlatList<LookRow>
          key={isSingleColumn ? 'feed-single-column' : 'feed-two-columns'}
          data={filteredLooks}
          keyExtractor={(item) => item.id}
          numColumns={isSingleColumn ? 1 : 2}
          columnWrapperStyle={!isSingleColumn ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshFeed}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={isSingleColumn ? styles.singleColItem : styles.twoColItem}>
              <LookCard
                look={item}
                onLike={toggleLike}
                onSave={toggleSave}
                onRequireAuth={() => setShowAuthModal(true)}
                isSingleColumn={isSingleColumn}
              />
            </View>
          )}
        />

        {/* Floating Triple Filter Overlay (placed on top of the feed without displacing scroll position) */}
        {isFilterOpen && (
          <>
            {/* Click-outside backdrop to dismiss */}
            <Pressable
              onPress={() => setIsFilterOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar panel de filtros"
              style={styles.filterBackdrop}
            />

            {/* Floating Filter Card */}
            <View style={styles.floatingFilterWrapper}>
              <TripleFilterDropdown
                isExpanded={isFilterOpen}
                onExpandedChange={setIsFilterOpen}
                selectedSubculture={selectedSubculture}
                onSelectSubculture={setSelectedSubculture}
                selectedFacialZone={selectedFacialZone}
                onSelectFacialZone={setSelectedFacialZone}
                selectedColorFamily={selectedColorFamily}
                onSelectColorFamily={setSelectedColorFamily}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                totalMatches={filteredLooks.length}
              />
            </View>
          </>
        )}
      </View>

      {/* Gradual Engagement Contextual Auth Modal */}
      <Modal
        visible={showAuthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.background,
                borderColor: high_contrast ? theme.border : theme.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                Inicia sesión para interactuar
              </ThemedText>
              <AccessiblePressable
                onPress={() => setShowAuthModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar aviso de inicio de sesión"
                style={styles.modalCloseBtn}
              >
                <ThemedText style={[styles.modalCloseText, { color: theme.textSecondary }]}>
                  ✕
                </ThemedText>
              </AccessiblePressable>
            </View>

            <ContextualAuthPrompt
              title="Guarda tus looks y comparte tu aprecio"
              description="Puedes seguir navegando y filtrando libremente sin cuenta, pero para guardar publicaciones y dar me gusta necesitas iniciar sesión o registrarte."
            />

            <AccessiblePressable
              onPress={() => setShowAuthModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Continuar explorando como visitante sin iniciar sesión"
              style={[
                styles.continueGuestBtn,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: high_contrast ? theme.border : 'transparent',
                },
              ]}
            >
              <ThemedText style={[styles.continueGuestText, { color: theme.textSecondary }]}>
                Continuar explorando como visitante
              </ThemedText>
            </AccessiblePressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    alignItems: 'center',
  },
  contentLimiter: {
    width: '100%',
    flex: 1,
    position: 'relative',
  },
  persistentHeaderWrapper: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
    zIndex: 10,
  },
  filterBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 90,
  },
  floatingFilterWrapper: {
    position: 'absolute',
    top: 104,
    left: Spacing.two,
    right: Spacing.two,
    zIndex: 100,
    maxHeight: '76%',
  },
  scrollableHeaderContent: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
  },
  listContent: {
    paddingBottom: Spacing.five,
  },
  titleSection: {
    marginBottom: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  guaranteeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  guaranteeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MinTouchTargetSize,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.two,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.one,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    minHeight: MinTouchTargetSize,
    paddingVertical: 8,
  },
  clearSearchBtn: {
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterToggleBtn: {
    minHeight: MinTouchTargetSize,
    minWidth: MinTouchTargetSize,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    position: 'relative',
  },
  filterToggleIcon: {
    fontSize: 18,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  suggestionsContainer: {
    marginTop: Spacing.one,
    marginBottom: Spacing.one,
  },
  suggestionsLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  suggestionChip: {
    minHeight: 36,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertWrapper: {
    marginVertical: Spacing.one,
  },
  liveRegionWrapper: {
    marginTop: Spacing.one,
    marginBottom: Spacing.one,
  },
  resultsCountText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
  },
  twoColItem: {
    flex: 1,
    maxWidth: '48.5%',
  },
  singleColItem: {
    width: '100%',
    paddingHorizontal: Spacing.two,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    marginTop: Spacing.three,
  },
  stateText: {
    fontSize: 14,
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.one,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.one,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: Spacing.two,
  },
  emptyButton: {
    minHeight: MinTouchTargetSize,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.two,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    minWidth: MinTouchTargetSize,
    minHeight: MinTouchTargetSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  continueGuestBtn: {
    minHeight: MinTouchTargetSize,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  continueGuestText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
