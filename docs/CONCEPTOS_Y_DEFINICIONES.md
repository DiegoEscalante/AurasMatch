# Glosario Maestro de Conceptos y Definiciones Técnicas — AurasMatch

> **Propósito de este documento:** Explicar de lo **general a lo específico** todos los conceptos arquitectónicos, móviles, de accesibilidad y de visión por computadora utilizados en **AurasMatch**, conectándolos con la base vista en [`projectProposalDocs/agente-desarrollo-movil.md`](../projectProposalDocs/agente-desarrollo-movil.md) y con las 3 reglas del proyecto ([`Course Project Phase 3`](../projectProposalDocs/Course%20Project%20Phase%203%20-%20Entrega%20Final%20%28Proyecto%20Final%20Desarrollo%20Móvil%29.md), [`Project Proposal.pdf`](../projectProposalDocs/Project%20Proposal.pdf) y [`2ndPhaseProposal.pdf`](../projectProposalDocs/2ndPhaseProposal.pdf)).

---

## Nivel 1: Conceptos Generales de Arquitectura del Proyecto

### 1. Arquitectura Cliente-Servidor Híbrida (BaaS + Microservicio de IA)
AurasMatch no utiliza un backend monolítico tradicional, sino una arquitectura desacoplada en 3 capas que optimiza costos y latencia:
1. **Cliente Móvil y Web (`frontend/` — React Native + Expo SDK 58):** Responsable de la interfaz declarativa, accesibilidad móvil/web (WCAG 2.1/2.2 AA/AAA), gestión de estado y experiencia de usuario a 60 FPS.
2. **Backend-as-a-Service (`Supabase` — PostgreSQL + GoTrue Auth + PostgREST):** Gestiona la autenticación basada en tokens JWT, la persistencia relacional/documental (`profiles`, `looks`, `products`, `saved_looks`) y las lecturas rápidas directas desde el cliente móvil protegidas por políticas *Row Level Security (RLS)*.
3. **Microservicio de Visión por Computadora (`backend/` — FastAPI en Google Cloud Run + Cloudflare R2):** Se invoca únicamente cuando el usuario sube una fotografía para analizar (`POST /analyze-look`). Ejecuta el pipeline pesado en CPU (MediaPipe, extracción CIELAB, filtro Anti-IA de 3 etapas y modelo visual Jev), almacena el archivo binario JPEG en **Cloudflare R2** y escribe el resultado verificado en Supabase.

### 2. Almacenamiento de Objetos por Referencia (`Cloudflare R2` vs. Base de Datos)
Guardar archivos binarios de imágenes (MBs de datos) directamente dentro de una tabla SQL degrada el rendimiento de las consultas y encarece la base de datos. Por ello:
* El archivo físico `.jpg` se sube al bucket `auras-match` en **Cloudflare R2** (compatible con la API de Amazon S3).
* La tabla `public.looks` en PostgreSQL almacena únicamente la **referencia relativa de texto** en la columna `image_path` (ej. `"user_looks/8673b143-7aef-43d7-a2b8-2ae2f68f9b8d.jpg"`).
* El cliente móvil reconstruye la URL pública en tiempo de ejecución concatenando el dominio público del bucket con `image_path`.

### 3. Patrón de Custom Hooks como Fachada (*Headless State Pattern* — Semana 4 y 13)
En lugar de acoplar los componentes visuales (`.tsx`) a la implementación interna del estado global o de las llamadas de red, las pantallas consumen **Custom Hooks de dominio** (`useAccessibility()`, `useTheme()`, `useAuth()`, `useFeed()`).
* **Por qué es clave en AurasMatch:**
  1. Permite que la interfaz sea **"Stitch-Ready"**: cuando se apliquen los estilos generados con **Google Stitch**, solo se modifica el JSX y el `StyleSheet` sin riesgo de romper la lógica de negocio.
  2. Permite escalabilidad transparente: hoy los hooks utilizan `React Context API` por dentro (manteniendo el código compacto), pero si el feed escala a decenas de miles de objetos en memoria, se puede reemplazar el interior del hook por `Redux Toolkit` sin editar ninguna pantalla.

---

## Nivel 2: Conceptos del Runtime de React Native y Ciclo de Vida (Semanas 1 a 4)

### 4. Runtime de React Native vs. Web (`react-native-web`) (Semana 1)
* En **iOS y Android**, React Native no usa un navegador ni un `WebView`: traduce `<View>` a `UIView` (iOS) / `android.view.View` (Android) y `<Text>` a `UILabel` / `TextView` nativos. En React Native todo texto debe vivir obligatoriamente dentro de un `<Text>` y el algoritmo de diseño por defecto es **Flexbox en columna (`flexDirection: 'column'`)**.
* Cuando el mismo proyecto se abre en **Web**, la librería `react-native-web` traduce esas mismas primitivas (`View`, `Text`, `Pressable`) a elementos del DOM HTML (`div`, `span`, `button`, `h1`) inyectando atributos WAI-ARIA.

### 5. El Estado como Instantánea (*State as a Snapshot*) y Ciclo Render $\rightarrow$ Reconciliación $\rightarrow$ Commit (Semana 2 y 4)
* **Render:** React llama a la función del componente. El estado (`prefs` en `useAccessibility`) es una fotografía inmutable de ese instante.
* **Actualización Funcional (`setState(prev => next)`):** Cuando el siguiente estado depende del estado anterior (por ejemplo, en `updateAccessibilityPrefs` al combinar una actualización parcial `Partial<AccessibilityPrefs>` con las preferencias previas), **nunca** debe leerse la variable del cierre (*closure*) directamente si pueden ocurrir varias actualizaciones seguidas; se usa `setPrefs(prev => ...)` para garantizar que trabajamos sobre el último estado confirmado.
* **Reconciliación y Commit:** React compara el árbol virtual nuevo con el anterior y solo envía al puente nativo (*Fabric / Native UI Thread*) las propiedades exactas que cambiaron (ej. el nuevo `fontSize` o `backgroundColor`).

