# Guía de Verificación y Pruebas — Fase 06: Detalles de la Publicación (Estilo Pinterest), Popup de Producto y Mini-Feed Similar

## 1. Resumen de la Implementación
En esta fase se construyó la pantalla de **Detalles de la Publicación (`src/app/look/[id].tsx`)** de **AurasMatch**, articulando el flujo estilo Pinterest especificado en la propuesta del proyecto:

1. **Navegación Fluida con Botón `← Volver` y Barra Inferior Persistente:**
   - Al tocar cualquier publicación en el Feed principal (`LookCard`), la aplicación navega a `/look/[id]`.
   - La cabecera fija superior incluye un botón accesible **`← Volver`** ($\ge 48 \times 48\text{ dp}$) que ejecuta `router.back()`, regresando al usuario exactamente al mismo punto del Feed donde se encontraba, sin saltos de scroll ni recargas.
   - La barra de navegación inferior de 3 pestañas (`Feed`, `Subir`, `Usuario`) permanece visible, permitiendo cambiar de pestaña en cualquier momento como en la app oficial de Pinterest e Instagram.

2. **Fotografía del Look con Zoom por Botones Accesibles (`StepZoomImage`):**
   - Muestra la imagen verificada en alta resolución desde Cloudflare R2 con controles táctiles accesibles de `+ Zoom` y `- Zoom`.
   - Reemplaza el gesto complejo de pellizco (*pinch-to-zoom*) por botones accesibles de $\ge 48 \times 48\text{ dp}$, cumpliendo la **Promesa M.3 de Accesibilidad Motriz** (`2ndPhaseProposal.pdf` Sección V.A.4).

3. **Barra de Acciones Accesibles con Compromiso Gradual (*Gradual Engagement*):**
   - **Like (Corazón ❤️ / 🤍):** Actualiza el contador de me gusta de forma optimista, almacena localmente y sincroniza con Supabase. Si el usuario no ha iniciado sesión, despliega el modal contextual de autenticación.
   - **Guardar (Marcador 🔖 / 📑):** Permite coleccionar el look en el perfil del usuario. Si no tiene sesión, despliega el modal contextual.
   - **Compartir (↗️):** Abre el diálogo nativo de compartir (`Share.share` en Android/iOS) o la Web Share API (`navigator.share` / copia en portapapeles en navegador).
   - **Escuchar Descripción (Text-to-Speech 🔊 / ⏹️):** Lee en voz alta en español la descripción completa, las subculturas y los tonos cosméticos detectados en ojos y labios mediante `expo-speech` en móvil y `SpeechSynthesis` en Web (**Promesa D.1 de Diversidad Auditiva/Cognitiva**).

4. **Insignia Desplegable de Transparencia Anti-IA (`AntiAiTransparencyCard`):**
   - Muestra la certificación de autenticidad humana (`(1 - ai_confidence_score) * 100%`) y el autor de la publicación.
   - Incluye el componente accesible `AccessibleCollapsible` que desglosa las 4 etapas del pipeline de Google Cloud Run:
     - *Etapa 1:* Metadatos C2PA y procedencia criptográfica de hardware.
     - *Etapa 2:* Análisis Espectral de Frecuencias (FFT).
     - *Etapa 3:* Microtextura facial y porosidad real.
     - *Etapa 4:* Clasificador de subculturas y segmentación MediaPipe.

5. **Cosméticos y Tonos por Región Facial (`ColorSwatchBadge` + Hidratación de `public.products`):**
   - Agrupa los cosméticos recomendados por las 4 zonas segmentadas del rostro: 👄 *Labios*, 👁️ *Párpados*, ✨ *Cejas* y 👁️‍🗨️ *Delineado*.
   - Cada región muestra la muestra de color extraída (`ColorSwatchBadge`) con su nombre descriptivo en español (ej. *"Rojo carmín (#B81D2A)"*) y el código HEX.
   - Cada cosmético recomendado se presenta como una tarjeta táctil con su foto oficial, marca, nombre del producto, tono y precio en USD.

