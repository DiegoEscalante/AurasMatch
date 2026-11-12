# Fase 07 — Pantalla de Subida, Análisis en Cloud Run, Alt-Text Accesible y Apelación Anti-IA

## 1. Resumen Ejecutivo y Propósito de la Pieza de Lego

El objetivo de la **Fase 07** es implementar de extremo a extremo la pantalla principal de **Subir y Analizar Maquillaje** (`frontend/src/app/upload.tsx`), conectando la interfaz táctil móvil con el microservicio FastAPI en Google Cloud Run (`POST /analyze-look/upload`), la persistencia en Cloudflare R2 y la base de datos Supabase, materializando las promesas clave de los documentos del curso:

1. **Fuente A (`Course Project Phase 3` — Rúbrica Oficial):**
   * Operación funcional de extremo a extremo (End-to-End) sin datos ficticios estáticos injustificados, integrando cliente móvil en React Native / Expo, microservicio en la nube, almacenamiento de objetos (R2) y base de datos relacional (Supabase).
   * Semántica para lectores de pantalla (*TalkBack / VoiceOver / NVDA*), áreas de toque amplias ($\ge 48 \times 48\text{ dp}$) y retroalimentación háptica/auditiva ante estados de carga y error.
2. **Fuente B (`Project Proposal.pdf` — Visión de Innovación y Mitigación de Riesgos):**
   * **Mitigación de iluminación/sombras (Sección IV.C):** Guía de iluminación desplegable (`LightingGuideCollapsible`) para educar sobre luz frontal natural uniforme antes de capturar el look, protegiendo la exactitud del cálculo perceptual CIELAB.
   * **Filtro híbrido Anti-IA y Apelación humana (Sección IV.C):** Muestra el estatus de realismo dérmico ($100\%$ humano vs. sospecha sintética) y permite solicitar una apelación manual en caso de falso positivo (`appeal_status = 'pending'`).
3. **Fuente C (`2ndPhaseProposal.pdf` — 16 Promesas de Accesibilidad):**
   * **Autoguardado sin temporizador de expiración (Sección V.B):** El borrador de la publicación se guarda automáticamente en `AsyncStorage` (`@aurasmatch/upload_look_draft_v1`) sin límite de tiempo, protegiendo a usuarios con fatiga mental o déficit de atención.
   * **Texto descriptivo (Alt-Text) sugerido por IA y editable (Sección V.D):** El sistema redacta en español una descripción accesible de la subcultura y tonos detectados, presentándola en un campo de texto para que el creador pueda editarla libremente antes de publicar.

---

## 2. Arquitectura de Archivos y Componentes Creados

```
frontend/
├── src/
│   ├── app/
│   │   └── upload.tsx                           # Pantalla principal con scroll unificado y flujo continuo
│   ├── components/
│   │   └── upload/
│   │       ├── lighting-guide-collapsible.tsx   # Menú desplegable con recomendaciones de iluminación frontal
│   │       └── ai-analysis-results-card.tsx     # Tarjeta de subcultura, badge Anti-IA, apelación y swatches
│   ├── hooks/
│   │   └── use-upload-look.ts                   # Hook headless que encapsula captura, Cloud Run, draft y apelación
│   └── services/
│       └── supabase.ts                          # Funciones updateLookDescription() y requestLookAppeal()
```

### 2.1. `frontend/src/hooks/use-upload-look.ts` (Headless Custom Hook)
Aísla la lógica de negocio y de red del renderizado visual:
* **`pickImageFromGallery()` y `takePhotoWithCamera()`:** Invoca `expo-image-picker` solicitando los permisos del sistema operativo. Genera un aspect ratio $4:5$ con compresión de calidad $0.82$.
* **`saveDraftLocally()`:** Serializa en segundo plano el URI de la imagen, los resultados preliminares y el texto alternativo escrito por el usuario en `AsyncStorage`.
* **`analyzeLook()`:**
  * Envía la imagen al microservicio FastAPI en Cloud Run (`${BACKEND_URL}/analyze-look/upload`) utilizando `multipart/form-data` y la cabecera `Authorization: Bearer <supabase_jwt>`.
  * El microservicio procesa en memoria MediaPipe FaceLandmarker, CIELAB, Anti-AI y el modelo Jev, sube automáticamente la foto a Cloudflare R2 en `user_looks/<uuid>.jpg` e inserta el look en Supabase.
  * Si MediaPipe no detecta rostro humano, captura el código `422 Unprocessable Entity` y activa `isNoFaceDetected = true`.
  * Si la red no está disponible, activa `isNetworkError = true` y ofrece la alternativa de contingencia asistida.