### 6. `useEffect` como Sincronización Externa y Función de Cleanup (Semana 2 y 11)
* **Concepto clave para la Defensa Oral:** `useEffect` **no** debe usarse para calcular datos derivados que pueden calcularse durante el render con `useMemo` (como `resolvedThemeKey` o `effectiveFontScale` en [`accessibility-context.tsx`](../frontend/src/contexts/accessibility-context.tsx)).
* `useEffect` sirve exclusivamente para sincronizar React con **sistemas externos** al árbol de componentes: en nuestro caso, leer `AsyncStorage` y suscribirse al evento del sistema operativo `AccessibilityInfo.addEventListener('reduceMotionChanged', ...)`.
* **Por qué el `return () => motionSubscription.remove()` es obligatorio:** Si un efecto registra un listener nativo y no devuelve una función de limpieza (*cleanup*), al desmontarse y volverse a montar el componente quedarían múltiples listeners huérfanos en memoria causando fugas (*memory leaks*) y actualizaciones sobre componentes desmontados.

### 7. Medición Reactiva (`useWindowDimensions`) vs. Estática (`Dimensions.get`) (Semana 3)
* `Dimensions.get('window')` lee el tamaño de pantalla o la escala de fuente una sola vez como una foto estática; si el usuario rota el teléfono, divide la pantalla en Android/iPad o cambia el tamaño de letra en los ajustes del sistema operativo, el componente no se entera.
* `useWindowDimensions()` es un hook suscrito a los eventos de configuración nativa del dispositivo: cada vez que cambia `width`, `height` o `fontScale`, dispara un re-render automático para que la interfaz se adapte en tiempo real.

---

## Nivel 3: Conceptos Específicos de Accesibilidad Móvil y Web (Semana 6 y 7 + Fase 01)

### 8. Design Tokens Semánticos vs. Valores Crudos (Semana 7)
* Un **valor crudo** es escribir `color: '#4A4E58'` directamente en un componente.
* Un **Design Token semántico** es un nombre que describe la **intención arquitectónica** del color (`textSecondary`, `backgroundElement`, `linkPrimary`, `focusRing`) en [`theme.ts`](../frontend/src/constants/theme.ts). El componente pide `themeColor="textSecondary"` y el motor de tema decide qué valor hexadecimal entregar según si el usuario está en modo `light`, `dark` o `high_contrast`.

### 9. Relación de Contraste de Luminancia Relativa (WCAG 2.1 / 2.2 Nivel AA y AAA)
El estándar internacional WCAG mide la legibilidad entre el color del texto ($L_1$) y el color del fondo ($L_2$) mediante la fórmula de luminancia relativa:
$$\text{Ratio de Contraste} = \frac{L_{\text{más claro}} + 0.05}{L_{\text{más oscuro}} + 0.05}$$
* **Nivel AA (Mínimo exigido por la rúbrica):** Requiere **$\ge 4.5:1$** para texto normal ($< 18\text{ pt}$ o $< 14\text{ pt bold}$) y **$\ge 3.0:1$** para texto grande o componentes gráficos.
* **Nivel AAA (Implementado en nuestro Modo de Alto Contraste):** Requiere **$\ge 7.0:1$**. En nuestra paleta `high_contrast`, el texto blanco (`#FFFFFF`) sobre negro (`#000000`) alcanza el máximo teórico de **$21:1$**, y el texto secundario amarillo (`#FFFF00`) alcanza **$19.6:1$**.

### 10. Escalado Tipográfico hasta 200% y Prevención de *Clipping* con `lineHeight` Proporcional
* **¿Qué es el *Text Clipping* en móvil?** En los motores de texto nativos de iOS (`CoreText`) y Android (`StaticLayout`), cada línea de texto se dibuja dentro de una caja vertical definida por `lineHeight`. Si un estilo define `fontSize: 16` y `lineHeight: 20`, y el usuario escala la fuente al **200%** (`fontSize: 32`) sin que `lineHeight` crezca en la misma proporción, las letras de `32px` quedan encerradas en una caja de `20px` y se cortan por la mitad.
* **Cómo lo resuelve [`ThemedText`](../frontend/src/components/themed-text.tsx):** Nunca usa un `lineHeight` estático; multiplica dinámicamente el `scaledFontSize` por un factor proporcional (`lineHeightRatio` entre `1.25` y `1.5`, más un `+0.12` adicional cuando se activa el modo dislexia).

### 11. Tipografía para Dislexia y Reducción del *Visual Crowding* (`2ndPhaseProposal.pdf` [12])
* Las personas con dislexia suelen experimentar **apiñamiento visual (*visual crowding*)**: las letras con formas espejadas o muy pegadas (como `b`/`d`, `p`/`q`, `r`/`n` pareciendo `m`) se confunden cuando la fuente tiene serifas ornamentales o poco espacio.
* Basados en la investigación empírica de *Rello & Baeza-Yates (2013)* citada en la propuesta de Fase 2, implementamos dos alternativas seleccionables:
  1. **Sans-Serif limpia (`Verdana / Arial / Helvetica`):** Caracteres abiertos sin adornos en los extremos.
  2. **Monoespaciada (`Courier`):** Cada letra ocupa exactamente el mismo ancho horizontal, eliminando la fusión visual entre letras vecinas.
  * Ambas se refuerzan con `letterSpacing: 0.6` y un incremento del `12%` en el `lineHeight`.