6. **Popup Accesible de Detalles del Producto (`ProductDetailModal`):**
   - Al tocar cualquier producto recomendado, **NO navega a otra pantalla**, sino que abre un modal con foco controlado:
     - Foto oficial de alta resolución del cosmético.
     - Marca, nombre del producto, categoría y precio en USD.
     - Muestra de color ampliada con nombre accesible en español y código HEX.
     - **Coordenadas Científicas CIELAB ($L^*, a^*, b^*$):** Permiten al usuario verificar que la luminosidad y los ejes cromáticos coinciden con los tonos del rostro.
     - **Regla Móvil-Primero y WCAG:** Usa `accessibilityViewIsModal={true}` en móvil nativo y `role="dialog"`, `aria-modal={true}`, cierre con tecla `Escape` en Web (**Promesa C.3 de Accesibilidad**).

7. **Mini-Feed de Looks Similares:**
   - En la parte inferior se muestra una cuadrícula con otras publicaciones 100% humanas que comparten la misma subcultura o familias cromáticas afines.
   - Tocar cualquiera de ellos navega fluidamente a ese look.

---

## 2. Checklist Paso a Paso para Probar

### Prueba 1: Navegación desde el Feed al Detalle del Look
1. En el Feed principal (`/`), desliza hasta cualquier publicación (ej. el look de *Jirai Kei* o *Clean Girl*).
2. Toca la tarjeta o la foto de la publicación.
3. **Resultado Esperado:**
   - La app navega a `/look/[id]`.
   - Se muestra la foto con el badge `✓ 100% Humano`, la barra de acciones, la tarjeta Anti-IA, los productos por zona y el mini-feed de similares.
   - La barra de pestañas inferior (`Feed`, `Subir`, `Usuario`) sigue visible abajo.
   - En la parte superior aparece el botón **`← Volver`**.

---

### Prueba 2: Retorno al Feed sin Salto de Scroll
1. Estando en el detalle del look, presiona el botón **`← Volver`** en la esquina superior izquierda.
2. **Resultado Esperado:**
   - Regresas al Feed principal.
   - **El scroll permanece exactamente donde estaba:** no regresa al inicio ni recarga las imágenes.

---

### Prueba 3: Zoom Accesible por Porcentajes, Gesto Pinch-to-Zoom y Desplazamiento Pan
1. En el detalle del look, interactúa con la fotografía de las siguientes 3 formas:
   - **Gesto de Pinza (Pinch-to-Zoom):** Con dos dedos sobre la imagen, sepáralos para acercar y júntalos para alejar fluidamente. El seguimiento dinámico detecta la distancia entre dedos instantáneamente.
   - **Botones Accesibles con Porcentajes:** Presiona `+ Acercar` para aumentar el zoom de 50% en 50% (`100%` $\to$ `150%` $\to$ `200%` $\to$ `250%` $\to$ `300%`). El botón central muestra el porcentaje actual (`100%`, `150%`, `200%`, etc.).
   - **Doble Toque Focalizado:** Toca dos veces rápidamente cualquier parte del rostro (ej. el ojo izquierdo o los labios). La imagen hace zoom al `200%` centrando esa área exacta sin salirse de los bordes ni mostrar fondos negros. Tocar dos veces de nuevo restablece al `100%`.
2. **Movimiento y Exploración de Bordes (Pan):**
   - Con zoom activo ($> 100\%$), aparece el indicador discreto *"Arrastra para ver"*.
   - **Arrastra con 1 dedo (o con el ratón en Web):** La imagen se desliza suavemente en todas las direcciones dentro de los límites del marco, permitiéndote inspeccionar los bordes de la cara, los detalles del delineado alado, las cejas y los labios.
3. Presiona el botón central de porcentaje (ej. `200% ↺`): La imagen regresa centrada al `100%`.

---

### Prueba 4: Barra de Acciones y Compromiso Gradual (*Gradual Engagement*)
1. **Prueba de Like (❤️):**
   - Si no has iniciado sesión: Se abre el modal contextual de autenticación explicando que puedes seguir navegando como invitado o iniciar sesión para dar me gusta.
   - Si estás autenticado: El corazón se ilumina en rojo, el contador incrementa en 1, emite vibración háptica suave y actualiza Supabase / almacenamiento local.
2. **Prueba de Guardar (🔖):**
   - Si no has iniciado sesión: Solicita inicio de sesión.
   - Si estás autenticado: Cambia el estado a "Guardado", emite vibración y se agrega a tus looks guardados en la pestaña **Usuario**.
