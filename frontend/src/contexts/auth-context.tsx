import { Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAccessibility } from '@/hooks/use-accessibility';
import {
  ensureUserProfile,
  isSupabaseConfigured,
  supabase,
  syncAccessibilityPrefsToProfile,
} from '@/services/supabase';
import { ProfileRow } from '@/types/database';
import { announceStatus } from '@/utils/a11y-feedback';

const BOT_PROFILE_ID = '2fb75323-525b-482a-bf38-e0ea63275a04';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  isAuthenticated: boolean;
  isDemoSession: boolean;
  isSupabaseConfigured: boolean;
  isLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<boolean>;
  continueWithBotDemoProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { prefs, hydrateFromProfilePrefs } = useAccessibility();

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const hydratedProfileIdRef = useRef<string | null>(null);

  const loadUserProfile = useCallback(
    async (targetUser: User) => {
      const customUsername =
        (targetUser.user_metadata?.username as string | undefined) || targetUser.email;
      const loadedProfile = await ensureUserProfile(targetUser.id, customUsername);
      setProfile(loadedProfile);

      if (
        loadedProfile.accessibility_prefs &&
        hydratedProfileIdRef.current !== loadedProfile.id
      ) {
        hydratedProfileIdRef.current = loadedProfile.id;
        await hydrateFromProfilePrefs(
          loadedProfile.accessibility_prefs as Record<string, unknown>
        );
      }
    },
    [hydrateFromProfilePrefs]
  );

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (!error && data.session?.user) {
          setSession(data.session);
          setUser(data.session.user);
          await loadUserProfile(data.session.user);
        }
      } catch {
        // Ignore initial session restore errors
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        setIsDemoSession(false);
        void loadUserProfile(nextUser);
      } else if (!isDemoSession) {
        setProfile(null);
        hydratedProfileIdRef.current = null;
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [isDemoSession, loadUserProfile]);

  // Keep `public.profiles.accessibility_prefs` synced whenever the user updates accessibility settings
  useEffect(() => {
    if (!profile?.id || isDemoSession || !isSupabaseConfigured) return;
    void syncAccessibilityPrefsToProfile(profile.id, prefs);
  }, [prefs, profile?.id, isDemoSession]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthError(null);
      const cleanEmail = email.trim();
      if (!cleanEmail || !password) {
        setAuthError('Por favor ingresa tu correo electrónico y tu contraseña.');
        return false;
      }

      if (!isSupabaseConfigured) {
        setAuthError(
          'Falta configurar EXPO_PUBLIC_SUPABASE_ANON_KEY en frontend/.env. Puedes usar el botón "Probar con cuenta @aurasmatch_bot" mientras pegas la llave.'
        );
        return false;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          setAuthError(`No se pudo iniciar sesión: ${error.message}`);
          return false;
        }

        if (data.user) {
          await loadUserProfile(data.user);
          announceStatus('Sesión iniciada correctamente');
        }
        return true;
      } catch (err) {
        setAuthError(
          err instanceof Error
            ? `Error de red al iniciar sesión: ${err.message}`
            : 'Error inesperado al iniciar sesión.'
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [loadUserProfile]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, username: string): Promise<boolean> => {
      setAuthError(null);
      const cleanEmail = email.trim();
      const cleanUsername = username.trim().replace(/[^a-zA-Z0-9_]/g, '_');

      if (!cleanEmail || !password || !cleanUsername) {
        setAuthError('Completa nombre de usuario, correo electrónico y contraseña.');
        return false;
      }

      if (password.length < 6) {
        setAuthError('La contraseña debe tener al menos 6 caracteres.');
        return false;
      }

      if (!isSupabaseConfigured) {
        setAuthError(
          'Falta configurar EXPO_PUBLIC_SUPABASE_ANON_KEY en frontend/.env. Puedes usar el botón "Probar con cuenta @aurasmatch_bot" mientras pegas la llave.'
        );
        return false;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { username: cleanUsername },
          },
        });

        if (error) {
          setAuthError(`No se pudo crear la cuenta: ${error.message}`);
          return false;
        }

        if (data.user) {
          await loadUserProfile(data.user);
          announceStatus(`Cuenta creada para ${cleanUsername}`);
        }
        return true;
      } catch (err) {
        setAuthError(
          err instanceof Error
            ? `Error de red al registrarse: ${err.message}`
            : 'Error inesperado al registrarse.'
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [loadUserProfile]
  );

  const continueWithBotDemoProfile = useCallback(async () => {
    setAuthError(null);
    const botProfile = await ensureUserProfile(BOT_PROFILE_ID, 'aurasmatch_bot');
    setProfile({
      ...botProfile,
      id: BOT_PROFILE_ID,
      username: 'aurasmatch_bot',
    });
    setIsDemoSession(true);
    announceStatus('Sesión iniciada con el perfil real aurasmatch_bot');
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    setIsDemoSession(false);
    setProfile(null);
    setUser(null);
    setSession(null);
    hydratedProfileIdRef.current = null;

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore signOut errors
      }
    }
    announceStatus('Sesión cerrada');
  }, []);

  const isAuthenticated = Boolean(user || isDemoSession);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
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
    }),
    [
      session,
      user,
      profile,
      isAuthenticated,
      isDemoSession,
      isLoading,
      authError,
      clearAuthError,
      signInWithEmail,
      signUpWithEmail,
      continueWithBotDemoProfile,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un <AuthProvider>.');
  }
  return context;
}

