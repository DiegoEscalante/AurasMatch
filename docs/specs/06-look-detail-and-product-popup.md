# Spec 06 — Detalles de la Publicación (Estilo Pinterest), Popup de Producto y Mini-Feed Similar

## 1. Objetivo de la Pieza de Lego
Construir la pantalla de **Detalles de la Publicación (`src/app/look/[id].tsx`)** siguiendo el flujo estilo Pinterest diseñado por el usuario, incluyendo el **Popup de detalles del producto** (con gestión de foco en Móvil y Web) y el **Mini-feed de publicaciones similares**.

## 2. Estructura de la Pantalla de Detalle (`useLookDetail` hook)
1. **Fotografía del Look con Zoom por Botones (`StepZoomImage`):**
   - Muestra la imagen desde Cloudflare R2 con botones simples de `+ Zoom` / `- Zoom` ($\ge 48 \times 48\text{ dp}$) activables con un toque o tecla `Enter` para inspeccionar ojos y labios sin exigir *pinch-to-zoom*.
2. **Barra de Acciones Accesibles ($\ge 48 \times 48\text{ dp}$ + Alertas Visuales/Hápticas):**
   - **Like (Corazón):** Actualiza `looks.liked_by` con respuesta optimista + banner visual/vibración háptica.
   - **Guardar (Marcador):** Inserta/elimina en `public.saved_looks` + banner visual/vibración háptica.
   - **Compartir (Flecha):** Abre el diálogo de compartir + confirmación visual/háptica.
   - **Escuchar Descripción (Voice-to-Speech Multiplataforma):** Usa `speakDescription()` (`expo-speech` en móvil y `window.speechSynthesis` en Web) para leer en voz alta la descripción, la subcultura y los nombres en español de los tonos detectados (cumpliendo la promesa D.1 de `2ndPhaseProposal.pdf`).
3. **Insignia Desplegable de Transparencia Anti-IA:**
   - Muestra el porcentaje de autenticidad humana (`(1 - ai_confidence_score) * 100%`) y el autor (`@username`). Al tocarla o presionar `Enter`, despliega los puntajes de verificación (Metadatos C2PA, Análisis Espectral, Microtextura Facial y Modelo Visual).
4. **Lista de Productos Recomendados por Región Facial (`lips`, `brows`, `eyelids`, `lash_line`):**
   - Muestra para cada región el color extraído (`ColorSwatchBadge` con swatch + nombre del color en español + código `HEX`) y los cosméticos recomendados (`recommended_skus`) hidratados desde `public.products`.
   - **Interacción clave:** Presionar cualquiera de estos productos **NO navega a otra pantalla**, sino que abre el **Popup de Detalles del Producto**.
5. **Popup (Modal Accesible) de Detalles del Producto (Móvil + Web Focus Trap):**
   - Muestra los datos reales de `public.products`: imagen normalizada (`https://`), marca (`brand`), nombre (`product_name`), tono (`shade_name`), categoría (`category`), muestra de color con nombre en español + `hex_value`, coordenadas `CIELAB` y precio (`price_usd`).
   - **Estándar de industria en Móvil y Web:**
     - En iOS/Android: usa `accessibilityViewIsModal={true}` y `onAccessibilityEscape` para atrapar el foco de VoiceOver/TalkBack.
     - En Web: usa `role="dialog"`, `aria-modal={true}`, mueve el foco automáticamente al abrirse el popup, permite cerrarlo con la tecla **`Escape`**, y al cerrarse **devuelve el foco exactamente al botón del producto que lo abrió**.
6. **Mini-Feed de Publicaciones Similares:**
   - Debajo de la lista de productos recomendados, muestra una cuadrícula/lista compacta de otras publicaciones verificadas (`is_human_verified = true`) que comparten la misma subcultura (`subculture`) o tonos cercanos.