3. **Prueba de Audio (🔊 Text-to-Speech):**
   - Toca el botón **Audio 🔊**: Una voz natural en español lee en voz alta la descripción del look y los tonos de maquillaje detectados en ojos y labios.
   - Toca el botón **Detener ⏹️**: La reproducción de audio se detiene inmediatamente.
4. **Prueba de Compartir (↗️):**
   - Toca **Compartir**: Se abre la hoja de compartir nativa en Android/iOS o se copia el enlace en Web con confirmación para el lector de pantalla.

---

### Prueba 5: Desglose Anti-IA Desplegable (`AccessibleCollapsible`)
1. Ubica la tarjeta de **Verificado Humano** con el escudo 🛡️.
2. Toca **"Ver desglose técnico de verificación Anti-IA"**.
3. **Resultado Esperado:**
   - La tarjeta se expande con animación suave (*respetando `reduced_motion` si está activo*).
   - Muestra las 4 etapas técnicas del pipeline: Metadatos C2PA, FFT Espectral, Microtextura Facial y Clasificador de Subcultura.
   - Al tocarlo de nuevo, se pliega limpiamente.

---

### Prueba 6: Cosméticos Recomendados y Popup de Producto Enriquecido
1. En la sección **"Cosméticos y Tonos por Región"**, observa los bloques organizados por 👄 *Labios*, 👁️ *Párpados*, ✨ *Cejas*, etc.
2. Toca uno de los cosméticos recomendados (ej. *ColourPop - Lippie Pencil*).
3. **Resultado Esperado:**
   - **NO navega a otra pantalla.** Se abre el **Popup Modal de Detalles del Cosmético**.
   - **Contexto de la Región Facial:** Muestra el banner con el icono de la zona facial (ej. `👄 Recomendado para: Labios`) que antes solo se veía afuera.
   - **Comparativa Cromática:** Presenta en paralelo el *Tono Detectado en el Rostro* (con swatch y código HEX) frente al *Tono del Cosmético Oficial*, junto con el porcentaje de coincidencia perceptual ($\Delta E$).
   - **Ficha Técnica Completa:** Marca, nombre oficial, categoría en español, tono comercial, precio en USD y SKU de base de datos.
   - **Coordenadas Científicas CIELAB ($L^*, a^*, b^*$):** Desglose de luminosidad y ejes cromáticos.
   - En móvil nativo, el foco queda atrapado dentro del modal (`accessibilityViewIsModal`).
   - En Web, presionar la tecla **`Escape`** o tocar el botón `✕` cierra el modal.

---

### Prueba 7: Mini-Feed de Looks Similares
1. Al final del detalle del look, revisa la sección **"Looks Similares Recomendados"**.
2. Toca una de las tarjetas de look similar.
3. **Resultado Esperado:**
   - La aplicación navega al detalle de esa nueva publicación seleccionada, cargando su foto, sus tonos y sus cosméticos asociados.

---

## 3. Resolución Técnica: Error de Redireccionamiento Forzado en Expo Router SDK 58
* **El Problema:** Al presionar una publicación en el feed, la pantalla de detalle `/look/[id]` se abría e inmediatamente se cerraba/revertía en un instante al feed, tanto en Web como en Móvil.
* **Causa Raíz:** El componente de navegación base `frontend/src/components/app-tabs.tsx` utilizaba el paquete experimental `expo-router/ui` (`<Tabs>`, `<TabList>`, `<TabSlot>`). En Expo SDK 58, el navegador interno de `expo-router/ui` ejecuta un hook llamado `useVisibleTabsWithRedirect` (línea 86-88 de `useVisibleTabsWithRedirect.js`), el cual fuerza un `router.replace(initialRoute)` inmediato cada vez que la ruta activa en pantalla no forma parte de la lista fija de `<TabTrigger>` declarada en el layout.
* **Solución Arquitectónica Compacta:** Se reemplazó el contenedor restrictivo de `expo-router/ui` por el renderizador universal `<Slot />` de `expo-router` junto con la barra inferior persistente de navegación (`CustomBottomTabList` con `AurasTabButton`). De este modo, la ruta `/look/[id]` se renderiza sin redireccionamiento automático y la barra inferior de pestañas permanece activa y persistente para el usuario tal como fue diseñado.

