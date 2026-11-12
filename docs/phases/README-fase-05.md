# Guía de Verificación y Pruebas — Fase 05: Feed Comunitario con Filtro Triple Desplegable y Tolerancia a Errores

## 1. Resumen de la Implementación
En esta fase se construyó la pantalla principal del Feed Comunitario (`src/app/index.tsx`) de **AurasMatch**, garantizando:
1. **Feed 100% Humano:** Muestra exclusivamente looks con `is_human_verified = true` (Garantía de Realismo Absoluto contra IA).
2. **Barra de Búsqueda Persistente Desacoplada:** El `TextInput` permanece fijo en la cabecera superior; escribir nunca cierra el teclado virtual móvil.
3. **Panel de Filtro Flotante Superpuesto (Overlay):**
   - Al tocar el botón **⚙️ Filtros**, el panel se abre **por encima del feed** con una elevación y fondo difuminado, **sin desplazar ni alterar la posición de scroll del feed**.
   - Puedes estar en la publicación #1 o en la #50 del feed: al presionar el filtro, se despliega sobre tu vista actual. Al cerrarlo (tocando "✕", "Ver resultados" o fuera del panel), regresas exactamente a la misma posición del feed.
   - Cuenta con scroll interno independiente para revisar cómodamente todas las dimensiones.
4. **Filtro de Color Pulido (Sin Falsos Positivos):**
   - Se refinó el algoritmo perceptual en `src/hooks/use-feed.ts`. Ahora exige correspondencia estricta con la familia cromática primaria del cosmético (`getClosestColorFamily`).
   - Ya no ocurre que seleccionar **Marrón café** muestre publicaciones con delineados o labios negros carbón (eliminando el solapamiento que causaba $\Delta E \le 22$ en tonos oscuros).
   - Se diversificaron las publicaciones mock en `src/services/supabase.ts` para cubrir las **11 familias cromáticas** de la app.
5. **Botón Superior de Limpieza:**
   - Botón **"✕ Quitar todos los filtros"** situado al puro inicio del panel de filtros para restablecer la búsqueda con un solo toque.
6. **Combinación Contextual Inteligente:**
   - Si se selecciona **Área Facial + Color**, filtra por ese color exacto en esa zona específica de la cara.
   - Si se selecciona **solo Color**, busca ese tono en cualquiera de las 4 áreas del rostro.
   - Si se selecciona **solo Área**, filtra looks que posean maquillaje extraído en esa zona.
7. **Autocompletado Predictivo con Tolerancia a Errores:** Algoritmo de distancia de Levenshtein que sugiere términos canónicos ante faltas ortográficas (ej. `"jiray"` $\to$ `"Jirai Kei"`, `"gotico"` $\to$ `"Goth"`, `"labial"` $\to$ `"Labios"`).
8. **Diseño Responsivo estilo Pinterest:**
   - 2 columnas estándar en escalado normal (100%–125%).
   - Cambio dinámico automático a 1 sola columna ancha cuando el escalado de fuente es $\ge 150\%$ (*WCAG 1.4.4 Resize Text*).
   - Escalado universal de tipografía (hasta 200%) en todos los textos de la app mediante `ThemedText`.

---

## 2. Checklist Paso a Paso para Probar

### Prueba 1: Carga en Web (Verificación de Cero Errores)
1. Ejecuta en la terminal de `frontend`:
   ```bash
   npx expo start -c
   ```
2. Presiona `w` para abrir en el navegador Web (o navega a `http://localhost:8081`).
3. **Resultado Esperado:** La página carga inmediatamente sin pantalla roja ni el error `[RangeError: Maximum call stack size exceeded]`.

---

### Prueba 2: Barra de Búsqueda y Teclado en Móvil
1. Toca la barra de búsqueda en la parte superior.
2. Escribe una letra (ej. `"j"`), luego `"i"`, luego `"r"`.
3. **Resultado Esperado:** El teclado virtual se mantiene abierto continuamente sin cerrarse entre pulsaciones. Aparecen los chips de sugerencia predictiva (ej. `Jirai Kei`).

---

### Prueba 3: Panel de Filtro Flotante Superpuesto (Sin Mover el Feed)
1. Desliza hacia abajo en el feed hasta la mitad o el final.
2. Toca el botón de engranaje **⚙️** en la barra superior fija.
3. **Resultado Esperado:**
   - El panel de filtros se despliega **flotando por encima del feed** con una sombra y fondo oscurecido.
   - **El feed no se mueve ni salta:** permanece en la posición exacta donde estabas.
   - Dentro del panel puedes deslizar libremente para ver Estilos, Áreas y los 11 Colores.
   - Toca fuera del panel o el botón **"Aceptar"**: el panel se cierra y sigues en la misma posición del feed.

