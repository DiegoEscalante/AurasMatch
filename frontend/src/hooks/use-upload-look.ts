/**
 * Headless Custom Hook for Upload & AI Analysis Screen (`src/app/upload.tsx`).
 * Encapsulates camera/gallery capture (`expo-image-picker`), live connection to
 * Cloud Run FastAPI (`POST /analyze-look/upload`), resilient testing fallback,
 * autosaved draft in AsyncStorage without expiration timers (`2ndPhaseProposal.pdf` Section V.B),
 * AI-generated alt-text suggestion and editing (`2ndPhaseProposal.pdf` Section V.D),
 * and human appeal for false positive Anti-AI rejections (`Project Proposal.pdf` Section IV.C).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import {
  BACKEND_URL,
  isSupabaseConfigured,
  requestLookAppeal,
  resolveLookImageUrl,
  saveUserCreatedLook,
  supabase,
  updateLookDescription,
} from '@/services/supabase';
import {
  AestheticSubculture,
  AppealStatus,
  ExtractedRegionsMap,
  FacialRegionKey,
  LookRow,
} from '@/types/database';
import {
  announceStatus,
  triggerHapticFeedback,
} from '@/utils/a11y-feedback';
import { getSpanishColorName } from '@/utils/color-names';

export const UPLOAD_DRAFT_KEY = '@aurasmatch/upload_look_draft_v1';

export interface LookAnalysisData {
  look_id: string;
  image_path: string;
  choice: string;
  subculture: string[];
  is_human_verified: boolean;
  ai_confidence_score: number;
  subculture_confidence_score: number;
  tags: string[];
  extracted_regions: ExtractedRegionsMap;
  is_simulated?: boolean;
}

export interface UploadDraft {
  imageUri: string | null;
  imageMimeType: string | null;
  analysisResult: LookAnalysisData | null;
  altText: string;
  appealStatus: AppealStatus;
  savedAt: string;
}

export type UploadScreenStatus =
  | 'idle'
  | 'ready_to_analyze'
  | 'analyzing'
  | 'analyzed'
  | 'publishing'
  | 'published'
  | 'error';

export interface UseUploadLookResult {
  status: UploadScreenStatus;
  imageUri: string | null;
  analysisResult: LookAnalysisData | null;
  altText: string;
  suggestedAltText: string;
  errorMessage: string | null;
  isNoFaceDetected: boolean;
  isNetworkError: boolean;
  isSimulated: boolean;
  appealStatus: AppealStatus;
  isAppealing: boolean;
  isPublished: boolean;
  publishedLookId: string | null;
  hasDraft: boolean;
  draftSavedAt: string | null;
  // Actions
  pickImageFromGallery: () => Promise<void>;
  takePhotoWithCamera: () => Promise<void>;
  clearImage: () => Promise<void>;
  setAltText: (text: string) => void;
  restoreSuggestedAltText: () => void;
  analyzeLook: () => Promise<void>;
  runSimulatedAnalysis: () => Promise<void>;
  publishLook: () => Promise<void>;
  submitAppeal: () => Promise<void>;
  discardDraft: () => Promise<void>;
}

/**
 * Builds an accessible Spanish description (Alt-Text) from extracted regions and subculture.
 * Fulfills 2ndPhaseProposal.pdf Section V.D (AI-suggested Alt-Text for visual diversity).
 */
export function generateSuggestedAltText(
  subcultureName: string,
  regions?: ExtractedRegionsMap,
  isHumanVerified: boolean = true
): string {
  const parts: string[] = [];
  parts.push(`Fotografía de maquillaje con estética estilo ${subcultureName}.`);

  if (regions) {
    if (regions.lips?.hex_value) {
      parts.push(
        `En labios destaca un tono ${getSpanishColorName(regions.lips.hex_value)} (${regions.lips.hex_value.toUpperCase()}).`
      );
    }
    if (regions.eyelids?.hex_value) {
      parts.push(
        `En sombras de ojos destaca ${getSpanishColorName(regions.eyelids.hex_value)} (${regions.eyelids.hex_value.toUpperCase()}).`
      );
    }
    if (regions.brows?.hex_value) {
      parts.push(
        `En cejas destaca ${getSpanishColorName(regions.brows.hex_value)} (${regions.brows.hex_value.toUpperCase()}).`
      );
    }
    if (regions.lash_line?.hex_value) {
      parts.push(
        `En delineado y pestañas destaca ${getSpanishColorName(regions.lash_line.hex_value)} (${regions.lash_line.hex_value.toUpperCase()}).`
      );
    }
  }

  if (isHumanVerified) {
    parts.push('Fotografía verificada de origen humano con textura dérmica natural.');
  } else {
    parts.push('Aviso de moderación: Fotografía clasificada con posible generación sintética por IA.');
  }

  return parts.join(' ');
}

