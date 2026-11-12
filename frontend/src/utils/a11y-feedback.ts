import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { AccessibilityInfo, Platform } from 'react-native';

export type HapticFeedbackType = 'none' | 'light' | 'medium' | 'success' | 'warning' | 'error';

/**
 * Triggers multi-platform haptic feedback (iOS/Android native haptics + safe Web fallback).
 * Fulfills Course Rubric Section 3 & 2ndPhaseProposal.pdf Section V.C (Auditory Diversity).
 */
export async function triggerHapticFeedback(type: HapticFeedbackType = 'light'): Promise<void> {
  if (type === 'none') return;

  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(type === 'error' || type === 'warning' ? [25, 40, 25] : 15);
      }
      return;
    }

    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // Ignore on unsupported devices or simulators without haptic engine
  }
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
}

/**
 * Reads a look or product description aloud in Spanish using native TTS (expo-speech)
 * on iOS/Android and Web Speech API (window.speechSynthesis) on Web.
 * Fulfills 2ndPhaseProposal.pdf Section V.D.1 (Voice-to-Speech).
 */
export async function speakDescription(text: string, options?: SpeakOptions): Promise<void> {
  const cleanText = text.trim();
  if (!cleanText) return;

  await stopSpeaking();

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new window.SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-ES';
      utterance.rate = options?.rate ?? 0.98;
      utterance.pitch = options?.pitch ?? 1.0;
      if (options?.onStart) utterance.onstart = () => options.onStart?.();
      if (options?.onDone) utterance.onend = () => options.onDone?.();
      if (options?.onStopped) utterance.onerror = () => options.onStopped?.();
      window.speechSynthesis.speak(utterance);
    } else {
      options?.onStopped?.();
    }
    return;
  }

  Speech.speak(cleanText, {
    language: 'es-ES',
    rate: options?.rate ?? 0.98,
    pitch: options?.pitch ?? 1.0,
    onStart: options?.onStart,
    onDone: options?.onDone,
    onStopped: options?.onStopped,
    onError: () => options?.onStopped?.(),
  });
}

/**
 * Stops any ongoing Text-to-Speech playback across Mobile and Web.
 */
export async function stopSpeaking(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    await Speech.stop();
  } catch {
    // Ignore stop errors
  }
}

/**
 * Checks whether the TTS engine is currently speaking.
 */
export async function isCurrentlySpeaking(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        return Boolean(window.speechSynthesis.speaking);
      }
      return false;
    }
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}

/**
 * Announces a status update to active screen readers (TalkBack, VoiceOver, NVDA).
 */
export function announceStatus(message: string): void {
  if (!message.trim()) return;
  try {
    AccessibilityInfo.announceForAccessibility(message);
  } catch {
    // Ignore if unavailable
  }
}