* **`runSimulatedAnalysis()`:** Modo de prueba asistido resiliente que emula localmente la extracción de regiones y clasificación para permitir evaluar la pantalla en cualquier dispositivo sin depender de que el backend local esté activo en ese instante.
* **`generateSuggestedAltText()`:** Función pura que traduce la subcultura y los valores HEX de labios, cejas, párpados y pestañas en una descripción detallada en español para personas con discapacidad visual.
* **`publishLook()`:** Actualiza la descripción en la tabla `looks` de Supabase y limpia el borrador local.
* **`submitAppeal()`:** Registra la solicitud de apelación humana en Supabase (`appeal_status = 'pending'`).

### 2.2. `frontend/src/components/upload/lighting-guide-collapsible.tsx`
* Utiliza el componente accesible unificado `AccessibleCollapsible` (`aria-expanded`, `accessibilityState={{ expanded }}`).
* Al estar cerrado por defecto, los usuarios de lectores de pantalla y teclado pueden saltar directamente a la zona de captura sin fatiga de navegación (WCAG 2.4.1 *Bypass Blocks*).
* Despliega consejos concretos:
  1. Luz frontal natural o blanca uniforme para no alterar el cálculo CIELAB ($L^*, a^*, b^*$).
  2. Evitar filtros de redes sociales para no activar el detector espectral FFT o de textura dérmica.
  3. Mantener labios, cejas y párpados visibles para la malla de 468 puntos de MediaPipe.

### 2.3. `frontend/src/components/upload/ai-analysis-results-card.tsx`
* **Insignia de Subcultura:** Exhibe la estética detectada (ej. `✨ Clean Girl`, `✨ Jirai Kei`) junto con el porcentaje de afinidad del modelo de visión.
* **Banner de Moderación Anti-IA:**
  * Si `is_human_verified === true`: Muestra fondo verde con la confirmación *"🛡️ 100% Origen Humano Verificado"*.
  * Si `is_human_verified === false`: Muestra advertencia ámbar con el botón accesible *"Solicitar Apelación Humana"*, cambiando el estado a *"🕒 Apelación en revisión humana"*.
* **Cuadrícula de Tonos Faciales Extraídos:** Lista las 4 regiones (`Labios`, `Párpados / Sombras`, `Cejas`, `Línea de Pestañas`) con su `ColorSwatchBadge`, nombre descriptivo en español (ej. *Nude / Beige suave*), código `HEX` y cantidad de cosméticos recomendados encontrados.

### 2.4. `frontend/src/app/upload.tsx`
* Pantalla principal construida bajo el patrón de **Flujo Unificado en Pantalla Continua (Scroll Asistido)**.
* **Compromiso Gradual:** Si el usuario no ha iniciado sesión, presenta el `ContextualAuthPrompt` permitiéndole autenticarse o entrar como `@aurasmatch_bot`.
* **Editor de Alt-Text:** Campo multilínea accesible con anuncio de conteo de caracteres y botón para *"Restaurar sugerencia original de IA"*.
* **Botonera de Publicación:** Botón prominente de $\ge 48\text{ dp}$ de altura (`MinTouchTargetSize`) con estados de carga accesibles (`ActivityIndicator` y `accessibilityLiveRegion`).

---

## 3. Matriz de Cumplimiento de Accesibilidad (WCAG 2.1 / 2.2 AA)

