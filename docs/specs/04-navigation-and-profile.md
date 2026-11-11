# Spec 04 — Barra de Navegación de 3 Pestañas y Pantalla de Usuario con Menú Desplegable de Accesibilidad

## 1. Objetivo de la Pieza de Lego
Implementar la estructura de navegación principal definida por el usuario (**3 pestañas inferiores predecibles**) y construir la **Pantalla de Usuario (Perfil)** aplicando el mismo patrón de **Menú Desplegable Accesible (`AccessibleCollapsible`)** para las opciones de accesibilidad.

## 2. Barra Inferior de 3 Pestañas (Lenguaje Claro y Diseño Predecible)
Cumpliendo la promesa de **Diseño Predecible** (`2ndPhaseProposal.pdf` Sección V.B):
1. **Tab 1 — `Feed` (`index.tsx`):** Descubrimiento de publicaciones verificadas como 100% humanas.
2. **Tab 2 — `Subir` (`upload.tsx`):** Subida y análisis de maquillaje por visión por computadora.
3. **Tab 3 — `Usuario` (`profile.tsx`):** Perfil del usuario, sus colecciones y configuración de accesibilidad.

## 3. Pantalla de Usuario (`profile.tsx`)
Estructura compacta dividida en dos bloques:
1. **Datos y Actividad del Usuario (`useUserProfile` hook):**
   - Cabecera con `@username`, avatar e indicadores numéricos reales (*Publicaciones*, *Likes*, *Guardados*).
   - **Menú Desplegable de Opciones de Accesibilidad (`AccessibleCollapsible`):**
     - Botón desplegable con `accessibilityRole="button"`, `accessibilityState={{ expanded }}` y `aria-expanded`.
     - Si el usuario navega con teclado (`Tab`) o lector de pantalla y solo quiere ir a ver sus *Publicaciones / Likes / Guardados*, no tiene que recorrer los controles de accesibilidad a menos que presione `Enter` (o toque el botón) para desplegar el menú.
     - Al abrirse, muestra todos los controles prometidos en `2ndPhaseProposal.pdf`:
       - Selector de **Tema y Contraste**: Claro / Oscuro / **Modo de Alto Contraste**.
       - Selector de **Fuente Apta para Dislexia**: Estándar / Sans-Serif legible / Monoespaciada Courier.
       - Control de **Escalado de Texto**: `100%`, `125%`, `150%`, `175%`, `200%`.
       - Interruptor de **Control de Animaciones (Reducir movimiento)**.
     - Todo cambio actualiza la UI al instante y guarda en `public.profiles.accessibility_prefs`.
2. **Pestañas de Colecciones del Usuario:**
   - **Mis Publicaciones:** Looks subidos por el usuario (`looks.user_id = currentUser.id`), mostrando si alguno fue retenido por el filtro Anti-IA (`is_human_verified = false`) y su estado de apelación (`appeal_status`).
   - **Mis Likes:** Looks donde `liked_by` contiene `currentUser.id`.
   - **Mis Guardados:** Looks asociados en la tabla `public.saved_looks`.