export function useUploadLook(): UseUploadLookResult {
  const { session, user, profile } = useAuth();

  const [status, setStatus] = useState<UploadScreenStatus>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<LookAnalysisData | null>(null);
  const [altText, setAltTextState] = useState<string>('');
  const [suggestedAltText, setSuggestedAltText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNoFaceDetected, setIsNoFaceDetected] = useState<boolean>(false);
  const [isNetworkError, setIsNetworkError] = useState<boolean>(false);
  const [appealStatus, setAppealStatus] = useState<AppealStatus>('none');
  const [isAppealing, setIsAppealing] = useState<boolean>(false);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [publishedLookId, setPublishedLookId] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const isRestoringDraft = useRef<boolean>(true);

  // 1. Restore autosaved draft on mount (without expiration timer)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const rawDraft = await AsyncStorage.getItem(UPLOAD_DRAFT_KEY);
        if (!rawDraft) {
          isRestoringDraft.current = false;
          return;
        }

        const draft: UploadDraft = JSON.parse(rawDraft);
        if (isMounted && draft.imageUri) {
          setImageUri(draft.imageUri);
          setImageMimeType(draft.imageMimeType || 'image/jpeg');
          setAnalysisResult(draft.analysisResult);
          setAltTextState(draft.altText || '');
          setAppealStatus(draft.appealStatus || 'none');
          setDraftSavedAt(draft.savedAt || null);
          setHasDraft(true);

          if (draft.analysisResult) {
            const sub = draft.analysisResult.choice || draft.analysisResult.subculture?.[0] || 'Clean Girl';
            setSuggestedAltText(
              generateSuggestedAltText(
                sub,
                draft.analysisResult.extracted_regions,
                draft.analysisResult.is_human_verified
              )
            );
            setStatus('analyzed');
          } else {
            setStatus('ready_to_analyze');
          }
        }
      } catch {
        // Fallback to empty draft
      } finally {
        isRestoringDraft.current = false;
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Persist draft whenever meaningful data changes (AsyncStorage)
  const saveDraftLocally = useCallback(
    async (
      currentUri: string | null,
      currentMime: string | null,
      currentAnalysis: LookAnalysisData | null,
      currentAlt: string,
      currentAppeal: AppealStatus
    ) => {
      if (isRestoringDraft.current) return;

      if (!currentUri) {
        await AsyncStorage.removeItem(UPLOAD_DRAFT_KEY);
        setHasDraft(false);
        setDraftSavedAt(null);
        return;
      }

      const now = new Date().toISOString();
      const draft: UploadDraft = {
        imageUri: currentUri,
        imageMimeType: currentMime,
        analysisResult: currentAnalysis,
        altText: currentAlt,
        appealStatus: currentAppeal,
        savedAt: now,
      };

      try {
        await AsyncStorage.setItem(UPLOAD_DRAFT_KEY, JSON.stringify(draft));
        setHasDraft(true);
        setDraftSavedAt(now);
      } catch {
        // Safe storage error handling
      }
    },
    []
  );

  // Set user-edited alt-text and update draft
  const setAltText = useCallback(
    (text: string) => {
      setAltTextState(text);
      saveDraftLocally(imageUri, imageMimeType, analysisResult, text, appealStatus);
    },
    [imageUri, imageMimeType, analysisResult, appealStatus, saveDraftLocally]
  );

  // Restore AI-suggested alt-text
  const restoreSuggestedAltText = useCallback(() => {
    if (!suggestedAltText) return;
    setAltTextState(suggestedAltText);
    saveDraftLocally(imageUri, imageMimeType, analysisResult, suggestedAltText, appealStatus);
    triggerHapticFeedback('light');
    announceStatus('Texto alternativo original de IA restaurado.');
  }, [suggestedAltText, imageUri, imageMimeType, analysisResult, appealStatus, saveDraftLocally]);

  // Discard draft completely
  const discardDraft = useCallback(async () => {
    await AsyncStorage.removeItem(UPLOAD_DRAFT_KEY);
    setImageUri(null);
    setImageMimeType(null);
    setAnalysisResult(null);
    setAltTextState('');
    setSuggestedAltText('');
    setErrorMessage(null);
    setIsNoFaceDetected(false);
    setIsNetworkError(false);
    setAppealStatus('none');
    setIsPublished(false);
    setPublishedLookId(null);
    setHasDraft(false);
    setDraftSavedAt(null);
    setStatus('idle');
    triggerHapticFeedback('light');
    announceStatus('Borrador descartado.');
  }, []);

  // Clear current image
  const clearImage = useCallback(async () => {
    await discardDraft();
  }, [discardDraft]);

  // Gallery Picker
  const pickImageFromGallery = useCallback(async () => {
    setErrorMessage(null);
    setIsNoFaceDetected(false);
    setIsNetworkError(false);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.82,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageMimeType(asset.mimeType || 'image/jpeg');
        setAnalysisResult(null);
        setAltTextState('');
        setSuggestedAltText('');
        setStatus('ready_to_analyze');
        triggerHapticFeedback('medium');
        announceStatus('Imagen seleccionada de la galería. Lista para analizar.');
        await saveDraftLocally(asset.uri, asset.mimeType || 'image/jpeg', null, '', 'none');
      }
    } catch (err: any) {
      setErrorMessage(`Error al abrir la galería: ${err?.message || 'Permiso denegado'}`);
      triggerHapticFeedback('error');
    }
  }, [saveDraftLocally]);

  // Camera Capture
  const takePhotoWithCamera = useCallback(async () => {
    setErrorMessage(null);
    setIsNoFaceDetected(false);
    setIsNetworkError(false);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Se requiere permiso de cámara para capturar tu maquillaje directamente.');
        triggerHapticFeedback('warning');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.82,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageMimeType(asset.mimeType || 'image/jpeg');
        setAnalysisResult(null);
        setAltTextState('');
        setSuggestedAltText('');
        setStatus('ready_to_analyze');
        triggerHapticFeedback('medium');
        announceStatus('Foto capturada con la cámara. Lista para analizar.');
        await saveDraftLocally(asset.uri, asset.mimeType || 'image/jpeg', null, '', 'none');
      }
    } catch (err: any) {
      setErrorMessage(`Error al abrir la cámara: ${err?.message || 'Error de hardware'}`);
      triggerHapticFeedback('error');
    }
  }, [saveDraftLocally]);

  // Execute Analysis with Cloud Run FastAPI `/analyze-look/upload`
  const analyzeLook = useCallback(async () => {
    if (!imageUri) {
      setErrorMessage('Selecciona o toma una fotografía antes de analizar.');
      return;
    }

    setStatus('analyzing');
    setErrorMessage(null);
    setIsNoFaceDetected(false);
    setIsNetworkError(false);
    triggerHapticFeedback('light');
    announceStatus('Analizando fotografía con MediaPipe y el motor Anti-IA...');

    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const fetchRes = await fetch(imageUri);
        const blob = await fetchRes.blob();
        formData.append('file', blob, 'user_look.jpg');
      } else {
        formData.append('file', {
          uri: imageUri,
          type: imageMimeType || 'image/jpeg',
          name: 'user_look.jpg',
        } as any);
      }

      formData.append('r2_folder', 'user_looks');

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${BACKEND_URL}/analyze-look/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 422) {
        // MediaPipe FaceLandmarker failed to find 468 facial landmarks
        setIsNoFaceDetected(true);
        setStatus('error');
        setErrorMessage(
          'MediaPipe no detectó un rostro claro en la imagen. Por favor, encuadra frontalmente tu rostro asegurando luz uniforme en ojos y labios.'
        );
        triggerHapticFeedback('warning');
        announceStatus('Error: Rostro no detectado.');
        return;
      }

      if (response.status === 401) {
        setStatus('error');
        setErrorMessage('Tu sesión ha expirado o no es válida. Por favor, inicia sesión nuevamente.');
        triggerHapticFeedback('error');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Servidor Cloud Run respondió código ${response.status}: ${errorText}`);
      }

      const data: LookAnalysisData = await response.json();
      setAnalysisResult(data);
      setStatus('analyzed');

      const subcultureName = data.choice || data.subculture?.[0] || 'Clean Girl';
      const suggested = generateSuggestedAltText(
        subcultureName,
        data.extracted_regions,
        data.is_human_verified
      );
      setSuggestedAltText(suggested);
      setAltTextState(suggested);

      // Register look row locally so it immediately resolves in detail view and feed
      const initialLookRow: LookRow = {
        id: data.look_id,
        user_id: user?.id || 'demo-user',
        author_username: profile?.username || 'usuario_auras',
        image_path: data.image_path || imageUri || '',
        is_human_verified: data.is_human_verified,
        ai_confidence_score: data.ai_confidence_score,
        subculture: data.subculture || [subcultureName],
        subculture_confidence_score: data.subculture_confidence_score,
        extracted_regions: data.extracted_regions,
        tags: data.tags || ['makeup'],
        created_at: new Date().toISOString(),
        description: suggested,
        liked_by: [],
        appeal_status: 'none',
        comments: [],
        resolved_image_url: imageUri || resolveLookImageUrl(data.image_path, data.look_id),
      };
      await saveUserCreatedLook(initialLookRow);

      await saveDraftLocally(
        imageUri,
        imageMimeType,
        data,
        suggested,
        'none'
      );

      triggerHapticFeedback('success');
      announceStatus(
        `Análisis completado. Subcultura clasificada: ${subcultureName}. Estado Anti-IA: ${
          data.is_human_verified ? 'Verificado como humano' : 'Sospecha sintética'
        }.`
      );
    } catch (err: any) {
      setIsNetworkError(true);
      setStatus('error');
      setErrorMessage(
        `No fue posible conectar con el microservicio en Cloud Run (${BACKEND_URL}). Verifica la conexión o usa el Modo Simulación de Análisis para probar la pantalla.`
      );
      triggerHapticFeedback('warning');
    }
  }, [imageUri, imageMimeType, session, saveDraftLocally]);

  // Resilient Simulated Analysis (Approved fallback for testing without active backend server)
  const runSimulatedAnalysis = useCallback(async () => {
    if (!imageUri) return;

    setStatus('analyzing');
    setErrorMessage(null);
    setIsNoFaceDetected(false);
    setIsNetworkError(false);
    triggerHapticFeedback('light');
    announceStatus('Iniciando simulación de análisis de visión por computadora...');

    // Small delay to simulate realistic CV processing
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Choose realistic subculture & extraction
    const mockSubcultures: AestheticSubculture[] = [
      'Clean Girl',
      'Jirai Kei',
      'Goth',
      'E-Girl',
      'Y2K',
    ];
    const pickedSubculture = mockSubcultures[Math.floor(Math.random() * mockSubcultures.length)];

    // Generate valid UUID format so Postgres/Supabase syntax validation never fails
    const newLookUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    const simulatedData: LookAnalysisData = {
      look_id: newLookUuid,
      image_path: `user_looks/${newLookUuid}.jpg`,
      choice: pickedSubculture,
      subculture: [pickedSubculture],
      is_human_verified: true,
      ai_confidence_score: 0.08,
      subculture_confidence_score: 0.94,
      tags: [pickedSubculture.toLowerCase(), 'makeup', 'human_verified'],
      extracted_regions: {
        lips: {
          hex_value: '#D18274',
          recommended_skus: { lipstick: 440, lip_liner: 1 },
        },
        eyelids: {
          hex_value: '#E8C4B8',
          recommended_skus: { eyeshadow: 122 },
        },
        brows: {
          hex_value: '#543D32',
          recommended_skus: { eyebrow: 642 },
        },
        lash_line: {
          hex_value: '#262423',
          recommended_skus: { eyeliner: 751, mascara: 267 },
        },
      },
      is_simulated: true,
    };

    setAnalysisResult(simulatedData);
    setStatus('analyzed');

    const suggested = generateSuggestedAltText(
      pickedSubculture,
      simulatedData.extracted_regions,
      simulatedData.is_human_verified
    );
    setSuggestedAltText(suggested);
    setAltTextState(suggested);

    // Register simulated look locally so it immediately resolves in detail view and feed
    const simulatedLookRow: LookRow = {
      id: simulatedData.look_id,
      user_id: user?.id || 'demo-user',
      author_username: profile?.username || 'usuario_auras',
      image_path: simulatedData.image_path,
      is_human_verified: simulatedData.is_human_verified,
      ai_confidence_score: simulatedData.ai_confidence_score,
      subculture: simulatedData.subculture,
      subculture_confidence_score: simulatedData.subculture_confidence_score,
      extracted_regions: simulatedData.extracted_regions,
      tags: simulatedData.tags,
      created_at: new Date().toISOString(),
      description: suggested,
      liked_by: [],
      appeal_status: 'none',
      comments: [],
      resolved_image_url: imageUri || resolveLookImageUrl(simulatedData.image_path, simulatedData.look_id),
    };
    await saveUserCreatedLook(simulatedLookRow);

    await saveDraftLocally(
      imageUri,
      imageMimeType,
      simulatedData,
      suggested,
      'none'
    );

    triggerHapticFeedback('success');
    announceStatus(
      `Simulación completada. Subcultura clasificada: ${pickedSubculture}. Tono de labios y ojos extraído con éxito.`
    );
  }, [imageUri, imageMimeType, user, profile, saveDraftLocally]);

  // Publish Look (saves description in Supabase and clears draft)
  const publishLook = useCallback(async () => {
    if (!analysisResult) return;

    setStatus('publishing');
    triggerHapticFeedback('light');
    announceStatus('Publicando look en la comunidad...');

    try {
      const subcultureList =
        analysisResult.subculture && analysisResult.subculture.length > 0
          ? analysisResult.subculture
          : [analysisResult.choice || 'Clean Girl'];

      const publishedLook: LookRow = {
        id: analysisResult.look_id,
        user_id: user?.id || 'demo-user',
        author_username: profile?.username || 'usuario_auras',
        image_path: analysisResult.image_path || imageUri || '',
        is_human_verified: analysisResult.is_human_verified,
        ai_confidence_score: analysisResult.ai_confidence_score,
        subculture: subcultureList,
        subculture_confidence_score: analysisResult.subculture_confidence_score,
        extracted_regions: analysisResult.extracted_regions,
        tags:
          analysisResult.tags && analysisResult.tags.length > 0
            ? analysisResult.tags
            : ['makeup'],
        created_at: new Date().toISOString(),
        description: altText,
        liked_by: [],
        appeal_status: appealStatus,
        comments: [],
        resolved_image_url:
          imageUri || resolveLookImageUrl(analysisResult.image_path, analysisResult.look_id),
      };

      await saveUserCreatedLook(publishedLook);
      await updateLookDescription(analysisResult.look_id, altText);

      // Clean draft
      await AsyncStorage.removeItem(UPLOAD_DRAFT_KEY);
      setHasDraft(false);
      setDraftSavedAt(null);

      setIsPublished(true);
      setPublishedLookId(analysisResult.look_id);
      setStatus('published');

      triggerHapticFeedback('success');
      announceStatus('¡Look publicado con éxito en AurasMatch!');
    } catch (err: any) {
      setStatus('analyzed');
      setErrorMessage(`Error al publicar look: ${err?.message || 'Error desconocido'}`);
      triggerHapticFeedback('error');
    }
  }, [analysisResult, altText, imageUri, appealStatus, user, profile]);

  // Submit Anti-AI Appeal
  const submitAppeal = useCallback(async () => {
    if (!analysisResult) return;

    setIsAppealing(true);
    triggerHapticFeedback('light');
    announceStatus('Enviando solicitud de apelación humana...');

    try {
      await requestLookAppeal(analysisResult.look_id);
      setAppealStatus('pending');
      await saveDraftLocally(imageUri, imageMimeType, analysisResult, altText, 'pending');

      triggerHapticFeedback('success');
      announceStatus('Solicitud de apelación enviada. Un revisor humano evaluará tu fotografía.');
    } catch (err: any) {
      setErrorMessage(`Error al solicitar apelación: ${err?.message || 'Error de red'}`);
      triggerHapticFeedback('error');
    } finally {
      setIsAppealing(false);
    }
  }, [analysisResult, imageUri, imageMimeType, altText, saveDraftLocally]);

  const isSimulated = Boolean(analysisResult?.is_simulated);

  return {
    status,
    imageUri,
    analysisResult,
    altText,
    suggestedAltText,
    errorMessage,
    isNoFaceDetected,
    isNetworkError,
    isSimulated,
    appealStatus,
    isAppealing,
    isPublished,
    publishedLookId,
    hasDraft,
    draftSavedAt,
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
  };
}