---

## Nivel 4: Conceptos Específicos de Visión por Computadora y Colorimetría

### 12. Espacio de Color Perceptual `CIELAB` ($L^*a^*b^*$) y Distancia $\Delta E$
* **Por qué no buscamos cosméticos en `RGB`:** En `RGB`, los tres canales mezclan color e iluminación. Si una persona se toma una selfie con una sombra ligera en el rostro, los valores $[R, G, B]$ de su labial cambian drásticamente.
* **Cómo funciona `CIELAB`:** Separa la **Luminancia ($L^*$)** en un canal independiente y deja la cromaticidad pura en dos ejes oponentes basados en la visión humana: **$a^*$ (verde $\leftrightarrow$ rojo)** y **$b^*$ (azul $\leftrightarrow$ amarillo)**.
* **Distancia $\Delta E$ (Delta E):** Es la distancia euclidiana en el espacio tridimensional $(L^*, a^*, b^*)$. Tanto el backend (para recomendar cuál de los 3,085 cosméticos de la tabla `products` es el más idéntico al maquillaje de la foto) como el frontend en [`color-names.ts`](../frontend/src/utils/color-names.ts) (para traducir un código `HEX` a su nombre de color en español y filtrar por color en el Feed) utilizan $\Delta E$ en `CIELAB`.



---

## Nivel 5: Primitivas de Interacción Accesible Multiplataforma (Fase 02)

### 13. Área Táctil Mínima (`48x48 dp`) y `hitSlop` (Semana 6 + WCAG 2.5.5 / 2.5.8)
* **¿Qué es?** En pantallas táctiles, un botón visualmente pequeño (por ejemplo, un ícono de $20 \times 20\text{ px}$) es muy difícil de acertar para personas con temblores esenciales, parálisis cerebral o cuando se usa el teléfono con una sola mano en movimiento.
* **Diferencia entre tamaño visual y área de captura (`hitSlop`):**
  * `minWidth: 48` y `minHeight: 48` (`MinTouchTargetSize` en [`theme.ts`](../frontend/src/constants/theme.ts)) aseguran que la caja del botón mida al menos $48 \times 48\text{ dp}$ (superando el mínimo de $44 \times 44\text{ pt}$ de iOS Human Interface Guidelines y Semana 6 del curso).
  * `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` en [`AccessiblePressable`](../frontend/src/components/ui/accessible-pressable.tsx) extiende además un margen invisible de $8\text{ dp}$ alrededor del botón donde el sistema operativo sigue reconociendo el toque sin alterar el diseño visual (*layout*).

### 14. Patrón *Disclosure* y Salto de Bloques (*WCAG 2.4.1 Bypass Blocks*)
* **El problema:** Si una pantalla tiene un panel con 15 botones de filtro o de ajustes de accesibilidad siempre visibles en la parte superior, un usuario que navega con la tecla `Tab` o haciendo *swipe* con *TalkBack/VoiceOver* tendría que recorrer los 15 controles uno por uno cada vez que entra a la pantalla antes de llegar a las fotos.
* **La solución en AurasMatch ([`AccessibleCollapsible`](../frontend/src/components/ui/collapsible.tsx)):**
  * Agrupa cualquier bloque denso de controles detrás de un único botón desplegable con `accessibilityRole="button"` y `accessibilityState={{ expanded: isOpen }}` (`aria-expanded` en Web).
  * Mientras está cerrado (`isOpen === false`), los controles hijos no existen en el árbol de accesibilidad, permitiendo saltar todo el bloque con un solo `Tab` o *swipe*.

### 15. Regiones Vivas (`accessibilityLiveRegion` / `aria-live`) y Paridad Visual-Háptica
* **¿Qué es una Región Viva (*Live Region*)?** Normalmente, un lector de pantalla solo lee el elemento donde el usuario tiene puesto el foco. Si aparece un mensaje de error o confirmación en otra parte de la pantalla, una persona ciega no se enteraría. Al marcar [`VisualAlertBanner`](../frontend/src/components/ui/visual-alert-banner.tsx) con `accessibilityRole="alert"`, `accessibilityLiveRegion="assertive"` (o `"polite"`) y `'aria-live'` en Web, el lector de pantalla anuncia el mensaje automáticamente sin mover el foco del usuario.
* **Paridad para Diversidad Auditiva:** Al mismo tiempo, para usuarios sordos o con hipoacusia (`2ndPhaseProposal.pdf` Sección V.C), ninguna alerta depende de un pitido sonoro: toda alerta combina el banner visual de alto contraste con ícono semántico (`ℹ️`, `✅`, `⚠️`, `⛔`) y un pulso físico en el motor háptico del teléfono (`expo-haptics`).

### 16. Síntesis de Voz Multiplataforma (`Text-to-Speech` / `Voice-to-Speech`)
* **¿Cómo funciona en AurasMatch ([`a11y-feedback.ts`](../frontend/src/utils/a11y-feedback.ts))?**
  * En **Android e iOS nativo**, el módulo `expo-speech` se comunica con el motor TTS del sistema operativo (`android.speech.tts.TextToSpeech` / `AVSpeechSynthesizer` en iOS) configurando el idioma `'es-ES'`.
  * En **Web**, React Native Web delega en la API estándar del navegador `window.speechSynthesis` instanciando un objeto `SpeechSynthesisUtterance`.
  * Antes de hablar, siempre se invoca `stopSpeaking()` para cancelar cualquier lectura previa en cola y evitar superposición de audio.


