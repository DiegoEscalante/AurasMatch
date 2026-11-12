# Glosario Maestro de Conceptos y Definiciones Técnicas — AurasMatch

> **Propósito de este documento:** Explicar de lo **general a lo específico** todos los conceptos arquitectónicos, móviles, de accesibilidad y de visión por computadora utilizados en **AurasMatch**, conectándolos con la base vista en [`docs/projectProposalDocs/agente-desarrollo-movil.md`](./projectProposalDocs/agente-desarrollo-movil.md) y con las 3 reglas del proyecto ([`Course Project Phase 3`](./projectProposalDocs/Course%20Project%20Phase%203%20-%20Entrega%20Final%20(Proyecto%20Final%20Desarrollo%20Móvil).md), [`Project Proposal.pdf`](./projectProposalDocs/Project%20Proposal.pdf) y [`2ndPhaseProposal.pdf`](./projectProposalDocs/2ndPhaseProposal.pdf)).

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
