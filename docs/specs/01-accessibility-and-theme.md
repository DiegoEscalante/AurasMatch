# Spec 01 — Motor de Accesibilidad (Móvil + Web), Temas, Traducción de Color y Tipografía

## 1. Objetivo de la Pieza de Lego
Construir la base de temas, traducción semántica de colores y accesibilidad en `frontend/src/` usando `React Context API` encapsulado en el hook `useAccessibility()`, cumpliendo con las pautas **WCAG 2.1 / 2.2 Nivel AA** tanto en iOS/Android como en Web.

## 2. Estado de Accesibilidad (`AccessibilityPrefs`)
Compatible con la columna existente `public.profiles.accessibility_prefs` (`jsonb`) en Supabase y persistido localmente:
- `theme_mode`: `'system' | 'light' | 'dark' | 'high_contrast'` (Modo Claro, Oscuro y Alto Contraste).
- `dyslexia_font`: `boolean` (Alterna a tipografía apta para dislexia con mayor espaciado).
- `font_family_variant`: `'default' | 'sans_dyslexia' | 'mono_dyslexia'` (Sans-Serif legible Arial/Verdana o Monoespaciada Courier según `2ndPhaseProposal.pdf`).
- `font_scale`: `number` (`1.0` a `2.0`, escalado hasta 200% desde la app además de respetar la escala del sistema operativo).
- `reduced_motion`: `boolean` (Sincronizado inicialmente con `AccessibilityInfo.isReduceMotionEnabled()`).

## 3. Tokens de Color y Contraste Verificado (`src/constants/theme.ts`)
- Corrección de todos los pares texto/fondo en modo `light` y `dark` para garantizar relación de contraste $\ge 4.5:1$ en texto normal y $\ge 3.0:1$ en texto grande (corrigiendo `linkPrimary` `#3c87f7` sobre blanco que tenía `3.48:1`).
- Adición de la paleta `high_contrast` con relación de contraste $\ge 7.0:1$ (WCAG AAA), bordes definidos y anillo de foco (`focusRingColor`) de alta visibilidad para navegación por teclado.

## 4. Traducción de Colores `HEX` / `CIELAB` a Nombres Descriptivos en Español (`src/utils/color-names.ts`)
- Estándar de industria para **WCAG 1.4.1 (Uso del Color)** en apps de cosméticos: función ligera que recibe un `hex_value` (ej. `"#3b3735"`) y devuelve su nombre descriptivo en español (ej. `"Gris carbón oscuro"`, `"Rojo ciruela"`, `"Rosa coral cálido"`).
- Garantiza que usuarios con daltonismo o usuarios de lectores de pantalla (VoiceOver, TalkBack, NVDA) comprendan el tono real sin depender únicamente del círculo de color o del código hexadecimal crudo.

## 5. Tipografía Adaptativa y Semántica HTML/Nativa (`src/components/themed-text.tsx`)
- Todas las variantes calculan dinámicamente su `fontSize` y un `lineHeight` proporcional ($\ge 1.35\times$ del `fontSize`) para evitar *clipping* al escalar hasta 200%.
- Cuando `type="title"` o `type="subtitle"`, asigna automáticamente `accessibilityRole="header"` y `aria-level` para que tanto VoiceOver/TalkBack como NVDA en Windows reconozcan la jerarquía de encabezados (`h1`, `h2`).
