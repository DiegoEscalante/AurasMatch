# Justificaciones de Decisiones Técnicas — Proyecto AurasMatch

Este documento consolida y justifica las **decisiones técnicas, arquitectónicas, de accesibilidad, visión por computadora, almacenamiento y base de datos** tomadas durante todo el desarrollo de **AurasMatch**, junto con las alternativas evaluadas y los motivos de ingeniería que respaldan cada elección.

---

## 1. Metodología de Desarrollo e Ingeniería

### 1.1. Desarrollo Guiado por Especificaciones (*Spec-Driven Development* — SDD) en Fases 00–09
* **Decisión:** Dividir la ejecución del frontend y documentación en diez especificaciones secuenciales (`00` a `09` en [`docs/specs/`](specs/00-overview-and-rules.md)), acompañadas de documentos detallados por fase (`docs/phases/README-fase-01.md` a `README-fase-08.md`), glosario en [`docs/CONCEPTOS_Y_DEFINICIONES.md`](CONCEPTOS_Y_DEFINICIONES.md) y entregable final en [`docs/Entrega_Final_AurasMatch.md`](Entrega_Final_AurasMatch.md).
* **Alternativa descartada:** Implementar pantallas completas en un solo bloque monolítico sin contratos previos ni trazabilidad con las propuestas del curso.
* **Justificación:** El proyecto debía articular tres fuentes exigentes de forma simultánea: (1) la rúbrica oficial del curso, (2) los pilares de producto, CV y Anti-IA de la Propuesta de Fase 1, y (3) las 16 promesas de accesibilidad de la Propuesta de Fase 2. Trabajar por piezas acoplables (Motor de Accesibilidad → Primitivas UI → Datos/Auth → Navegación/Perfil → Feed → Detalle → Subida/IA → Extras → Entrega) permitió probar cada capa de forma aislada, mantener trazabilidad exacta en código y evitar regresiones al integrar módulos posteriores.

### 1.2. Regla Multiplataforma Móvil-Primero y Regla de Introspección Previa (Reglas 6 y 7 en `00-overview-and-rules.md`)
* **Decisión:** Establecer como reglas obligatorias de proyecto: (a) priorizar el comportamiento nativo de React Native en Android/iOS protegiendo atributos exclusivos de Web detrás de `Platform.OS === 'web'`, y (b) ejecutar una lista de verificación introspectiva (necesidad real, reutilización, seguridad sobre BD/RLS/backend y evidencia verificada) antes de cada cambio o comando externo.
* **Justificación:** Se evidenció empíricamente que atributos WAI-ARIA válidos en Web (como `accessibilityRole="region"` o `"dialog"`) provocan cierres fatales en nativo (`RCTViewManager` / `ReactAccessibilityDelegate`) y que scripts genéricos en BD sin verificar `pg_policies` podían alterar políticas funcionales o intentar crear triggers innecesarios sobre `auth.users`. Estas dos reglas convirtieron hallazgos reales de depuración en barreras preventivas permanentes.

---

## 2. Arquitectura del Cliente Móvil y Web (`frontend/`)

### 2.1. React Native `0.88.1` + Expo SDK `58` + TypeScript (`frontend/package.json`)
* **Decisión:** Construir la aplicación con React Native (`0.88.1`), Expo (`~58.0.21`), `expo-router` (`~58.0.28`), `react-native-web` (`~0.21.4`) y TypeScript (`~6.0.3`), activando rutas tipadas (`typedRoutes`) y `reactCompiler` en [`frontend/app.json`](../frontend/app.json).
* **Alternativa descartada:** Desarrollar código nativo separado en Kotlin/Swift o una aplicación únicamente Web.
* **Justificación:** Cumple el objetivo de aplicación móvil nativa multiplataforma (Android e iOS) conservando un único código fuente verificable también en navegador Web para pruebas rápidas de teclado (`Tab`, `Enter`, `Escape`) y lectores de pantalla de escritorio, con acceso directo a cámara/galería (`expo-image-picker`), vibración háptica (`expo-haptics`), síntesis de voz (`expo-speech`) y APIs nativas de accesibilidad (`AccessibilityInfo`, `BackHandler`).

