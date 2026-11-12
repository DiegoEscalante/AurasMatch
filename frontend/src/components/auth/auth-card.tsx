import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AccessiblePressable } from '@/components/ui/accessible-pressable';
import { VisualAlertBanner } from '@/components/ui/visual-alert-banner';
import { MinTouchTargetSize, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

/**
 * Compact, Stitch-Ready Login & Sign-Up card.
 * Fulfills:
 * - Course Rubric Section 3: Real Supabase authentication + profile creation + haptic/visual feedback.
 * - 2ndPhaseProposal.pdf Section V.A & V.B: Explicit labels above inputs (never relying only on disappearing placeholders),
 *   >= 48x48 dp touch targets, password visibility toggle, and no session expiration timers.
 */
export function AuthCard() {
  const theme = useTheme();
  const { effectiveFontScale, activeFontFamily } = useAccessibility();
  const {
    profile,
    isAuthenticated,
    isDemoSession,
    isSupabaseConfigured,
    isLoading,
    authError,
    clearAuthError,
    signInWithEmail,
    signUpWithEmail,
    continueWithBotDemoProfile,
    signOut,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const inputFontStyle = {
    fontSize: Math.round(16 * effectiveFontScale),
    fontFamily: activeFontFamily,
    color: theme.text,
    backgroundColor: theme.background,
    borderColor: theme.border,
  };

  if (isAuthenticated && profile) {
    return (
      <ThemedView
        type="backgroundElement"
        style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">
          Sesión Activa: @{profile.username}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          UUID en Supabase: {profile.id}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Modo: {isDemoSession ? 'Perfil Real @aurasmatch_bot (Modo Prueba)' : 'Supabase Auth JWT'}
        </ThemedText>

        <AccessiblePressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión actual"
          hapticOnPress="medium"
          onPress={() => void signOut()}
          style={[styles.secondaryBtn, { borderColor: theme.danger }]}>
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            Cerrar sesión
          </ThemedText>
        </AccessiblePressable>
      </ThemedView>
    );
  }

  const handleSubmit = async () => {
    if (mode === 'login') {
      await signInWithEmail(email, password);
    } else {
      await signUpWithEmail(email, password, username);
    }
  };

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.modeTabsRow} accessibilityRole="tablist">
        <AccessiblePressable
          accessibilityRole="tab"
          accessibilityLabel="Pestaña Iniciar Sesión"
          accessibilityState={{ selected: mode === 'login' }}
          onPress={() => {
            clearAuthError();
            setMode('login');
          }}
          style={[
            styles.modeTab,
            {
              backgroundColor: mode === 'login' ? theme.primary : theme.background,
              borderColor: theme.border,
            },
          ]}>
          <ThemedText
            type="smallBold"
            style={mode === 'login' ? { color: theme.onPrimary } : undefined}>
            Iniciar Sesión
          </ThemedText>
        </AccessiblePressable>

        <AccessiblePressable
          accessibilityRole="tab"
          accessibilityLabel="Pestaña Crear Cuenta"
          accessibilityState={{ selected: mode === 'signup' }}
          onPress={() => {
            clearAuthError();
            setMode('signup');
          }}
          style={[
            styles.modeTab,
            {
              backgroundColor: mode === 'signup' ? theme.primary : theme.background,
              borderColor: theme.border,
            },
          ]}>
          <ThemedText
            type="smallBold"
            style={mode === 'signup' ? { color: theme.onPrimary } : undefined}>
            Crear Cuenta
          </ThemedText>
        </AccessiblePressable>
      </View>

      {!isSupabaseConfigured ? (
        <VisualAlertBanner
          variant="info"
          autoAnnounce={false}
          title="Modo de Prueba Activo (Falta EXPO_PUBLIC_SUPABASE_ANON_KEY)"
          message="Cuando pegues tu llave pública anon en frontend/.env podrás iniciar sesión con correo. Mientras tanto, puedes entrar con el perfil real @aurasmatch_bot."
        />
      ) : null}

      {authError ? (
        <VisualAlertBanner
          variant="error"
          title="Atención en Autenticación"
          message={authError}
          onDismiss={clearAuthError}
        />
      ) : null}

      {mode === 'signup' ? (
        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold">Nombre de usuario (@username)</ThemedText>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="ej. kenny_auras"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Campo de nombre de usuario"
            accessibilityHint="Escribe tu nombre de usuario público sin espacios"
            style={[styles.input, inputFontStyle]}
          />
        </View>
      ) : null}

      <View style={styles.fieldGroup}>
        <ThemedText type="smallBold">Correo electrónico</ThemedText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="correo@ejemplo.com"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Campo de correo electrónico"
          accessibilityHint="Ingresa el correo electrónico de tu cuenta"
          style={[styles.input, inputFontStyle]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="smallBold">Contraseña</ThemedText>
        <View style={styles.passwordRow}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Campo de contraseña"
            accessibilityHint="Ingresa tu contraseña de al menos 6 caracteres"
            style={[styles.input, styles.passwordInput, inputFontStyle]}
          />
          <AccessiblePressable
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setShowPassword((prev) => !prev)}
            style={[styles.togglePassBtn, { borderColor: theme.border, backgroundColor: theme.background }]}>
            <ThemedText type="smallBold">{showPassword ? 'Ocultar' : 'Ver'}</ThemedText>
          </AccessiblePressable>
        </View>
      </View>

      <AccessiblePressable
        accessibilityRole="button"
        accessibilityLabel={mode === 'login' ? 'Confirmar inicio de sesión' : 'Confirmar registro de cuenta'}
        accessibilityState={{ busy: isLoading, disabled: isLoading }}
        hapticOnPress="medium"
        onPress={() => void handleSubmit()}
        style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
        {isLoading ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
            {mode === 'login' ? 'Entrar con mi cuenta' : 'Registrar cuenta en Supabase'}
          </ThemedText>
        )}
      </AccessiblePressable>

      <AccessiblePressable
        accessibilityRole="button"
        accessibilityLabel="Entrar rápido con el perfil real aurasmatch_bot de Supabase"
        accessibilityHint="Carga el usuario real aurasmatch_bot para probar todas las funciones de inmediato"
        onPress={() => void continueWithBotDemoProfile()}
        style={[styles.secondaryBtn, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <ThemedText type="smallBold">
          Probar rápido con perfil @aurasmatch_bot
        </ThemedText>
      </AccessiblePressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    gap: Spacing.three,
  },
  modeTabsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  input: {
    minHeight: MinTouchTargetSize,
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  passwordRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  togglePassBtn: {
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  primaryBtn: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  secondaryBtn: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1.5,
    alignItems: 'center',
  },
});

