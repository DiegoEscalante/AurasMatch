# Spec 00 — Visión General, Flujo de Aplicación y Reglas de Trabajo (SDD)

## 1. Regla Suprema de Alineación (Guardrail Principal)
1. **Contraste Obligatorio con las 3 Fuentes Oficiales en `projectProposalDocs/`:**
   - **Fuente A:** `projectProposalDocs/Course Project Phase 3 - Entrega Final (Proyecto Final Desarrollo Móvil).md` (Lineamientos y Rúbrica Oficial de la Fase 3 del profesor).
   - **Fuente B:** `projectProposalDocs/Project Proposal.pdf` (Fase 1 — Visión del Producto, 3 Pilares de Innovación, MVP de 5 Subculturas, Regiones de Ojos/Labios y Mitigación de Riesgos).
   - **Fuente C:** `projectProposalDocs/2ndPhaseProposal.pdf` (Fase 2 — Las 16 promesas de Accesibilidad en Motricidad, Cognitiva, Auditiva y Visual).
2. **Deber de Advertencia:** Cada vez que el usuario proponga un cambio, eliminación o diseño, el asistente **debe contrastarlo contra las Fuentes A, B y C** y contra los estándares de accesibilidad (WCAG 2.1/2.2 Nivel AA). Si algo contradice, omite o pone en riesgo algún punto de la rúbrica o de las propuestas previas, el asistente **debe advertirlo explícitamente** antes de implementar. El usuario siempre tiene la palabra final tras recibir la advertencia.
3. **Cero Suposiciones Técnicas:** Ninguna decisión técnica, de diseño, flujo o esquema se asume por cuenta propia; siempre se consulta primero con el usuario.
4. **Commit y Push al Cerrar cada Fase:** Solo cuando el usuario exprese conformidad y dé por completada una fase (Pieza de Lego), se realiza `git add`, `git commit` descriptivo y `git push` al repositorio.

---

## 2. Arquitectura Compacta, Multiplataforma (Móvil + Web) y "Stitch-Ready"
El objetivo principal es una **aplicación móvil nativa en React Native / Expo (iOS y Android)** que también pueda ejecutarse de forma accesible en **Web (`react-native-web`)**. Al finalizar la funcionalidad se aplicará una capa estética con **Google Stitch**. Para que eso sea seguro y rápido:
- **Separación estricta Lógica vs. UI (Patrón *Headless Custom Hooks*):**
  - El estado global utiliza **React Context API** encapsulado detrás de Custom Hooks (`useAuth()`, `useAccessibility()`, `useFeed()`, `useLookDetail()`).
  - Ninguna pantalla importa ni manipula llamadas crudas a Supabase o FastAPI directamente en el JSX. Esto mantiene el código compacto hoy, permite migrar el interior de los hooks a `Redux Toolkit` en el futuro si la app escala masivamente, y permite aplicar el rediseño de **Google Stitch** sin riesgo de romper la lógica.
- **Patrón Unificado de Menús Desplegables Accesibles (`AccessibleCollapsible` — WCAG 2.4.1 *Bypass Blocks*):**
  - Dondequiera que exista un grupo de controles o detalles secundarios (**Filtro Triple en el Feed**, **Menú de Opciones de Accesibilidad en Perfil**, **Desglose Técnico Anti-IA en el Detalle del Look** y **Guía de Iluminación / Comentarios**), se utiliza un único componente desplegable (`accessibilityState={{ expanded }}`, `aria-expanded`).
  - Así, un usuario que navega con teclado (`Tab`) o lector de pantalla (TalkBack/VoiceOver/NVDA) solo debe presionar `Enter` / doble toque si desea abrir ese bloque; si no lo abre, el siguiente `Tab` salta directamente al contenido principal sin fatiga de navegación.