### 2.2. Patrón *Headless Custom Hooks* (Arquitectura *"Stitch-Ready"*)
* **Decisión:** Aislar toda la lógica de negocio, llamadas de red, caché, borradores locales y reglas de estado dentro de hooks personalizados (`useFeed`, `useLookDetail`, `useUploadLook`, `useUserProfile`, `useAuth`, `useAccessibility`), manteniendo los archivos de ruta (`index.tsx`, `upload.tsx`, `profile.tsx`, `look/[id].tsx`) centrados en presentación accesible.
* **Alternativa descartada:** Escribir llamadas directas a `supabase` o `fetch` y lógica de transformación dentro de los componentes JSX de cada pantalla.
* **Justificación:** Garantiza separación de responsabilidades, facilita probar o modificar contratos de API en un único lugar y permite aplicar futuros rediseños visuales (por ejemplo, con herramientas de diseño/UI como Google Stitch) sin reescribir reglas de validación Anti-IA, manejo de errores `422`/`401` ni sincronización con Supabase.

### 2.3. React Context API + Bus de Eventos Ligero en lugar de Redux (`_layout.tsx`, `src/contexts/`, `supabase.ts`)
* **Decisión:** Utilizar tres proveedores de **React Context API** en [`_layout.tsx`](../frontend/src/app/_layout.tsx) (`AccessibilityProvider`, `AuthProvider` y `AnalysisLockProvider`), estado local dentro de hooks y un bus de eventos pub/sub (`notifyLookDataChanged` en [`supabase.ts`](../frontend/src/services/supabase.ts)) en lugar de instalar Redux Toolkit, Zustand o MobX.
* **Alternativa descartada:** Introducir Redux (`@reduxjs/toolkit`, `react-redux`) desde el inicio para manejar toda la aplicación.
* **Justificación:**
  1. El estado verdaderamente global de la app se limita a tres dominios estables: preferencias de accesibilidad (`accessibility-context.tsx`), sesión/perfil JWT (`auth-context.tsx`) y bloqueo del botón atrás durante análisis (`analysis-lock-context.tsx`).
  2. El *fetching* del Feed, detalle y perfil interactúa directamente con Supabase y Cloud Run; duplicar esos registros en un *store* global de Redux añadiría *boilerplate* (slices, thunks, normalización) innecesario para el alcance actual.
  3. Dado que la navegación por `<Slot />` desmonta/remonta rutas al cambiar de pestaña y esta versión de `expo-router` no expone `useFocusEffect`, el bus en memoria mantiene sincronizados likes, guardados, apelaciones y nuevas publicaciones entre `Feed`, `Detalle` y `Perfil` con costo mínimo.
  4. Al estar encapsulado detrás de hooks, el interior de `useFeed` o `useUserProfile` podría migrar a Redux Toolkit o TanStack Query en el futuro sin cambiar la interfaz de las pantallas.

### 2.4. Navegación de 3 Pestañas con `<Slot />` en lugar de `<Tabs>` por defecto (`app-tabs.tsx`)
* **Decisión:** Implementar [`app-tabs.tsx`](../frontend/src/components/app-tabs.tsx) con `<Slot />`, `usePathname()` y `useRouter()` en lugar del componente `<Tabs>` estándar de `expo-router/ui`.
* **Justificación:** El manejo interno de redirección de pestañas visibles (`useVisibleTabsWithRedirect`) en `expo-router/ui` cerraba o redirigía de forma prematura las rutas dinámicas fuera de pestaña (específicamente `/look/[id]`). Construir el contenedor sobre `<Slot />` conserva una barra inferior fija, predecible y accesible (`Feed`, `Subir`, `Usuario`) y permite deshabilitar los botones de navegación y el botón físico atrás de Android (`BackHandler` en [`analysis-lock-context.tsx`](../frontend/src/contexts/analysis-lock-context.tsx)) mientras corre el análisis de IA en Cloud Run.

### 2.5. Compatibilidad Estricta de Roles Nativos para `RCTView` en Android/iOS
* **Decisión:** Usar exclusivamente valores pertenecientes al enum nativo `ReactAccessibilityDelegate.AccessibilityRole` de React Native en la propiedad `accessibilityRole`, relegando atributos WAI-ARIA de Web (`role="dialog"`, `role="region"`, `aria-modal`, `tabIndex`) detrás de guardas `Platform.OS === 'web'` centralizadas en [`accessible-modal.tsx`](../frontend/src/components/ui/accessible-modal.tsx) y [`app-tabs.tsx`](../frontend/src/components/app-tabs.tsx).
* **Justificación:** En la implementación Android de React Native (`ReactAccessibilityDelegate.kt`), asignar un valor fuera del enum `AccessibilityRole` (como `"region"` o `"dialog"`) lanza `IllegalArgumentException` al actualizar la propiedad en `RCTView` y colapsa la pantalla. Para diálogos nativos, `<Modal accessibilityViewIsModal={true}>` ya informa correctamente al sistema móvil sin requerir `accessibilityRole="dialog"`.