---

## Nivel 6: Persistencia en la Nube, Normalización de Medios y Sesiones Accesibles (Fase 03)

### 17. Migraciones Aditivas No Destructivas (`ALTER TABLE ... ADD COLUMN ... DEFAULT`)
* **¿Qué es?** En sistemas en producción donde un microservicio (como nuestro backend FastAPI en Google Cloud Run) ya está desplegado e insertando filas en una tabla SQL (`public.looks`), eliminar o renombrar columnas existentes rompería el servicio en vivo.
* **Cómo se aplica en AurasMatch:** Al usar `ADD COLUMN IF NOT EXISTS ... DEFAULT ...` para agregar `description`, `liked_by`, `appeal_status` y `comments`, las consultas `INSERT` antiguas del backend siguen funcionando sin cambiar una sola línea de Python, porque el motor PostgreSQL rellena automáticamente el valor por defecto en cada nueva fila.

### 18. Normalización de URLs Relativas al Protocolo (`//s3.amazonaws.com/...`) en React Native
* **El problema:** En desarrollo web clásico, una URL que empieza con doble barra (`//s3.amazonaws.com/...`, usada en los 3,085 registros de Makeup API dentro de `public.products.image_url`) hereda automáticamente el protocolo `http:` o `https:` de la página actual. Sin embargo, en **React Native (iOS y Android)** la app no corre dentro de una página web `https://`, por lo que pasar una ruta `//...` al componente nativo `<Image />` falla silenciosamente.
* **La solución (`resolveProductImageUrl` en [`supabase.ts`](../frontend/src/services/supabase.ts)):** Detecta cualquier URL que comience con `//` y la transforma explícitamente a `https://...` antes de entregarla a la interfaz.

### 19. Sesiones Persistentes sin Expiración Abrupta (`2ndPhaseProposal.pdf` Sección V.A.5)
* **¿Por qué es un requisito de accesibilidad?** Los estándares WCAG 2.2.1 (*Timing Adjustable*) y nuestra propuesta de Fase 2 establecen que las personas con limitaciones motoras o cognitivas tardan más tiempo en completar formularios o recorrer pantallas. Si el token de sesión caduca a mitad de uso sin renovarse automáticamente, el usuario pierde su progreso.
* **Cómo se implementa:** El cliente de Supabase se inicializa con `persistSession: true` y `autoRefreshToken: true` respaldado por `AsyncStorage` (`safeAuthStorage`), renovando el JWT en segundo plano de forma transparente.


---

## Nivel 7: Ingeniería de Retención UX (*Gradual Engagement*) y Arquitectura de Navegación (Fase 04)

### 20. Compromiso Gradual (*Gradual Engagement / Deferred Authentication*) vs. Muro de Login (*Hard Login Wall*)
* **Fundamento Académico y de Industria (Nielsen Norman Group & Apple HIG):**
  * Un *Hard Login Wall* exige que el usuario se autentique antes de experimentar el valor de la aplicación, elevando el **Costo de Interacción (*Interaction Cost*)** y violando el **Principio de Reciprocidad**, lo que provoca altas tasas de abandono en el Día 1.
  * El patrón *Gradual Engagement* (Wroblewski / Apple HIG *"Delay sign-in as long as possible"*) permite al usuario explorar libremente el catálogo y configurar su accesibilidad desde el segundo cero, presentando el formulario de autenticación ([`ContextualAuthPrompt`](../frontend/src/components/auth/contextual-auth-prompt.tsx)) únicamente cuando el usuario dispara una acción que requiere persistencia personal en la nube (*guardar un look, dar Me gusta o subir una fotografía*).

### 21. Autenticación Accesible y Reducción de Carga Cognitiva (WCAG 2.2 Criterio 3.3.8)
* **¿Qué establece WCAG 2.2 SC 3.3.8 (*Accessible Authentication*)?** Recordar, transcribir o manipular contraseñas constituye una **prueba de función cognitiva** que afecta desproporcionadamente a personas con dislexia, TDAH o limitaciones motoras.
* **Cómo lo resuelve AurasMatch:**
  1. No bloquea la exploración del Feed ni el uso del Filtro Triple detrás de un login obligatorio.
  2. Coloca el **Menú Desplegable de Accesibilidad** encima del bloque de cuenta en `Usuario`, permitiendo activar el **Modo de Alto Contraste AAA**, la **Fuente para Dislexia** y el **Escalado al 200%** *antes* de interactuar con cualquier campo de texto de autenticación.

### 22. Patrón *Headless Custom Hook* (`useUserProfile`)
* **¿Qué es?** Es un patrón de arquitectura limpia en React donde toda la lógica de estado, llamadas asíncronas a Supabase, filtrado de colecciones (`myUploadedLooks`, `myLikedLooks`, `mySavedLooks`) y mutaciones (`requestHumanAppeal`) se encapsulan dentro de un hook sin interfaz visual ([`useUserProfile`](../frontend/src/hooks/use-user-profile.ts)).
* **Por qué es clave para Google Stitch y la Defensa Técnica:** El archivo de pantalla ([`profile.tsx`](../frontend/src/app/profile.tsx)) se limita a describir la estructura visual consumiendo los datos ya procesados del hook. Así, aplicar estilos nuevos con **Google Stitch** jamás pone en riesgo las consultas a la base de datos.

---

## Nivel 8: Búsqueda Multidimensional, Tolerancia a Errores y Cuadrícula Responsiva (Fase 05)