| Criterio WCAG / Propuesta | Implementación Técnica en Código | Verificación |
| :--- | :--- | :--- |
| **WCAG 1.1.1 Non-text Content** (`2ndPhaseProposal.pdf` V.D) | Generación automática de Alt-Text basada en tonos CIELAB y subcultura, editable en `TextInput` antes de guardar en `looks.description`. | Lectores de pantalla leen la descripción en lugar de solo decir "imagen". |
| **WCAG 2.2.1 Timing Adjustable** (`2ndPhaseProposal.pdf` V.B) | Borrador persistente en `AsyncStorage` (`@aurasmatch/upload_look_draft_v1`) sin límites de tiempo de sesión ni expiración. | Cambiar de pestaña en el menú inferior o recargar el navegador no pierde el trabajo. |
| **WCAG 2.4.1 Bypass Blocks** (Spec 00 Regla 2) | Guía de iluminación contenida dentro de `AccessibleCollapsible`. | Un usuario con teclado (`Tab`) puede saltar el bloque completo con un solo toque. |
| **WCAG 2.5.5 / 2.5.8 Target Size** (Fuente A Sección 3) | Todos los botones táctiles (`📷 Tomar Foto`, `🖼️ Galería`, `✨ Analizar`, `🚀 Publicar`) tienen altura $\ge 48\text{ dp}$ (`MinTouchTargetSize = 48`). | Facilidad de toque garantizada en móviles para motricidad reducida. |
| **WCAG 4.1.3 Status Messages** | Retroalimentación en vivo (`accessibilityLiveRegion="polite"`, `announceStatus`, vibración háptica `triggerHapticFeedback`). | TalkBack/VoiceOver anuncian el inicio y fin del análisis sin robar el foco. |
| **Mitigación de Falsos Positivos Anti-IA** (`Project Proposal.pdf` IV.C) | Botón de apelación humana cuando `ai_confidence_score >= 0.50`, actualizando `looks.appeal_status = 'pending'`. | Transparencia total y canal de apelación para el creador. |

---

## 4. Guía Práctica de Pruebas Paso a Paso

Para comprobar que todo lo implementado en la Fase 07 opera correctamente:

### Paso 1: Verificación de Tipos Estáticos
Ejecuta en la terminal de tu máquina:
```bash
cd frontend
npx tsc --noEmit
```
* **Resultado Esperado:** 0 errores de TypeScript (`exit code 0`).

### Paso 2: Prueba de Compromiso Gradual (Sin Sesión)
1. Inicia la app (`npm run web` o `npx expo start`).
2. Ve a la pestaña **Usuario** y presiona "Cerrar Sesión" si tienes una cuenta abierta.
3. Dirígete a la pestaña central **Subir**.
* **Resultado Esperado:** Se despliega el banner de `ContextualAuthPrompt` informando que puedes explorar el feed libremente, pero para subir fotografías a la IA se requiere iniciar sesión. Presiona el botón *"Entrar con cuenta bot de prueba (@aurasmatch_bot)"*.

### Paso 3: Prueba de la Guía de Iluminación Desplegable
1. En la parte superior de la pantalla **Subir**, ubica *"Guía de Iluminación para Extracción Exacta"*.
2. Presiónala (o pulsa `Enter` en teclado).
* **Resultado Esperado:** Se abre fluidamente el acordeón mostrando los 3 consejos (luz frontal natural, cero filtros de redes sociales y rasgos faciales despejados). Al volver a presionarlo, se pliega limpiamente.

### Paso 4: Selección de Fotografía y Autoguardado sin Expiración
1. Presiona el botón **"🖼️ Galería"** (o **"📷 Tomar Foto"** en tu celular).
2. Selecciona cualquier imagen de rostro o maquillaje de prueba.
* **Resultado Esperado:** La imagen aparece en la tarjeta de previsualización en formato $4:5$ con los botones *"🔄 Cambiar foto"* y *"🗑️ Eliminar"*.
3. Cambia a la pestaña **Feed** o recarga la página web (`F5`).
4. Vuelve a la pestaña **Subir**.
* **Resultado Esperado:** Aparece el banner azul *"Borrador Activo Guardado"* y la fotografía sigue allí intacta, sin haberse borrado por tiempo.