### 2.6. Almacenamiento Local Seguro en SSR (`safeAuthStorage`) y Borradores Sin Expiración
* **Decisión:** Envolver `@react-native-async-storage/async-storage` en un adaptador `safeAuthStorage` ([`supabase.ts`](../frontend/src/services/supabase.ts)) que verifica `Platform.OS === 'web' && typeof window === 'undefined'`, activar `persistSession: true` + `autoRefreshToken: true`, y guardar borradores de publicación bajo `@aurasmatch/upload_look_draft_v1` sin temporizador de expiración ([`use-upload-look.ts`](../frontend/src/hooks/use-upload-look.ts)).
* **Justificación:** Evita fallos durante renderizado estático/SSR en Web donde `window` no existe, impide cierres abruptos de sesión y da cumplimiento directo a la promesa de accesibilidad cognitiva (Corte 2) de no descartar el trabajo del usuario por inactividad.

### 2.7. Compactación *DRY* del Frontend (`refactor/frontend-dry-compaction`)
* **Decisión:** Unificar los 6 diálogos emergentes en [`accessible-modal.tsx`](../frontend/src/components/ui/accessible-modal.tsx) (`AccessibleModal`) + `ContextualAuthModal`, los banners de acceso en [`action-banner-button.tsx`](../frontend/src/components/ui/action-banner-button.tsx), las tarjetas compactas 2-columnas en [`look-mini-card.tsx`](../frontend/src/components/look/look-mini-card.tsx), la lógica optimista de Like/Guardar en [`look-action-helpers.ts`](../frontend/src/hooks/look-action-helpers.ts) + `applyLookMutationToRow` ([`supabase.ts`](../frontend/src/services/supabase.ts)), `applyPickedImageAsset` en [`use-upload-look.ts`](../frontend/src/hooks/use-upload-look.ts), y los diccionarios de regiones/categorías en [`database.ts`](../frontend/src/types/database.ts), eliminando 8 módulos huérfanos sin uso.
* **Justificación:** Evita divergencias de accesibilidad (como roles Web sin guarda, tamaños táctiles inconsistentes o anuncios desfasados) al concentrar overlay, manejo de `Escape`, foco modal y rollback optimista en un único punto verificado, reduciendo código redundante sin afectar `backend/` ni las rutas tipadas de Expo Router.

---

## 3. Decisiones de Accesibilidad Universal (WCAG 2.1/2.2 AA y AAA)