### 23. Distancia de Levenshtein y Tolerancia a Errores Ortográficos (WCAG 2.1 SC 3.3.3 y `2ndPhaseProposal.pdf` Sección V.B)
* **¿Qué es la Distancia de Levenshtein?** Es una métrica de distancia de edición que calcula el número mínimo de operaciones elementales (inserción, eliminación o sustitución de un carácter) necesarias para transformar una cadena de texto en otra.
* **Aplicación en Diversidad Cognitiva ([`fuzzy-search.ts`](../frontend/src/utils/fuzzy-search.ts)):**
  * Para usuarios con dislexia, temblores motores o teclados reducidos en móvil, escribir términos no tradicionales como `"jirai"`, `"egirl"`, `"cleangirl"` o `"gótico"` suele generar errores comunes (ej. `"jiray"`, `"egilr"`, `"gotico"`, `"labial"`).
  * AurasMatch indexa un diccionario canónico de subculturas, regiones faciales y familias de color. Al escribir en la barra de búsqueda persistente, calcula la distancia de Levenshtein y ofrece chips predictivos corregidos con un toque. Esto satisface directamente el criterio **WCAG 2.1 SC 3.3.3 (Sugerencia de Corrección de Errores)**.

### 24. Patrón de Combinación Contextual Inteligente en Filtros Multidimensionales
* **El desafío:** Un filtro tradicional aplica condiciones de intersección estricta (`AND`) directas entre columnas. Sin embargo, en un sistema de maquillaje donde los looks tienen 4 regiones segmentadas (`lips`, `brows`, `eyelids`, `lash_line`), buscar un "Color" de forma aislada tiene un significado diferente a buscar un "Color + Área Facial".
* **Lógica de Combinación en [`use-feed.ts`](../frontend/src/hooks/use-feed.ts):**
  1. **Subcultura:** Filtra looks que pertenezcan a esa estética (`Jirai Kei`, `Clean Girl`, `Goth`, `E-Girl`, `Y2K`).
  2. **Área Facial + Color (Juntos):** Evalúa que el tono perceptual extraído en esa área específica (`extracted_regions[área].hex_value`) coincida con la familia cromática seleccionada (vía distancia perceptual $\Delta E$ en CIELAB $\le 28$).
  3. **Solo Color (Sin Área):** Busca que el tono esté presente en *cualquiera* de las 4 áreas faciales del look.
  4. **Solo Área Facial (Sin Color):** Filtra looks que tengan productos y extracción en esa región facial.
  5. **Texto Libre:** Aplica coincidencia difusa (*fuzzy*) sobre descripciones, etiquetas, autores y nombres de color.

### 25. Cuadrícula Responsiva Estilo Pinterest con Conmutación Dinámica de Columnas (WCAG 1.4.4 *Resize Text*)
* **¿Qué exige WCAG 1.4.4?** La aplicación debe permitir escalar el texto hasta un 200% sin que el contenido se trunque, se desborde o se solapen los elementos interactivos.
* **Mecanismo de Conmutación Adaptativa ([`index.tsx`](../frontend/src/app/index.tsx)):**
  * Con escalado tipográfico normal (`100%` a `125%`), la pantalla presenta una **cuadrícula de 2 columnas estilo Pinterest**, optimizando el espacio visual y la densidad de exploración.
  * Si el usuario incrementa el escalado a **$\ge 150\%$** (o la pantalla es estrecha $< 520\text{ px}$), la vista cambia automáticamente a **1 sola columna ancha**. Esto asegura que las etiquetas de verificación Anti-IA, los botones de acción (`♥`, `★`, `🔊`) y los textos descriptivos mantengan tamaños táctiles $\ge 48\times 48\text{ dp}$ sin ningún truncamiento horizontal.

### 26. Acciones de Accesibilidad Nativas (`accessibilityActions` y `onAccessibilityAction`)
* **¿Por qué son críticas para lectores de pantalla (TalkBack, VoiceOver, NVDA)?**
  * En interfaces complejas como una tarjeta estilo Pinterest con múltiples botones secundarios (Ver detalles, Like, Guardar, Escuchar voz), un usuario ciego que navega deslizando el dedo tendría que escuchar y presionar cada botón de manera secuencial para cada publicación del feed, generando una fatiga cognitiva extrema.
* **Cómo lo implementa [`LookCard`](../frontend/src/components/feed/look-card.tsx):**
  * La tarjeta completa se agrupa como un único nodo accesible (`accessible={true}`, `accessibilityRole="button"`).
  * Expone la lista semántica `accessibilityActions: [{ name: 'activate' }, { name: 'like' }, { name: 'save' }, { name: 'speak' }]`.
  * En TalkBack / VoiceOver, el lector anuncia: *"Acciones disponibles: deslice hacia arriba o abajo para seleccionarlas"*. El usuario puede dar Me Gusta o Guardar en un solo gesto sin necesidad de explorar los controles internos.

### 27. Anuncios de Resultados en Regiones Vivas Políticas (`accessibilityLiveRegion="polite"` / WCAG 4.1.3 *Status Messages*)
* **Propósito:** Al aplicar un filtro, borrar una búsqueda o seleccionar una subcultura, una persona vidente ve inmediatamente la actualización visual del número de publicaciones. Para un usuario ciego, el criterio **WCAG 4.1.3** requiere que el cambio de estado se anuncie sin robar el foco activo del usuario.
* **Implementación:** Al definir la barra de conteo con `accessibilityLiveRegion="polite"` y `aria-live="polite"`, el sintetizador de voz del dispositivo anuncia discretamente: *"Mostrando 3 de 3 looks verificados (1 filtro aplicado)"* justo después de que el usuario termina su interacción, respetando el flujo de lectura sin interrupciones abruptas.

