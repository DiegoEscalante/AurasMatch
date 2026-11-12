# Spec 00 — Visión General, Flujo de Aplicación y Reglas de Trabajo (SDD)

## 1. Regla Suprema de Alineación (Guardrail Principal)
1. **Contraste Obligatorio con las 3 Fuentes Regla del Proyecto en `docs/projectProposalDocs/`:**
   - **Fuente A (Regla):** `docs/projectProposalDocs/Course Project Phase 3 - Entrega Final (Proyecto Final Desarrollo Móvil).md` (Lineamientos y Rúbrica Oficial de la Fase 3 del profesor).
   - **Fuente B (Regla):** `docs/projectProposalDocs/Project Proposal.pdf` (Fase 1 — Visión del Producto, 3 Pilares de Innovación, MVP de 5 Subculturas, Regiones de Ojos/Labios y Mitigación de Riesgos).
   - **Fuente C (Regla):** `docs/projectProposalDocs/2ndPhaseProposal.pdf` (Fase 2 — Las 16 promesas de Accesibilidad en Motricidad, Cognitiva, Auditiva y Visual).
   - *(Referencia Pedagógica para Documentación — NO es regla de decisiones del proyecto):* `docs/projectProposalDocs/agente-desarrollo-movil.md` (Temario del curso usado únicamente para calibrar el nivel de las explicaciones en los `README` de cada fase y en el glosario de conceptos, sin imponer librerías ni requisitos adicionales al código).
2. **Deber de Advertencia:** Cada vez que el usuario proponga un cambio, eliminación o diseño, el asistente **debe contrastarlo contra las Fuentes A, B y C** y contra los estándares de accesibilidad (WCAG 2.1/2.2 Nivel AA). Si algo contradice, omite o pone en riesgo algún punto de la rúbrica o de las propuestas previas, el asistente **debe advertirlo explícitamente** antes de implementar. El usuario siempre tiene la palabra final tras recibir la advertencia.
3. **Cero Suposiciones Técnicas + Explicación Previa del "Por Qué" y de las Opciones:**
   - Ninguna decisión técnica, de diseño, flujo o esquema se asume por cuenta propia; siempre se consulta primero con el usuario.
   - **Regla de Explicación Previa:** Cada vez que el asistente haga una pregunta al usuario, **debe explicar primero en el texto de forma detallada:**
     1. **¿Por qué hay que tomar esta decisión?** (Cuál es el problema real o requerimiento del proyecto que nos obliga a elegir un camino).
     2. **¿Cómo funciona cada opción, cuáles son sus ventajas y desventajas?**
     3. **¿Cuál opción recomienda y por qué?** (Priorizando siempre cumplir las Fuentes A, B y C manteniendo el código compacto y libre de cosas innecesarias).
4. **Documentación Profunda y Guía de Pruebas por Fase (`docs/phases/README-fase-XX.md` y `docs/CONCEPTOS_Y_DEFINICIONES.md`):**
   - En cada fase implementada se debe generar un archivo `docs/phases/README-fase-XX.md` que explique de lo general a lo específico qué hace la implementación en su conjunto y qué hace cada archivo, función, estado y propiedad en detalle.
   - **Guía Obligatoria de Pruebas por Fase:** En cada fase (tanto dentro de `docs/phases/README-fase-XX.md` como en la respuesta al usuario) se debe incluir una sección práctica paso a paso indicando **cómo probar y verificar que todo lo implementado en esa fase funciona correctamente** (comandos de terminal, pruebas visuales en Expo Go / Web, pruebas de teclado y accesibilidad).
   - En paralelo se debe mantener actualizado `docs/CONCEPTOS_Y_DEFINICIONES.md` con todos los conceptos y definiciones importantes del proyecto (de lo general a lo específico).
   - Ambos documentos se redactan asumiendo que el lector comprende el temario de `docs/projectProposalDocs/agente-desarrollo-movil.md`, pero profundizando explícitamente en aquellos puntos que aunque en teoría se conozcan son muy importantes para entender y defender el proyecto.
5. **Commit y Push al Cerrar cada Fase:** Solo cuando el usuario exprese conformidad y dé por completada una fase (Pieza de Lego), se actualiza el Checklist de Progreso en la Sección 4 de este archivo y se realiza `git add`, `git commit` descriptivo y `git push` al repositorio.

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

## 4. Mapa de Fases y Checklist Vivo de Progreso (Memoria para Agentes)
- [x] **Fase 00 (`00-overview-and-rules.md`):** Definición de arquitectura SDD, flujo estilo Pinterest y reglas de trabajo (Commit `159a267`).
- [x] **Fase 01 (`01-accessibility-and-theme.md`):** Motor de Accesibilidad, Tokens de Tema, Nombres de Color y Tipografía Adaptativa (`docs/phases/README-fase-01.md` + `docs/CONCEPTOS_Y_DEFINICIONES.md` — Commit `a2114a1`).
- [x] **Fase 02 (`02-ui-primitives.md`):** Primitivas Accesibles Móvil + Web (`AccessiblePressable`, `AccessibleCollapsible`, `VisualAlertBanner`, `StepZoomImage`, `ColorSwatchBadge` + Laboratorio de pruebas en `explore.tsx` + `docs/phases/README-fase-02.md` — Commit `bb20630`).
- [x] **Fase 03 (`03-supabase-and-auth.md`):** Ajuste aditivo Forma 2 en Supabase (verificado en vivo), Cliente Supabase/R2, `AuthProvider` y `AuthCard` (`docs/phases/README-fase-03.md` + `docs/CONCEPTOS_Y_DEFINICIONES.md` — Commit `9f708ab`).
- [x] **Fase 04 (`04-navigation-and-profile.md`):** Navegación de 3 Pestañas (`Feed`, `Subir`, `Usuario`) + Compromiso Gradual (*Gradual Engagement*) + Pantalla de Usuario con Desplegable de Accesibilidad y Apelación Anti-IA (`docs/phases/README-fase-04.md` + `docs/CONCEPTOS_Y_DEFINICIONES.md`).
- [ ] **Fase 05 (`05-feed-and-triple-filter.md`):** Feed 100% Humano + Barra Persistente con Botón Desplegable de Filtro Triple y Tolerancia a Errores.
- [ ] **Fase 06 (`06-look-detail-and-product-popup.md`):** Detalle del Look estilo Pinterest + Popup de Producto con Focus Trap + Mini-feed Similar.
- [ ] **Fase 07 (`07-upload-and-ai-analysis.md`):** Pantalla de Subida y Análisis IA con Cloud Run + Alt-Text IA + Apelación.
- [ ] **Fase 08 (`08-low-priority-extras.md`):** Extras de Baja Prioridad (Comentarios desplegables y Controles Asistidos de Comandos de Voz).
- [ ] **Fase 09 (`09-final-delivery-docs.md`):** `README.md` Raíz, Matriz Trazable Corte 2 vs. Corte 3 y Documento Técnico Final.
