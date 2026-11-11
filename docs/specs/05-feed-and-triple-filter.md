# Spec 05 — Pantalla del Feed Comunitario y Barra Persistente con Filtro Triple Desplegable

## 1. Objetivo de la Pieza de Lego
Construir la pantalla principal del **Feed Comunitario (`index.tsx`)** estilo Pinterest, mostrando exclusivamente contenido verificado como 100% humano (`is_human_verified = true`) e integrando la **Barra de Búsqueda Persistente con Botón Desplegable de Filtro Triple** y tolerancia a errores ortográficos.

## 2. Barra de Búsqueda Persistente + Botón Desplegable del Filtro Triple (`useFeedFilter` hook)
1. **Diseño de Revelación Progresiva (*WAI-ARIA Disclosure Pattern* — Cumple WCAG 2.4.1 *Bypass Blocks*):**
   - La barra superior fija presenta únicamente:
     - El campo de búsqueda (`role="search"`, `accessibilityLabel="Buscar publicaciones, estilos o colores"`).
     - El **Botón de Filtros** (`AccessiblePressable` con `accessibilityState={{ expanded: isFilterOpen }}` y `aria-expanded={isFilterOpen}`).
   - **Ventaja en Teclado y Lectores de Pantalla:** Si el usuario navega con `Tab` (o desliza en TalkBack/VoiceOver) y **no presiona `Enter`** sobre el botón de Filtros, el foco pasa directamente al Feed de publicaciones sin obligarlo a recorrer todos los filtros uno por uno. Si presiona `Enter` (o toca el botón), se despliega el panel con el Filtro Triple (y puede cerrarse con `Escape` o volviendo a tocar el botón).
2. **Las 3 Dimensiones del Panel Desplegable (Filtro Triple):**
   - **Filtro 1 — Estilo / Subcultura (Look):** *Jirai Kei, Clean Girl, Goth, E-Girl, Y2K*.
   - **Filtro 2 — Área Facial / Categoría de Maquillaje:** *Labios (`lips`)*, *Cejas (`brows`)*, *Párpados/Sombras (`eyelids`)*, *Delineado/Pestañas (`lash_line`)*.
   - **Filtro 3 — Color / Familia de Tono Cosmético:** Filtro por cercanía perceptual de color ($\Delta E$ en CIELAB / familias cromáticas con nombre en español + muestra visual) sobre `extracted_regions`.
3. **Autocompletado Tolerante a Errores Ortográficos (`2ndPhaseProposal.pdf` Sección V.B):**
   - Al escribir en la barra de búsqueda con faltas de ortografía (ej. `"jiray"`, `"egilr"`, `"gotico"`), sugiere chips predictivos corregidos mediante distancia de Levenshtein.

*(Nota: Los detalles exactos de cómo se combinan los 3 filtros se confirmarán con el usuario justo al iniciar esta fase).*

## 3. Lista Optimizada y Responsiva de Publicaciones (`FlatList`)
- Filtra estrictamente `is_human_verified = true` (Garantía de Realismo Absoluto).
- Diseño responsivo multiplataforma (columnas adaptativas con `MaxContentWidth` en Web y móvil que soportan escalado de fuente al 200% sin solaparse).
- Cada tarjeta de publicación está agrupada semánticamente (`accessible={true}`, `accessibilityRole="button"`) e incluye `accessibilityActions` nativas (`Ver detalles`, `Dar me gusta`, `Guardar look`).
- Región viva (`accessibilityLiveRegion="polite"` / `aria-live="polite"`) que anuncia automáticamente cuántas publicaciones coinciden tras cambiar un filtro.