---

## Nivel 9: Detalle de Publicación Estilo Pinterest, Popup de Cosméticos y Step-Zoom (Fase 06)

### 28. Step-Zoom Accesible por Botones vs. Gestos Complejos de Pellizco (Promesa M.3 y `2ndPhaseProposal.pdf` Sección V.A.4)
* **El problema de accesibilidad:** En aplicaciones móviles tradicionales (como Instagram o galerías), inspeccionar detalles de maquillaje (como la precisión de un delineado alado o el degradado de labios) exige el gesto bimanual de pellizco para zoom (*pinch-to-zoom*). Este gesto es sumamente excluyente para personas con temblores motores, artritis, amputaciones o una sola mano disponible.
* **Solución en [`StepZoomImage`](../frontend/src/components/ui/step-zoom-image.tsx):**
  * Proporciona una barra de zoom accesible con botones táctiles grandes ($\ge 48 \times 48\text{ dp}$) de `+ Zoom` y `- Zoom`.
  * Incrementa la escala visual en pasos discretos ($1\times \to 1.5\times \to 2\times \to 2.5\times$).
  * Puede operarse con un solo toque, con la barra espaciadora o con la tecla `Enter` de un switch o teclado adaptado, satisfaciendo **WCAG 2.5.1 (Pointer Gestures)**.

### 29. Modal Accesible de Producto con Gestión de Foco y Regla Móvil-Primero (Promesa C.3 y `2ndPhaseProposal.pdf` Sección V.C.3)
* **¿Qué es la gestión de foco en diálogos modales (WCAG 2.4.3 *Focus Order*)?**
  * Al abrir una ventana emergente sobre la pantalla actual, el foco del lector de pantalla o teclado no debe perderse ni permanecer en los elementos que quedaron detrás en el fondo.
  * Si el foco no está atrapado, un usuario invidente podría terminar activando accidentalmente botones del feed que no ve.
* **Implementación en [`ProductDetailModal`](../frontend/src/components/look/product-detail-modal.tsx):**
  * **En Móvil (Android/iOS):** Utiliza la propiedad nativa `accessibilityViewIsModal={true}` en el componente `Modal`, garantizando que TalkBack y VoiceOver reconozcan el diálogo como una ventana aislada y no lean el contenido subyacente.
  * **En Web:** Se inyectan condicionalmente atributos ARIA `{ role: 'dialog', 'aria-modal': true }` mediante guardas `Platform.OS === 'web'`. Permite cerrar el diálogo mediante la tecla física `Escape` y devuelve el flujo de navegación sin desorientación.

### 30. Mapeo Perceptual de Coordenadas CIELAB ($L^*, a^*, b^*$) en Cosméticos Reales
* **¿Por qué CIELAB y no RGB?**
  * El espacio RGB depende del dispositivo y de la calibración de la pantalla; una distancia euclidiana en RGB no corresponde a cómo el ojo humano percibe las diferencias entre tonos de piel y maquillaje.
  * En el espacio **CIE $L^*a^*b^*$**, $L^*$ representa la luminosidad perceptual ($0 = \text{negro}$, $100 = \text{blanco}$), $a^*$ representa el eje Verde ($-$) a Rojo ($+$), y $b^*$ representa el eje Azul ($-$) a Amarillo ($+$).
* **Uso en el Detalle del Look:**
  * Al extraer un tono facial con MediaPipe, AurasMatch busca en la tabla `public.products` (con más de 3,000 tonos indexados) el cosmético cuya distancia euclidiana $\Delta E = \sqrt{(\Delta L^*)^2 + (\Delta a^*)^2 + (\Delta b^*)^2}$ sea mínima.
  * El popup del producto exhibe estas coordenadas para dar total transparencia al usuario sobre la exactitud cromática del maquillaje recomendado.

---

## Nivel 10: Subida, Análisis en Cloud Run, Alt-Text Accesible y Apelación Anti-IA (Fase 07)

### 31. Captura de Imagen Multiplataforma y Gestión de Permisos Nativos (`expo-image-picker`)
* **¿Por qué es fundamental para la experiencia móvil?**
  * En Android e iOS, el acceso a la cámara y a la galería requiere declarar permisos explícitos en el manifiesto (`CAMERA`, `READ_MEDIA_IMAGES` en Android, `NSCameraUsageDescription` en iOS).
  * `expo-image-picker` abstrae estas APIs del sistema operativo garantizando que en móviles nativos la cámara se abra de forma fluida con proporciones optimizadas ($4:5$, `quality: 0.82`), mientras que en la web mapea internamente al selector estándar accesible `<input type="file" accept="image/*">`, cumpliendo la Regla Multiplataforma Móvil-Primero.

### 32. Autoguardado Asíncrono sin Expiración en `AsyncStorage` (`2ndPhaseProposal.pdf` Sección V.B)
* **El problema de accesibilidad cognitiva:**
  * Usuarios con discapacidades cognitivas, problemas de memoria a corto plazo, fatiga mental o déficit de atención requieren pausas prolongadas mientras preparan una publicación. Las aplicaciones convencionales suelen cancelar borradores o cerrar sesiones de forma abrupta por inactividad.
* **Implementación en [`use-upload-look.ts`](../frontend/src/hooks/use-upload-look.ts):**
  * Toda fotografía seleccionada, resultado de análisis preliminar y texto editado por el usuario se serializa instantáneamente en el almacenamiento persistente local (`@aurasmatch/upload_look_draft_v1`).
  * No existe ningún temporizador que borre la información; al cambiar de pestaña en la barra de navegación o reiniciar la aplicación, el estado se restaura de manera idéntica y se le informa con un `VisualAlertBanner` accesible.