### Paso 5: Prueba de Análisis y Fallback Resiliente
1. Presiona el botón **"✨ Analizar Maquillaje con IA"**.
2. Si tienes la URL de Cloud Run en `EXPO_PUBLIC_BACKEND_URL`, la app se comunicará con el backend real en la nube.
3. Si el servidor está apagado o en reposo, se desplegará el banner informativo de conexión junto al botón:
   **"🧪 Probar con Simulación de Análisis (Fallback Asistido)"**.
4. Presiona el botón de simulación asistida.
* **Resultado Esperado:** Se muestra un indicador de carga animado y tras un breve instante se renderiza la **Tarjeta de Resultados**:
  * Subcultura clasificada con porcentaje de afinidad.
  * Insignia Anti-IA verde de *"100% Origen Humano Verificado"*.
  * Paleta con swatches de color y códigos HEX para labios, cejas y párpados.

### Paso 6: Edición del Alt-Text Accesible
1. Desplaza la pantalla hacia abajo hasta el bloque **"Texto Descriptivo (Alt-Text) para Accesibilidad"**.
2. Observa el texto redactado automáticamente por la IA con los tonos en español.
3. Escribe en el campo de texto para personalizar o añadir detalles adicionales.
* **Resultado Esperado:** El contador de caracteres se actualiza en tiempo real y aparece el botón *"↺ Restaurar sugerencia de IA"*. Si lo presionas, vuelve a la redacción original de la IA.

### Paso 7: Publicación y Navegación
1. Presiona el botón **"🚀 Publicar Look en la Comunidad"**.
* **Resultado Esperado:** El botón muestra el spinner de carga, emite retroalimentación háptica/auditiva y muestra el banner verde de éxito: *"¡Look Publicado con Éxito!"*.
2. Presiona el botón **"🔍 Ver Publicación en Detalle"**.
* **Resultado Esperado:** Navega directamente a la pantalla de detalle estilo Pinterest (`/look/[id]`) de la publicación que acabas de subir, exhibiendo su imagen real, la subcultura clasificada, los swatches de tonos extraídos y la descripción que editaste.

---

## 5. Resolución Técnica: Persistencia y Resolución Inmediata de Publicaciones Creadas (`userCreatedLooks`)

### El Problema
Al presionar el botón *"🔍 Ver Publicación en Detalle"*, la aplicación redirigía a `/look/[id]` pero mostraba el mensaje de error: *"No se encontró la publicación solicitada"*.

### Causa Raíz
Cuando una publicación era creada (ya sea mediante análisis en vivo o mediante el fallback de simulación asistida), su identificador `look_id` (`sim-...` o UUID recién generado) no existía en el conjunto de datos estático del espejo (`REAL_SUPABASE_MIRROR_LOOKS`) ni había sido consultado en la base de datos de Supabase. Al ejecutarse `useLookDetail(lookId)`, la función `fetchLookById(lookId)` no lo encontraba y devolvía `null`.

### Solución Implementada
1. **Extensión de `LocalLookOverrides` en [`supabase.ts`](../../frontend/src/services/supabase.ts):**
   * Se incorporó el campo `userCreatedLooks: LookRow[]` dentro del almacén persistente de `AsyncStorage`.
   * Se implementó la función `saveUserCreatedLook(look: LookRow)`.
2. **Prioridad en `fetchLookById`:**
   * La función `fetchLookById(lookId)` ahora consulta en primer lugar `overrides.userCreatedLooks`. Si coincide con el `look_id` recién subido, lo retorna inmediatamente con sus banderas de like, guardado, imagen resuelta y productos recomendados.
3. **Integración en `useUploadLook` y `useFeed`:**
   * Tanto al analizar como al publicar el look, se construye el registro completo `LookRow` con el autor (`profile.username`), la imagen local y la descripción personalizada, guardándolo con `saveUserCreatedLook`.
   * En `useFeed`, se anteponen los `userCreatedLooks` al inicio de la lista del Feed, garantizando que el usuario vea su publicación reflejada de inmediato tanto en la pantalla de detalle como en el Feed comunitario.


