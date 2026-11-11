# Spec 02 — Primitivas UI Accesibles Multiplataforma (Móvil + Web, "Stitch-Ready")

## 1. Objetivo de la Pieza de Lego
Crear un conjunto mínimo y compacto de componentes base reutilizables que concentren las propiedades nativas de accesibilidad móvil (iOS VoiceOver / Android TalkBack) y de accesibilidad Web (WAI-ARIA / Teclado / NVDA).

## 2. Componentes y Helpers Atómicos a Construir
1. **Helpers Multiplataforma de Voz y Háptica (`src/utils/a11y-feedback.ts`):**
   - `triggerHapticFeedback()`: ejecuta `expo-haptics` en iOS/Android y hace fallback limpio sin error en Web (`Platform.OS === 'web'`).
   - `speakDescription(text)` / `stopSpeaking()`: ejecuta `expo-speech` en iOS/Android y `window.speechSynthesis` en español en Web.
   - `announceStatus(message)`: ejecuta `AccessibilityInfo.announceForAccessibility(message)` para lectores de pantalla.
2. **`AccessiblePressable` (`src/components/ui/accessible-pressable.tsx`):**
   - Garantiza área táctil mínima de $48 \times 48\text{ dp}$ ($\ge 44 \times 44\text{ pt}$) y `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}`.
   - Exige `accessibilityLabel` y mapea simultáneamente las propiedades nativas (`accessibilityRole`, `accessibilityState`, `accessibilityHint`, `accessibilityActions`) y los atributos Web (`role`, `aria-label`, `aria-expanded`, `aria-selected`, `aria-busy`, `tabIndex={0}`).
   - Muestra un **anillo de foco de alto contraste (`focusRing`)** cuando recibe foco por teclado (`onFocus` / `onBlur`), cumpliendo la promesa de navegación por teclado (`Tab`, `Enter`, `Espacio`) de `2ndPhaseProposal.pdf`.
3. **`AccessibleCollapsible` (Evolución de `src/components/ui/collapsible.tsx`):**
   - Implementa el patrón de **Menú Desplegable Accesible (WCAG 2.4.1 *Bypass Blocks* / WAI-ARIA *Disclosure Pattern*)** que se reutilizará en toda la app (Filtro Triple del Feed, Menú de Opciones de Accesibilidad en Perfil, Desglose Anti-IA en Detalle y Guía/Comentarios).
   - Utiliza `AccessiblePressable` en su encabezado ($\ge 48\text{ dp}$) con `accessibilityRole="button"`, `accessibilityState={{ expanded: isOpen }}` y `aria-expanded={isOpen}`.
   - Si el usuario navega con `Tab` o lector de pantalla y no presiona `Enter` para abrirlo, salta directamente a la siguiente sección de la pantalla sin tener que recorrer los controles internos.
   - Respeta `reduced_motion` del `AccessibilityContext` (desactiva la animación de entrada cuando el usuario pide reducir movimiento) y permite cerrarse con la tecla `Escape` en Web.
4. **`VisualAlertBanner` (`src/components/ui/visual-alert-banner.tsx`):**
   - Cumple la promesa de **Diversidad Auditiva** (`2ndPhaseProposal.pdf` Sección V.C): reemplaza alertas sonoras con un banner visual de alto contraste, vibración háptica en móvil, `accessibilityRole="alert"`, `accessibilityLiveRegion="polite"`, `aria-live="polite"` y anuncio por voz al lector de pantalla.
5. **`StepZoomImage` (`src/components/ui/step-zoom-image.tsx`):**
   - Cumple la promesa de **Gestos Alternativos** (`2ndPhaseProposal.pdf` Sección V.A): permite acercar/alejar la foto del look con botones simples de un solo toque o tecla `Enter` (`+ Zoom`, `- Zoom`, `1x`) sin exigir *pinch-to-zoom*.
6. **`ColorSwatchBadge` (`src/components/ui/color-swatch-badge.tsx`):**
   - Muestra el círculo de color (`importantForAccessibility="no"` / `aria-hidden={true}` en el ícono decorativo) + el **nombre del color en español** (`getSpanishColorName(hex)`) + el código `HEX` + la región o categoría.