### 33. Texto Descriptivo (Alt-Text) Generado por IA y Editable por el Creador (`2ndPhaseProposal.pdf` Sección V.D)
* **La promesa de la Fase 2:**
  * Para garantizar una verdadera inclusión para personas con discapacidad visual total o baja visión que navegan con lectores de pantalla (TalkBack, VoiceOver o NVDA), cada imagen de maquillaje debe contar con una descripción detallada que no dependa únicamente de un "Título".
* **Implementación Técnica:**
  * El motor de análisis inspecciona la subcultura clasificada y los tonos dominantes extraídos en espacio CIELAB ($L^*, a^*, b^*$).
  * Genera una descripción automática en lenguaje natural en español (ej. *"Fotografía de maquillaje con estética estilo Clean Girl. En labios destaca un tono Nude / Beige suave (#C59B87), en párpados destaca tono Coral cálido (#E07A5F)... Foto 100% verificada de origen humano."*).
  * Cumpliendo rigurosamente la promesa de la propuesta, la app **no bloquea el texto**, sino que se lo presenta al usuario en un campo `TextInput` accesible para que pueda editarlo, enriquecerlo o corregirlo antes de publicarlo en Supabase (`looks.description`).

### 34. Mitigación de Falsos Positivos Anti-IA y Mecanismo de Apelación Humana (`Project Proposal.pdf` Sección IV.C)
* **El dilema de la moderación sintética:**
  * Tal como se identificó en los riesgos técnicos del `Project Proposal.pdf` (Sección IV.C), ciertos maquillajes reales con base de alta cobertura, piel extremadamente suave o filtros de iluminación pueden generar puntajes elevados de sospecha sintética en el motor de textura dérmica y análisis espectral FFT ($\text{ai\_confidence\_score} \ge 0.50$).
* **Resolución mediante Apelación:**
  * En lugar de simplemente rechazar o silenciar al usuario, la aplicación exhibe un badge de alerta transparente explicando el motivo del filtro.
  * Habilita un botón accesible de acción táctil amplia ($\ge 48 \times 48\text{ dp}$): **"Solicitar Apelación Humana"**, el cual actualiza el registro en Supabase con `appeal_status = 'pending'`, notificando al usuario que un moderador humano verificará la autenticidad de su trabajo artístico para integrarlo al feed.

---

## Nivel 11: Comentarios Desplegables, Control por Voz y Asistencia Motriz (Fase 08)

### 35. Supresión de Bloques Repetitivos en Comentarios Comunitarios (`AccessibleCollapsible` & WCAG 2.4.1)
* **El problema de navegación accesible:**
  * En una pantalla de detalle estilo Pinterest, una sección de comentarios abierta por defecto con decenas de opiniones crea una barrera infranqueable de fatiga táctil y cognitiva. Un usuario ciego con *TalkBack* o *VoiceOver* se ve forzado a deslizar el dedo cientos de veces por cada comentario individual antes de poder llegar a las publicaciones similares al final de la pantalla.
* **Implementación en [`comments-section-collapsible.tsx`](../frontend/src/components/look/comments-section-collapsible.tsx):**
  * La sección utiliza el componente atómico [`AccessibleCollapsible`](../frontend/src/components/ui/collapsible.tsx) cerrado por defecto, informando el total de comentarios en su subtítulo accesible (*"3 comentarios"*).
  * El usuario que solo desea explorar cosméticos o publicaciones similares puede saltar el bloque completo con un único desplazamiento (`Tab` o *swipe*), cumpliendo WCAG 2.4.1 (*Bypass Blocks*). Si decide interactuar, activa el desplegable para desplegar la lista y el formulario de envío.

### 36. Formularios de Entrada sin Límite de Tiempo (WCAG 2.2.1 Timing Adjustable)
* **Principio de tiempo ajustable:**
  * Las pautas WCAG 2.2.1 exigen que los usuarios dispongan de tiempo suficiente para leer, escribir y completar tareas interactivas sin cierres de sesión intempestivos ni pérdida de datos por inactividad.
* **Aplicación en AurasMatch:**
  * El formulario de comentarios permite escribir opiniones sin ningún temporizador de expiración. Incorpora un contador visual y semántico de caracteres restantes ($\text{hasta } 300\text{ caracteres}$), validación de campos vacíos mediante [`VisualAlertBanner`](../frontend/src/components/ui/visual-alert-banner.tsx) y retroalimentación háptica y auditiva en cada envío exitoso.

### 37. Coincidencia Visual y Programática de Etiquetas de Voz (WCAG 2.5.3 Label in Name & `2ndPhaseProposal.pdf` V.A.3)
* **¿Cómo opera el Control por Voz nativo?**
  * Los motores de control por voz del sistema operativo (*Voice Control* en iOS y *Voice Access* en Android) permiten a usuarios con discapacidades motrices severas controlar la interfaz diciendo en voz alta el nombre visual del botón.
  * La pauta WCAG 2.5.3 (*Label in Name*) exige que el nombre programático accesible (`accessibilityLabel`) comience obligatoriamente con el mismo texto que el usuario lee visualmente en pantalla.