- **Accesibilidad Dual (Móvil Nativo + Web ARIA/Teclado):**
  - Las primitivas base exponen tanto las propiedades nativas de React Native (`accessible`, `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, `accessibilityState`, `accessibilityViewIsModal`, `accessibilityLiveRegion`, `accessibilityActions`) como su mapeo semántico para Web (`role`, `aria-label`, `aria-expanded`, `aria-selected`, `aria-live`, `aria-modal`, `tabIndex`, soporte de teclado `Tab`/`Enter`/`Espacio`/`Escape` y anillo de foco visible).
- **Backend Intacto:** El microservicio FastAPI en Google Cloud Run (`backend/`) no se modifica sin aprobación explícita.

---

## 3. Flujo Principal de la Aplicación (Estilo Pinterest)
Pasado el **Login / Registro**, la aplicación cuenta con una barra de navegación inferior fija con **3 pantallas principales**:

1. **Pantalla 1 — Feed Comunitario (`Feed`):**
   - Muestra únicamente publicaciones verificadas como humanas (`is_human_verified = true`).
   - Cuenta con una **Barra de Búsqueda Persistente** en la parte superior con autocompletado tolerante a errores ortográficos y un **Botón Desplegable de Filtros (`AccessibleCollapsible`)** que muestra u oculta el **Filtro Triple** (1. Look/Subcultura, 2. Área facial/categoría de maquillaje, 3. Color).
   - Al tocar una publicación, navega a la **Pantalla de Detalles de la Publicación (estilo Pinterest)**:
     - Acciones de **Like**, **Guardar**, **Compartir**, **Escuchar descripción (Text-to-Speech multiplataforma)** y **Zoom por botones (`+/-`)**.
     - **Menú Desplegable de Transparencia Anti-IA** (puntajes de las 3 etapas).
     - **Lista de Productos Recomendados (SKUs):** Muestra cada color con su nombre descriptivo en español + código `HEX`. Al presionar un producto, **NO abre otra pantalla**, sino un **Popup (Modal accesible con bloqueo y retorno de foco en Móvil y Web)** con los detalles completos del cosmético desde la tabla `public.products`.
     - **Mini-feed de publicaciones similares** en la parte inferior.
2. **Pantalla 2 — Subir / Analizar Publicación (`Subir`):**
   - Permite tomar o elegir foto (con guía desplegable de iluminación), enviarla al backend en Google Cloud Run (`POST /analyze-look`), conservar borrador sin temporizador de expiración, editar el **Alt-Text sugerido por IA** y apelar en caso de falso positivo del filtro Anti-IA.
3. **Pantalla 3 — Usuario / Perfil (`Usuario`):**
   - Muestra datos del usuario (`@username`, contadores y pestañas de *Publicaciones*, *Likes* y *Guardados*).
   - Incluye el **Menú Desplegable de Opciones de Accesibilidad (`AccessibleCollapsible`)** (Tema Claro/Oscuro/Alto Contraste, Fuente para Dislexia, Escalado de texto hasta 200%, Reducir animaciones).

---

## 4. Mapa de Fases (Piezas de Lego)
- `01-accessibility-and-theme.md`: Motor de Accesibilidad, Tokens de Tema, Nombres de Color y Tipografía Adaptativa.
- `02-ui-primitives.md`: Primitivas Accesibles Móvil + Web (`AccessiblePressable`, `AccessibleCollapsible`, `VisualAlertBanner`, `StepZoomImage`, `ColorSwatchBadge`).
- `03-supabase-and-auth.md`: Ajuste aditivo Forma 2 en Supabase, Cliente Supabase/R2 y Autenticación.
- `04-navigation-and-profile.md`: Navegación de 3 Pestañas + Pantalla de Usuario con Desplegable de Accesibilidad.
- `05-feed-and-triple-filter.md`: Feed 100% Humano + Barra Persistente con Botón Desplegable de Filtro Triple y Tolerancia a Errores.
- `06-look-detail-and-product-popup.md`: Detalle del Look estilo Pinterest + Popup de Producto con Focus Trap + Mini-feed Similar.
- `07-upload-and-ai-analysis.md`: Pantalla de Subida y Análisis IA con Cloud Run + Alt-Text IA + Apelación.
- `08-low-priority-extras.md`: Extras de Baja Prioridad (Comentarios desplegables y Controles Asistidos de Comandos de Voz).
- `09-final-delivery-docs.md`: `README.md` Raíz, Matriz Trazable Corte 2 vs. Corte 3 y Documento Técnico Final.