### 3.1. Primitivas Accesibles Reutilizables (`frontend/src/components/ui/`)
* **Decisión:** Centralizar la accesibilidad en componentes base compartidos:
  * `AccessiblePressable`: fuerza `MinTouchTargetSize = 48` dp (`DEFAULT_HIT_SLOP` de `8` dp), `focusRing` visible de `2 px` por teclado (`onFocus`/`onBlur`) y respuesta háptica ligera.
  * `AccessibleCollapsible` (WCAG 2.4.1 *Bypass Blocks*): patrón plegable uniforme para Filtro Triple, Transparencia Anti-IA y Comentarios con `accessibilityState={{ expanded }}`, de modo que usuarios de teclado o *TalkBack*/*VoiceOver* puedan saltar bloques secundarios con una sola tabulación/desplazamiento.
  * `VisualAlertBanner`: unifica borde de severidad visual, `accessibilityRole="alert"`, `accessibilityLiveRegion`, háptica (`expo-haptics`/`navigator.vibrate`) y anuncio hablado para paridad auditiva/visual.
  * `StepZoomImage`: agrega botones discretos `- Zoom`, `+ Zoom` y reset (`100%` a `350%` en pasos de `50%`) junto al gesto *pinch-to-zoom* para usuarios con limitaciones motrices (WCAG 2.5.1).
  * `ColorSwatchBadge` + [`color-names.ts`](../frontend/src/utils/color-names.ts): oculta el círculo decorativo al lector de pantalla (`importantForAccessibility="no"`, `aria-hidden={true}`) y traduce cualquier código `HEX` a nombres descriptivos en español vía espacio CIELAB (WCAG 1.4.1).

### 3.2. Escalado Tipográfico Proporcional hasta `200%`, Dislexia y Rejilla Adaptativa
* **Decisión:** En [`themed-text.tsx`](../frontend/src/components/themed-text.tsx), escalar conjuntamente `fontSize` y `lineHeight` con `maxFontSizeMultiplier={2.0}`, sumar `+0.12` al ratio de interlineado cuando `prefs.dyslexia_font` está activo (Verdana/Arial o Courier), y en el Feed ([`index.tsx`](../frontend/src/app/index.tsx)) conmutar la `FlatList` de 2 columnas a 1 columna ancha cuando el escalado alcanza $\ge 150\%$ o el ancho es $< 340\text{ px}$.
* **Justificación:** Escalar únicamente el tamaño de fuente sin ajustar altura de línea ni columnas provoca superposición y recorte de texto (*clipping*), incumpliendo WCAG 1.4.4 (*Resize Text*).

### 3.3. Búsqueda Tolerante a Errores con Distancia de Levenshtein (`fuzzy-search.ts`)
* **Decisión:** Implementar en [`fuzzy-search.ts`](../frontend/src/utils/fuzzy-search.ts) normalización sin diacríticos combinada con distancia de Levenshtein optimizada con dos arreglos de fila (`prevRow` y `currRow`) en memoria, ofreciendo chips de sugerencia interactivos para subculturas, zonas faciales y familias de color.
* **Justificación:** Permite encontrar looks aunque el usuario escriba términos con errores tipográficos o sin tildes (p. ej. `"jiray"` o `"gotico"`), cumpliendo WCAG 3.3.3 (*Error Suggestion*) sin depender de servicios externos ni elevar el consumo de memoria móvil.

### 3.4. Compromiso Gradual (*Gradual Engagement*), *Alt-Text* IA y Barra de Voz (`AssistiveVoiceBar`)
* **Decisión:** Permitir navegar el Feed y el detalle de looks sin iniciar sesión, mostrando `ContextualAuthPrompt` o un modal únicamente al intentar dar *Me gusta*, guardar, comentar o subir fotografía; generar automáticamente en español una sugerencia editable de *Alt-Text* tras analizar el look; e incluir una paleta flotante opcional `AssistiveVoiceBar` con síntesis `expo-speech` / Web `speechSynthesis`.
* **Justificación:** Reduce la barrera de entrada en la primera apertura, garantiza contenido textual descriptivo para imágenes de maquillaje (WCAG 1.1.1) manteniendo control editorial del usuario, y facilita navegación por atajos verbales/rápidos para motricidad y baja visión.

---

## 4. Decisiones del Backend, Visión por Computadora e IA (`backend/`)

> Nota: El directorio `backend/` se mantuvo intacto como servicio desplegado en Google Cloud Run (`version 2.3.0`). Las decisiones documentadas abajo reflejan exactamente su implementación actual verificada.

### 4.1. Microservicio Independiente en FastAPI + Cloud Run sin GPU (`backend/Dockerfile`, `backend/app/main.py`)
* **Decisión:** Desplegar el pipeline de CV, inferencia Anti-IA, cálculo CIELAB y carga R2 en un servicio separado con FastAPI (`>=0.115.0`), Python 3.12 (`python:3.12-slim`) y CPU (`MEDIAPIPE_DISABLE_GPU=1`, `OPENBLAS_NUM_THREADS=1`, `OMP_NUM_THREADS=1`), verificando identidad mediante `verify_supabase_jwt` (`Authorization: Bearer <access_token>`).
* **Alternativa descartada:** Ejecutar modelos CV pesados dentro de la app móvil o mantener un servidor GPU permanente de alto costo.
* **Justificación:** Mantiene ligero el binario móvil, evita exponer credenciales privilegiadas (`service_role`, `jev_api_key`, claves R2) en el cliente y permite escalar bajo demanda en Cloud Run controlando memoria y concurrencia de hilos (`asyncio.to_thread` para MediaPipe/OpenCV y `asyncio.gather` para consultas concurrentes a Supabase + `Jev`).

### 4.2. De Segmentación Semántica Pesada a `MediaPipe FaceLandmarker` con Máscaras de Exclusión (`backend/app/cv/mediapipe_cv.py`)
* **Decisión:** Usar el modelo compacto `face_landmarker.task` (468 landmarks faciales) en modo *singleton* protegido por `threading.Lock`, construyendo polígonos positivos y de exclusión negativa (`lips`: `LIP_OUTER_POLYGON` menos `LIP_INNER_POLYGON`; `brows`; `eyelids`; `lash_line` excluyendo esclerótica `LEFT/RIGHT_EYE_SCLERA_POLYGON`).
* **Alternativa descartada:** Inferencia con redes pesadas de *face parsing* (`BiSeNet` / `SegFace`) sobre CPU en contenedor sin GPU.
* **Justificación:** La sustracción poligonal evita contaminar el muestreo cromático con píxeles de dientes, boca abierta o blanco del ojo, ejecutándose en milisegundos sobre CPU dentro del presupuesto de RAM de Cloud Run y devolviendo `422 Unprocessable Entity` claro si no hay rostro frontal detectable.

### 4.3. Espacio Perceptual CIELAB ($\Delta E$ CIE76) y Centroide Equivalente a `K=1` (`backend/app/cv/color_math.py`)
* **Decisión:** Convertir píxeles `sRGB -> CIE L*a*b* (iluminante D65)` y emparejar productos mediante distancia euclidiana $\Delta E$, calculando el color dominante de cada región enmascarada mediante la media aritmética de los píxeles válidos.
* **Justificación:** La distancia en RGB no corresponde con la percepción humana de similitud de pigmentos cosméticos, mientras que $\Delta E$ en CIELAB sí refleja cercanía perceptual real. Además, como documenta el propio código (`color_math.py`), para `KMeans(n_clusters=1)` el centroide es matemáticamente idéntico a la media aritmética, evitando asignaciones de memoria redundantes.

### 4.4. Clasificación Visual con `Jev` (`jev-latest`) en Paralelo (`backend/app/cv/vision_api.py`)
* **Decisión:** Consultar de forma asíncrona el endpoint estructurado del modelo visual `jev-latest` para clasificar simultáneamente la subcultura estética (`Jirai Kei`, `Clean Girl`, `Goth`, `E-Girl`, `Y2K`, `Other`) y emitir un puntaje visual de detección IA (`vision_ai_score`), en paralelo con el emparejamiento de los 3,085 SKUs de `public.products` en Supabase (`asyncio.gather`).
* **Justificación:** Elimina la necesidad de entrenar, cuantizar y alojar pesos locales de CLIP en memoria del contenedor, acorta el tiempo total de respuesta al paralelizar red con BD y aprovecha comprensión semántica moderna de subculturas emergentes.

### 4.5. Filtro Híbrido Anti-IA de 3 Etapas + Umbral `< 0.50` + Apelación Humana (`backend/app/cv/anti_ai.py`, `database.ts`)
* **Decisión:** Evaluar autenticidad humana fusionando tres señales complementarias en `evaluate_anti_ai_confidence`:
  1. **Etapa 1 — Procedencia Activa:** análisis de bytes crudos (antes de recodificar JPEG) buscando manifiestos C2PA/XMP/IPTC y firmas de generadores (`Midjourney`, `Flux.1`, `ComfyUI`, `DALL-E`, `trainedAlgorithmicMedia`) frente a firmas de captura física (`digitalCapture`, fabricantes de cámara).
  2. **Etapa 2 — Forense Pasivo CV:** análisis espectral FFT en dominio de frecuencias y microtextura dérmica en parches de mejillas (`LEFT/RIGHT_CHEEK_POLYGON`) y frente (`FOREHEAD_SKIN_POLYGON`) contrastados con nitidez periocular para distinguir piel humana suavemente iluminada de piel sintética tipo cera.
  3. **Etapa 3 — Fusión Multimodal y Defensa en Profundidad (`< 0.50`):** integración ponderada con `vision_ai_score`; si `ai_confidence_score >= 0.50`, `is_human_verified` queda en `false` y el cliente refuerza la misma regla mediante `ANTI_AI_REJECTION_THRESHOLD = 0.5` e `isLookHumanApproved()` en [`database.ts`](../frontend/src/types/database.ts) (bloqueando publicación al Feed en [`use-upload-look.ts`](../frontend/src/hooks/use-upload-look.ts) y filtrando tarjetas en Feed, Detalle y `LookMiniCard`), permitiendo al autor solicitar **apelación humana** (`appeal_status = 'pending'`) desde su perfil.
* **Justificación:** Ninguna señal aislada basta por sí sola (las redes sociales suelen eliminar EXIF y el maquillaje pesado puede suavizar la piel); combinar procedencia, física forense y visión semántica mitiga falsos positivos y la doble validación servidor-cliente garantiza que ningún contenido sintético se filtre al Feed público aun ante inconsistencias de caché o borradores antiguos.

### 4.6. Transporte Móvil en JSON Base64 (`POST /analyze-look`) y Modo Simulación Resiliente (`use-upload-look.ts`)
* **Decisión:** Aunque el backend mantiene tanto `POST /analyze-look/upload` (multiparte) como `POST /analyze-look` (JSON), el cliente móvil envía la imagen codificada en `image_base64` a `POST /analyze-look` con `upload_to_r2: true`; ante fallos de red/conectividad, habilita un **Modo Simulación** local sin bloquear la demostración de UI/accesibilidad.
* **Justificación:** React Native `0.88` lanzaba el error nativo `unsupported formdatapart implementation` al serializar archivos con `FormData` desde ciertas plataformas; enviar JSON Base64 unificó iOS, Android y Web en una sola ruta estable. El modo simulación garantiza resiliencia en evaluaciones offline o sin conectividad con Cloud Run.

---

## 5. Decisiones de Datos, Almacenamiento y Seguridad

### 5.1. Cloudflare R2 (Objetos JPEG) + Supabase PostgreSQL (Metadatos Relacionales)
* **Decisión:** Almacenar las imágenes en el bucket `auras-match` de **Cloudflare R2** (guardando únicamente rutas relativas como `user_looks/uuid.jpg` o `scraped_looks/uuid.jpg` en `looks.image_path`) y mantener perfiles, looks, catálogo `products` y `saved_looks` en Supabase PostgreSQL. En cliente, [`r2-storage.ts`](../frontend/src/services/r2-storage.ts) firma URLs con **AWS Signature Version 4 (SigV4)** mediante SHA-256 / HMAC-SHA256 puro en JavaScript síncrono.
* **Alternativa descartada:** Guardar imágenes en columnas `bytea` de PostgreSQL o instalar librerías pesadas de AWS SDK con *polyfills* de Node (`crypto`, `stream`) incompatibles con Hermes/React Native.
* **Justificación:** R2 evita costos de ancho de banda de salida y mantiene ligera la base relacional; la implementación SigV4 pura elimina fallos de dependencias Node en Metro/Hermes y evita bloquear el hilo con módulos nativos extra.

### 5.2. Extensión Aditiva del Esquema y Script Consolidado RLS/RPC (`docs/supabase-rls-and-rpcs.sql`)
* **Decisión:**
  1. Extender `public.looks` únicamente de manera aditiva (`description`, `liked_by`, `appeal_status`, `comments` con valores por defecto) para no romper el `INSERT` del microservicio en Cloud Run ni requerir cambios en `backend/`.
  2. Mantener la llave pública `anon` en el cliente (`frontend`) bajo Row-Level Security (RLS) sin exponer jamás `service_role` ni llamadas administrativas `auth.admin`.
  3. Añadir en una migración SQL quirúrgica ([`supabase-rls-and-rpcs.sql`](supabase-rls-and-rpcs.sql)) únicamente lo que faltaba sobre `public.looks` —sin tocar las políticas operativas existentes de `products`, `profiles`, `saved_looks` ni `auth.users`—:
     * Política `"looks_update_own"` (`FOR UPDATE TO authenticated`) para habilitar guardado de `description` (Alt-Text en publicación Cloud Run / edición) y `appeal_status`.
     * Trigger `protect_look_verification_columns` (`BEFORE UPDATE`) para impedir que roles cliente (`anon`/`authenticated`) alteren `user_id`, `is_human_verified`, `ai_confidence_score` o estados administrativos de apelación.
     * RPCs `SECURITY DEFINER` (`toggle_look_like(uuid)` y `add_look_comment(uuid, jsonb)`) con bloqueo de fila `FOR UPDATE`, validación en servidor (máximo 300 caracteres por comentario) y `NOTIFY pgrst, 'reload schema'`.
  4. En el cliente ([`supabase.ts`](../frontend/src/services/supabase.ts)), usar `.insert()` con manejo explícito de duplicados (`23505`) en lugar de `.upsert()` en `toggleLookSaved` y `saveUserCreatedLook`, junto a `ensureUserProfile()` idempotente al autenticar.
* **Justificación:** `.upsert()` emitía `ON CONFLICT DO UPDATE`, exigiendo innecesariamente políticas `UPDATE` en altas nuevas o toques repetidos. Asimismo, delegar likes y comentarios de terceros a funciones RPC `SECURITY DEFINER` permite a cualquier usuario autenticado interactuar con publicaciones de otros autores sin abrir escritura directa sobre columnas sensibles de `public.looks`.