* **Implementación en AurasMatch:**
  * Todos los botones interactivos siguen una concordancia 1:1 estricta:
    * Botón visual `"Publicar"` $\rightarrow$ `accessibilityLabel="Publicar"` o `"Publicar comentario"`.
    * Botón visual `"Dar me gusta"` $\rightarrow$ `accessibilityLabel="Dar me gusta"`.
    * Botón visual `"Guardar"` $\rightarrow$ `accessibilityLabel="Guardar"`.
    * Botón visual `"Escuchar"` $\rightarrow$ `accessibilityLabel="Escuchar descripción de audio"`.
  * Gracias a esta convención, un usuario que diga *"Toca Publicar"* en su teléfono móvil activará el componente sin ambigüedades ni fallos de foco.

### 38. Paleta Flotante de Asistencia Motriz y Demostración en Vivo (`AssistiveVoiceBar`)
* **Reto pedagógico y de sustentación:**
  * Durante la defensa técnica oral (40% de la nota) y la demostración en vivo (10% de la nota) estipuladas en la Rúbrica de la Fase 3, el profesor evaluador puede requerir evidenciar la operación de los comandos de voz en un entorno de prueba donde los servicios nativos de reconocimiento de voz del sistema no estén configurados (por ejemplo, en un emulador de desarrollo o en un navegador web).
* **Solución en [`assistive-voice-bar.tsx`](../frontend/src/components/ui/assistive-voice-bar.tsx):**
  * Incorpora un control activable desde el Menú de Opciones de Accesibilidad en el Perfil de Usuario.
  * Al encenderse, despliega un botón flotante accesible ($\ge 48 \times 48\text{ dp}$, con iconos $\text{🎙️ } \♿$) anclado en la esquina inferior.
  * Al pulsarlo, abre una paleta de atajos asistidos que ejecutan directamente las acciones de navegación y simulan las órdenes de voz (*"Ir al Feed"*, *"Subir Look"*, *"Mi Perfil"*, *"Escuchar Pantalla"*, *"Dar me gusta"*, *"Guardar"*), emitiendo vibración háptica y anuncios por voz mediante síntesis accesible (`announceStatus`).
  * Incluye una guía didáctica desplegable que explica detalladamente la equivalencia exacta de las frases para iOS *Voice Control* y Android *Voice Access*.

---

## Nivel 12: Seguridad RLS, Sincronización Reactiva y Entregables de Ingeniería (Fase 09)

### 39. Políticas RLS Granulares, Triggers Protectores y RPCs `SECURITY DEFINER` (PostgreSQL / Supabase)
* **Concepto:** En arquitecturas BaaS donde la aplicación móvil usa únicamente la clave pública `anon` + token JWT del usuario autenticado (`authenticated`), la seguridad reside en el motor **Row-Level Security (RLS)** de PostgreSQL y no en ocultar credenciales privadas en el cliente.
* **Aplicación en AurasMatch ([`supabase-rls-and-rpcs.sql`](./supabase-rls-and-rpcs.sql)):**
  * Para permitir que un autor edite su *Alt-Text* (`description`) o solicite revisión (`appeal_status = 'pending'`) sin poder falsificar la verificación humana, el trigger `protect_look_verification_columns` bloquea cualquier alteración de `user_id`, `is_human_verified` o `ai_confidence_score` proveniente de sesiones `anon`/`authenticated`.
  * Dado que dar *Me gusta* o comentar sobre publicaciones de terceros exige mutar una publicación ajena (`liked_by`, `comments`), PostgreSQL encapsula esas mutaciones en funciones **RPC `SECURITY DEFINER`** (`toggle_look_like(p_look_id)` y `add_look_comment(p_look_id, p_comment)`) con bloqueo de fila (`FOR UPDATE`), validación de longitud server-side y lectura obligatoria de `auth.uid()`.

### 40. Bus Reactivo de Eventos *Cross-Screen* (`subscribeLookDataChanges`)
* **Problema resuelto:** Al migrar la barra inferior a `<Slot />` en [`app-tabs.tsx`](../frontend/src/components/app-tabs.tsx), cada cambio de pestaña desmonta/remonta la ruta activa, y la versión de `expo-router` utilizada (`~58.0.28`) no expone `useFocusEffect` para rehidratar automáticamente al regresar.
* **Implementación en [`supabase.ts`](../frontend/src/services/supabase.ts):**
  * Un emisor ligero en memoria publica eventos tipados (`like`, `save`, `comment`, `description`, `appeal`, `created`) cuando culmina una operación persistente.
  * Los hooks `useFeed`, `useLookDetail` y `useUserProfile` se suscriben al bus y sincronizan sus estados locales al instante, manteniendo consistencia visual sin saturar la red ni recargar catálogos completos.

### 41. Matriz Trazable Corte 2 $\rightarrow$ Corte 3 y Rigor de Entrega ([`Entrega_Final_AurasMatch.md`](./Entrega_Final_AurasMatch.md))
* **Trazabilidad documental:** Una entrega de ingeniería madura no declara cumplimiento genérico de accesibilidad; vincula explícitamente **cada una de las 16 promesas** comprometidas en la propuesta previa ([`2ndPhaseProposal.pdf`](../projectProposalDocs/2ndPhaseProposal.pdf)) con criterios WCAG 2.1/2.2, componentes concretos y rangos de líneas verificados en el código fuente.
* **Separación entre verificación ejecutada y auditoría manual:** [`Entrega_Final_AurasMatch.md`](./Entrega_Final_AurasMatch.md) distingue estrictamente las pruebas ejecutadas y observadas (compilación `npx tsc --noEmit`, auditoría de secretos, pruebas CRUD en vivo contra Supabase) del protocolo paso a paso para validación en vivo con *TalkBack*, *VoiceOver* y navegación por teclado durante la sustentación final.



