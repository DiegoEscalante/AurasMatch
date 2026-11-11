# Spec 07 — Pantalla de Subir Publicación, Análisis IA, Alt-Text Editable y Apelación

## 1. Objetivo de la Pieza de Lego
Construir la tercera pantalla principal (**Subir Publicación**) conectada al microservicio FastAPI en Google Cloud Run (`POST /analyze-look`), integrando las promesas de `Project Proposal.pdf` y `2ndPhaseProposal.pdf`.

*(Nota: Como solicitó el usuario, antes de escribir el código de esta pantalla se le presentarán las opciones de diseño paso a paso para definir juntos cómo quiere exactamente el flujo visual de subida).*

## 2. Requerimientos Funcionales y de Accesibilidad que Debe Cumplir
1. **Captura o Selección de Imagen (`expo-image-picker`):**
   - Botones accesibles ($\ge 48 \times 48\text{ dp}$) para elegir foto de la galería o tomar foto con la cámara, incluyendo una breve guía de iluminación frontal (mitigación de limitaciones técnicas de la Sección IV.C del Proposal).
2. **Autoguardado sin Temporizador (`2ndPhaseProposal.pdf` Sección V.B):**
   - Mientras el usuario prepara su publicación o edita la descripción, el borrador se guarda localmente en `AsyncStorage` sin límite de tiempo para que no se pierda si cambia de pestaña.
3. **Análisis en Vivo con el Backend en Cloud Run (`useAnalyzeLook` hook):**
   - Envía la imagen y el token `Authorization: Bearer <supabase_jwt>` a `POST /analyze-look`.
   - Maneja de forma amigable y accesible el error `422` (cuando MediaPipe no detecta un rostro en la imagen) y errores de red.
4. **Texto Descriptivo (Alt-Text) Sugerido por IA y Editable Manualmente (`2ndPhaseProposal.pdf` Sección V.D):**
   - Una vez que el backend responde con la subcultura, el puntaje Anti-IA y las regiones extraídas (`extracted_regions`), la app genera automáticamente una descripción sugerida detallada y la coloca en un campo de texto editable por el usuario, guardándola en `looks.description`.
5. **Mecanismo de Apelación Anti-IA (`Project Proposal.pdf` Sección IV.C):**
   - Si el backend clasifica la foto con `is_human_verified = false` (`ai_confidence_score >= 0.50`), se informa claramente al usuario el motivo y se le habilita el botón **"Solicitar apelación de foto humana real"**, actualizando `looks.appeal_status = 'pending'`.