---

### Prueba 4: Prueba Precisa de Filtro de Colores (Sin Falsos Positivos)
1. Abre el panel con **⚙️**.
2. **Prueba de "Marrón cacao / Café":**
   - Selecciona **Marrón cacao / Café**: Solo aparecen publicaciones con cejas o tonos café (*Clean Girl* y *Clean Girl Full*). Los looks *Goth* (labios negros) y *E-Girl* ya **NO** aparecen.
3. **Prueba de "Negro / Carbón oscuro":**
   - Selecciona **Negro / Carbón oscuro**: Aparecen los looks con labios o delineado negro (*Goth*, *E-Girl*, *Clean Girl Full*).
4. **Prueba de Colores Específicos:**
   - **Rojo carmín:** Solo look *Jirai Kei* (labios rojos).
   - **Rosa / Frambuesa:** Solo look *Jirai Kei* (párpados rosa).
   - **Morado / Lavanda:** Solo look *E-Girl* (párpados morados).
   - **Azul profundo:** Solo look *Y2K* (párpados azul).
   - **Verde esmeralda / Oliva:** Solo look *Goth* con sombras verdes.
   - **Vino / Ciruela oscuro:** Solo look *Goth* con labios ciruela.
   - **Coral / Durazno cálido:** Solo look *Clean Girl Coral*.
   - **Dorado / Bronce luminoso:** Solo look *Clean Girl Full*.
5. Toca **"✕ Quitar todos los filtros"** al inicio del panel: se restablecen todos los filtros al instante.

---

### Prueba 5: Escalado de Texto y Cuadrícula Pinterest
1. Ve a la pestaña **Usuario** (`profile.tsx`).
2. Abre **Opciones de Accesibilidad**.
3. En **Tamaño de texto**, desliza a **100%** o **125%** y regresa a la pestaña **Feed**: La cuadrícula muestra **2 columnas**.
4. Vuelve a **Usuario**, sube el tamaño de texto a **150%** o **200%** y regresa al **Feed**:
   - La cuadrícula cambia automáticamente a **1 columna ancha** (*WCAG 1.4.4*).
   - Todos los textos, botones, etiquetas de autor y badges se escalan proporcionalmente sin cortarse ni solaparse.

---

### Prueba 6: Botón de Engranaje ⚙️ en App Móvil Nativa (Android / iOS)
1. Abre la aplicación en tu dispositivo móvil o emulador a través de **Expo Go**.
2. En la pantalla principal del Feed, toca el botón de engranaje **⚙️** en la esquina superior derecha de la barra de búsqueda.
3. **Resultado Esperado:**
   - El panel de filtros se despliega instantáneamente y con fluidez sobre el feed móvil.
   - **Cero errores nativos:** Ya no se produce el fallo `Error while updating 'accessibilityrole' of a view managed by: RCTView`.
   - Se respeta la **Regla Multiplataforma Móvil-Primero**, manteniendo roles 100% nativos compatibles con `RCTViewManager` en iOS/Android y atributos WAI-ARIA protegidos con guardas condicionales en Web.

---

## 3. Principio Arquitectónico: Regla Multiplataforma Móvil-Primero
A partir de la Fase 05 y como regla permanente del proyecto (documentada en `docs/specs/00-overview-and-rules.md` y `frontend/AGENTS.md`):
- **Prioridad Absoluta Móvil Nativo:** React Native traduce los componentes a vistas nativas de Android (`ReactViewManager`) y iOS (`RCTViewManager`). Atributos de WAI-ARIA Web como `accessibilityRole="region"` no existen en el enum nativo de `AccessibilityRole` y provocan excepciones fatales en tiempo de ejecución móvil.
- **Guardas de Plataforma Obligatorias:** Si se requiere un rol Web específico para lectores de pantalla en navegador, se inyecta condicionalmente:
  ```tsx
  accessible={true}
  accessibilityLabel="Panel de filtros de búsqueda"
  {...(Platform.OS === 'web' ? { role: 'region' as const } : {})}
  ```
  De esta forma, la app móvil recibe propiedades nativas puras (`accessible`, `accessibilityLabel`) y la Web recibe la semántica ARIA completa sin colisiones.
