# AGENTE DE IA DESBLOQUEADO: DESARROLLO MÓVIL CON REACT NATIVE
## Universidad de La Sabana — Facultad de Ingeniería • Compass (100% Completado)

> **¡Felicitaciones por culminar el curso de Desarrollo Móvil con React Native!**
> Has desbloqueado tu Agente de Inteligencia Artificial Oficial con todo el contexto, código y directrices de las 16 semanas de clase.

---

## 1. System Prompt del Agente Especialista en Desarrollo Móvil

```markdown
Eres el Agente Senior Especialista en Desarrollo Móvil con React Native y Expo para Compass (Universidad de La Sabana).
Tu rol es actuar como tutor técnico y par pedagógico para guiar en la construcción de aplicaciones móviles de alto rendimiento,
accesibles, fluidas y listas para producción.

Principios Clave:
- Estándar de 60 FPS en el hilo de interfaz: animaciones con React Native Reanimated v3 y Gestos nativos.
- Código limpio en TypeScript: tipado estricto, separación de responsabilidades y cero valores mágicos.
- Accesibilidad (A11y): Soporte para lectores de pantalla (VoiceOver / TalkBack), contraste WCAG AAA y áreas táctiles de al menos 44x44 pt.
- Arquitectura robusta: React Navigation tipado, manejo de estado local/global (Zustand) y sincronización con servidor (TanStack Query).
- Seguridad y CI/CD: OAuth 2.0 con PKCE, Expo SecureStore, y builds automatizados con EAS Build.
```

---

## 2. Contenido Curricular y Contexto Completo de las 16 Semanas

### Semana 1: Introducción al Runtime de React Native y Entorno Expo

> **Propósito Central de la Sesión:** Comprender el runtime de React Native y preparar un entorno Expo que pueda diagnosticarse.

#### Conceptos Clave de la Clase
- **React Native no es una WebView**: React describe la interfaz y React Native traduce componentes a vistas de plataforma. No existen `div` ni CSS del navegador; `View`, `Text` y los módulos nativos obedecen reglas móviles.
  * *Aplicación Práctica:* Inspecciona el árbol con React DevTools y compara un componente con su representación en Android o iOS.
- **Expo y desarrollo nativo**: Expo ofrece tooling, SDK y servicios de build. Expo Go acelera pruebas con módulos incluidos; un development build incorpora módulos nativos propios y se acerca al binario real.
  * *Aplicación Práctica:* Elige Expo Go para aprendizaje temprano y development build cuando agregues configuración o librerías nativas.
- **Ciclo Metro-bundle-runtime**: Metro resuelve módulos y produce el bundle JavaScript; Fast Refresh preserva estado cuando es seguro. Un error puede pertenecer a Metro, JavaScript o compilación nativa, y cada capa se diagnostica distinto.
  * *Aplicación Práctica:* Lee la primera causa del error, limpia caché solo con motivo y confirma versiones con `npx expo-doctor`.

#### Flujo Metodológico de la Clase
1. Crear proyecto.
2. Iniciar Metro.
3. Abrir un runtime compatible.
4. Modificar, observar y diagnosticar.

#### Práctica de Taller / Laboratorio
Crea una app Expo TypeScript, ejecútala en dos plataformas y documenta estructura, comandos y un error solucionado.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Repositorio, capturas de ambas plataformas, salida de doctor y explicación del flujo.

#### Masterclasses y Referencias Recomendadas
- [React Native in 100 Seconds (Fireship)](https://www.youtube.com/watch?v=gvkqT_Uoahw)
- [React Native Tutorial for Beginners (Programming with Mosh)](https://www.youtube.com/watch?v=0-S5a0eXPoc)

### Semana 2: Fundamentos de React: Componentes, useState y useEffect

> **Propósito Central de la Sesión:** Comprender qué es React, cómo convierte estado en interfaz y cómo usar useState y useEffect correctamente antes de construir pantallas nativas.

#### Conceptos Clave de la Clase
- **React y el modelo declarativo**: React es una biblioteca para construir interfaces a partir de componentes. En lugar de ordenar cambios visuales paso a paso, se describe qué interfaz corresponde a las props y al estado actuales; React calcula y aplica los cambios necesarios.
  * *Aplicación Práctica:* Expresa cada estado de la pantalla como JSX y evita modificar la interfaz directamente.
- **Componentes, JSX y props**: Un componente es una función que devuelve JSX. JSX combina estructura visual con expresiones de JavaScript, mientras que las props son entradas de solo lectura que permiten reutilizar el mismo componente con datos distintos.
  * *Aplicación Práctica:* Divide una pantalla en componentes con una responsabilidad clara y pasa datos del padre al hijo mediante props tipadas.
- **Render, reconciliación y commit**: Un evento o cambio de estado solicita un render. React ejecuta los componentes de forma pura, compara el árbol resultante con el anterior y, durante commit, actualiza únicamente lo necesario. En React Native el destino son vistas nativas, no el DOM.
  * *Aplicación Práctica:* Mantén el render libre de peticiones, timers, mutaciones y suscripciones para que React pueda repetirlo con seguridad.
- **useState: memoria del componente**: `useState` conserva un valor entre renders y entrega una función setter que agenda el siguiente render. El estado se comporta como una instantánea: llamar al setter no cambia la variable del render que ya está ejecutándose.
  * *Aplicación Práctica:* Usa una actualización funcional como `setCount(previous => previous + 1)` cuando el siguiente valor depende del anterior.
- **useEffect: sincronización externa**: `useEffect` ejecuta sincronización después del commit. Sirve para sistemas externos como timers, suscripciones, APIs del dispositivo o red; no es una herramienta general para calcular valores derivados. Sus dependencias declaran cuándo resincronizar y el cleanup deshace el trabajo anterior.
  * *Aplicación Práctica:* Empareja iniciar/detener, suscribir/desuscribir o solicitar/cancelar, incluyendo todas las dependencias reactivas utilizadas.

#### Flujo Metodológico de la Clase
1. Describir la pantalla como un árbol de componentes y props.
2. Renderizar JSX puro a partir de las props y del snapshot de estado.
3. Capturar una interacción en un manejador de evento.
4. Solicitar el siguiente estado con un setter.
5. Reconciliar, hacer commit sobre la interfaz nativa y sincronizar sistemas externos con efectos.

#### Práctica de Taller / Laboratorio
Construye un contador de hábitos en React Native que recuerde repeticiones con useState y mantenga un timer activo con useEffect y cleanup.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Árbol de componentes, código tipado, explicación del ciclo render-commit, prueba del estado como snapshot y evidencia de que el timer no queda duplicado al desmontar.

#### Masterclasses y Referencias Recomendadas
- [10 React Hooks Explained (Fireship)](https://www.youtube.com/watch?v=TNhaISOUy6Q)
- [React Native Tutorial for Beginners (Programming with Mosh)](https://www.youtube.com/watch?v=0-S5a0eXPoc)
- [React Native in 100 Seconds (Fireship)](https://www.youtube.com/watch?v=gvkqT_Uoahw)

### Semana 3: Flexbox, Medición de Layout y Responsive Móvil

> **Propósito Central de la Sesión:** Dominar el algoritmo Flexbox de React Native y crear layouts adaptables sin coordenadas rígidas.

#### Conceptos Clave de la Clase
- **Eje principal y eje transversal**: `flexDirection` define el eje principal; `justifyContent` distribuye en ese eje y `alignItems` en el transversal. En React Native la dirección por defecto es columna.
  * *Aplicación Práctica:* Antes de cambiar propiedades, dibuja ambos ejes y marca qué espacio está distribuyéndose.
- **Medición y flex**: `flex` reparte espacio restante después de medir tamaño base, padding y márgenes. `flex: 1` no significa “100%” en todos los contextos y puede fallar dentro de un padre sin tamaño acotado.
  * *Aplicación Práctica:* Usa límites con `minWidth`, `maxWidth` y proporciones en vez de dimensiones mágicas.
- **Responsive móvil**: Responsive incluye ancho, orientación, tamaño de fuente, safe areas y teclado. `useWindowDimensions` reacciona a cambios; `Dimensions.get` aislado puede quedar obsoleto.
  * *Aplicación Práctica:* Cambia composición en breakpoints de contenido, no por nombres de dispositivos.

#### Flujo Metodológico de la Clase
1. Acotar el contenedor.
2. Definir dirección y distribución.
3. Permitir crecimiento o wrap.
4. Probar texto grande y rotación.

#### Práctica de Taller / Laboratorio
Replica una pantalla en móvil angosto, tableta y orientación horizontal sin duplicar componentes.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Tres capturas, explicación de ejes, safe area y ausencia de overflow.

#### Masterclasses y Referencias Recomendadas
- [CSS Flexbox in 100 Seconds (Fireship)](https://www.youtube.com/watch?v=K74l26pE4YA)

### Semana 4: Manejo de Estado, Custom Hooks y Formularios Controlados

> **Propósito Central de la Sesión:** Manejar estado, efectos y formularios sin ciclos, valores obsoletos ni renders innecesarios.

#### Conceptos Clave de la Clase
- **Estado como snapshot**: Cada render ve una instantánea inmutable. Llamar `setState` agenda otro render; no cambia la variable actual. Cuando el nuevo valor depende del anterior se usa la forma funcional.
  * *Aplicación Práctica:* Agrupa estado por invariantes y evita guardar valores que pueden derivarse durante render.
- **useEffect como sincronización**: Un efecto sincroniza React con sistemas externos: red, suscripciones, timers o APIs nativas. No es el lugar general para calcular datos ni responder a cada evento del usuario.
  * *Aplicación Práctica:* Incluye dependencias reales, cancela trabajo obsoleto y retorna cleanup para suscripciones.
- **Formulario controlado**: Valor, validación y envío forman estados distintos. Validar en cada tecla puede ser molesto; validar al blur o submit depende del riesgo y tipo de campo.
  * *Aplicación Práctica:* Impide doble envío, conserva errores por campo y maneja teclado con `KeyboardAvoidingView` cuando aplique.

#### Flujo Metodológico de la Clase
1. Capturar entrada.
2. Actualizar snapshot.
3. Validar con una regla pura.
4. Ejecutar envío y representar resultado.

#### Práctica de Taller / Laboratorio
Implementa un formulario con validación, estado de envío, cancelación de petición y manejo correcto del teclado.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Código, matriz de validación, prueba de doble toque y cleanup demostrado.

#### Masterclasses y Referencias Recomendadas
- [10 React Hooks Explained (Fireship)](https://www.youtube.com/watch?v=TNhaISOUy6Q)

### Semana 5: Principios de Diseño UX/UI Móvil y Jerarquía Visual

> **Propósito Central de la Sesión:** Traducir principios UX/UI a decisiones implementables y comprobables en una aplicación móvil.

#### Conceptos Clave de la Clase
- **UX frente a UI**: UX abarca la eficacia y percepción del recorrido; UI materializa jerarquía, controles y feedback. Una pantalla atractiva puede tener mala UX si oculta estado o exige pasos innecesarios.
  * *Aplicación Práctica:* Mide éxito de tarea, tiempo, errores y comprensión, no solo preferencia estética.
- **Jerarquía y affordance**: Tamaño, contraste, posición y espacio indican prioridad. Affordance comunica qué puede hacerse; un elemento que parece botón pero no responde rompe el modelo mental.
  * *Aplicación Práctica:* Define una acción primaria por pantalla y estados visibles para controles interactivos.
- **Feedback y prevención de errores**: Toda acción debe producir respuesta inmediata. Deshabilitar, confirmar acciones destructivas y permitir deshacer reduce errores mejor que mostrar mensajes tardíos.
  * *Aplicación Práctica:* Diseña loading, vacío, éxito, error recuperable y offline antes de implementar el happy path.

#### Flujo Metodológico de la Clase
1. Definir tarea y contexto.
2. Prototipar flujo mínimo.
3. Representar todos los estados.
4. Probar con usuarios y corregir evidencia.

#### Práctica de Taller / Laboratorio
Evalúa una app existente, rediseña un flujo de tres pantallas y prueba el prototipo con dos personas.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Hallazgos, flujo, estados, métricas y cambios posteriores a la prueba.

#### Masterclasses y Referencias Recomendadas
- [React Native Tutorial for Beginners (Programming with Mosh)](https://www.youtube.com/watch?v=0-S5a0eXPoc)

### Semana 6: Accesibilidad Móvil (A11y), Semántica y Lectores de Pantalla

> **Propósito Central de la Sesión:** Crear experiencias utilizables con lector de pantalla, navegación por foco, texto ampliado y contraste suficiente.

#### Conceptos Clave de la Clase
- **Semántica accesible**: `accessibilityRole`, label, hint y state permiten que la UI sea comprendida sin verla. El label debe expresar qué es; el hint, qué ocurre al activarlo.
  * *Aplicación Práctica:* Prueba con VoiceOver o TalkBack y corrige lecturas duplicadas o controles sin nombre.
- **Orden de foco y agrupación**: El árbol visual no garantiza una secuencia comprensible. Agrupar contenido relacionado reduce ruido, pero agrupar demasiado puede ocultar acciones internas.
  * *Aplicación Práctica:* Recorre toda la pantalla sin mirar y verifica que foco, lectura y acción sigan el flujo lógico.
- **Tamaño, contraste y movimiento**: Áreas táctiles amplias, texto escalable y contraste suficiente benefician a más usuarios. La accesibilidad no se resuelve únicamente con color ni con un modo separado.
  * *Aplicación Práctica:* Prueba fuente grande, reduce motion y tema de alto contraste sin cortar contenido.

#### Flujo Metodológico de la Clase
1. Construir con controles semánticos.
2. Nombrar estado y acción.
3. Recorrer con tecnología asistiva.
4. Corregir foco, tamaño y contraste.

#### Práctica de Taller / Laboratorio
Audita y corrige una pantalla usando lector de pantalla, fuente al máximo y navegación sin referencias visuales.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Checklist antes/después, video corto del lector, contrastes y decisiones justificadas.

#### Masterclasses y Referencias Recomendadas
- [React Native Tutorial for Beginners (Programming with Mosh)](https://www.youtube.com/watch?v=0-S5a0eXPoc)

### Semana 7: Sistemas de Diseño, Design Tokens y Componentes Multiplataforma

> **Propósito Central de la Sesión:** Construir un sistema de diseño que preserve decisiones visuales y comportamiento entre pantallas.

#### Conceptos Clave de la Clase
- **Design token**: Es un nombre semántico para una decisión: `color.text.muted`, `space.3` o `radius.control`. Un valor como `#777` repetido no explica intención y dificulta temas.
  * *Aplicación Práctica:* Separa tokens base de tokens semánticos y evita consumir colores crudos desde componentes.
- **Componente y variante**: Un componente encapsula estructura, interacción y accesibilidad; una variante representa diferencias permitidas. Añadir booleanos ilimitados produce combinaciones imposibles.
  * *Aplicación Práctica:* Define una API pequeña con variantes explícitas y estados disabled, loading, pressed y error.
- **Consistencia multiplataforma**: Consistencia no exige píxeles idénticos: cada plataforma tiene convenciones. El sistema protege identidad mientras adapta navegación, feedback y controles cuando mejora comprensión.
  * *Aplicación Práctica:* Documenta qué permanece común y qué se adapta por plataforma.

#### Flujo Metodológico de la Clase
1. Inventariar decisiones repetidas.
2. Nombrar tokens semánticos.
3. Componer primitivas.
4. Documentar variantes y probar estados.

#### Práctica de Taller / Laboratorio
Crea tokens de color/espacio/tipografía y tres componentes con variantes, tema claro y oscuro.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Archivo de tokens, catálogo de estados, ejemplos y prueba de cambio global.

#### Masterclasses y Referencias Recomendadas
- [React Native in 100 Seconds (Fireship)](https://www.youtube.com/watch?v=gvkqT_Uoahw)

### Semana 8: Diseño a Código con Inteligencia Artificial y Stitch MCP

> **Propósito Central de la Sesión:** Usar IA de diseño a código como acelerador controlado, con contexto, revisión y trazabilidad.

#### Conceptos Clave de la Clase
- **Diseño a código no es producto terminado**: La generación produce una hipótesis de implementación. Debe revisarse contra tokens, accesibilidad, navegación, estados y restricciones del runtime.
  * *Aplicación Práctica:* Trata cada salida como un pull request: compila, inspecciona, prueba y simplifica.
- **Contexto para IA**: Un prompt útil contiene tarea, usuario, restricciones, sistema de diseño, estados y criterio de aceptación. Más texto no siempre es mejor; contexto estructurado reduce ambigüedad.
  * *Aplicación Práctica:* Incluye ejemplos válidos y límites explícitos, y evita enviar secretos o datos personales.
- **MCP y límites de herramientas**: MCP estandariza cómo un modelo descubre y usa herramientas o recursos. El servidor controla capacidades; permisos mínimos y confirmación protegen acciones con efectos.
  * *Aplicación Práctica:* Distingue lectura, escritura y operaciones irreversibles y registra qué herramienta produjo cada cambio.

#### Flujo Metodológico de la Clase
1. Preparar contexto y criterio.
2. Generar una propuesta pequeña.
3. Validar código y experiencia.
4. Iterar conservando decisiones humanas.

#### Práctica de Taller / Laboratorio
Genera una pantalla desde especificación, intégrala al sistema de diseño y documenta diez correcciones necesarias.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Prompt, salida original, diff revisado, pruebas y reflexión sobre límites.

#### Masterclasses y Referencias Recomendadas
- [React Native in 100 Seconds (Fireship)](https://www.youtube.com/watch?v=gvkqT_Uoahw)

### Semana 9: Arquitectura de Navegación: Stacks, Tabs, Drawer y Deep Linking

> **Propósito Central de la Sesión:** Modelar navegación tipada, jerárquica y coherente con el ciclo de vida de las pantallas.

#### Conceptos Clave de la Clase
- **Stack, tabs y drawer**: Stack representa avance y retroceso; tabs cambia entre destinos pares preservando estado; drawer aloja destinos globales. Elegir por apariencia produce historiales confusos.
  * *Aplicación Práctica:* Dibuja el árbol de navegadores y define qué botón físico o gesto vuelve a dónde.
- **Parámetros y tipado**: Los parámetros identifican la pantalla o recurso; no deben transportar objetos grandes ni datos sensibles. TypeScript detecta nombres y formas inválidas antes de ejecutar.
  * *Aplicación Práctica:* Define ParamList y vuelve a consultar datos por ID para evitar copias obsoletas.
- **Deep linking**: Un enlace externo debe reconstruir estado de navegación desde una URL. Requiere esquema, rutas, validación y manejo cuando el usuario no está autenticado.
  * *Aplicación Práctica:* Prueba aplicación cerrada, abierta y enlace inválido en ambas plataformas.

#### Flujo Metodológico de la Clase
1. Resolver URL o intención.
2. Validar autenticación y parámetros.
3. Construir estado del navegador.
4. Montar pantalla y manejar retorno.

#### Práctica de Taller / Laboratorio
Implementa stack más tabs tipados y un deep link hacia detalle con guard de autenticación.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Árbol, tipos, enlaces probados y tabla de comportamiento de back.

#### Masterclasses y Referencias Recomendadas
- [React Native Tutorial for Beginners (Programming with Mosh)](https://www.youtube.com/watch?v=0-S5a0eXPoc)

### Semana 10: Animaciones de Alto Rendimiento con Reanimated y Gestos Nativos

> **Propósito Central de la Sesión:** Crear movimiento útil y gestos fluidos sin bloquear el hilo de JavaScript ni excluir usuarios.

#### Conceptos Clave de la Clase
- **Animación con propósito**: El movimiento debe explicar continuidad, jerarquía o resultado. Animar todo añade espera y ruido; duración y curva deben corresponder a distancia e intención.
  * *Aplicación Práctica:* Define qué información comunica cada transición y ofrece alternativa con reduce motion.
- **Hilo de UI y rendimiento**: Gestos y animaciones fluidas necesitan actualizarse cerca del hilo de UI. Trabajo pesado en JavaScript, renders amplios o imágenes grandes generan cuadros perdidos.
  * *Aplicación Práctica:* Perfila antes de optimizar y evita setState en cada frame de un gesto.
- **Máquina de estados del gesto**: Un gesto pasa por begin, active, end, fail o cancel. Ignorar cancelación deja vistas en posiciones intermedias y conflictos entre scroll y pan.
  * *Aplicación Práctica:* Define límites, umbral, snapping y restauración para cada final posible.

#### Flujo Metodológico de la Clase
1. Reconocer gesto.
2. Actualizar valor visual.
3. Decidir por velocidad/posición.
4. Completar o restaurar respetando accesibilidad.

#### Práctica de Taller / Laboratorio
Crea una tarjeta deslizable con umbral, cancelación, spring y modo reduce motion.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Demo a 60 fps, diagrama de estados, perfil y prueba de cancelación.

#### Masterclasses y Referencias Recomendadas
- [React Native in 100 Seconds (Fireship)](https://www.youtube.com/watch?v=gvkqT_Uoahw)

### Semana 11: Integración de Hardware, Sensores, Permisos y Ciclo de Vida

> **Propósito Central de la Sesión:** Usar permisos y hardware considerando disponibilidad, privacidad y ciclo de vida.

#### Conceptos Clave de la Clase
- **Permiso como estado**: Un permiso puede estar sin solicitar, concedido, denegado o bloqueado. Pedirlo al iniciar sin contexto reduce confianza; debe solicitarse al activar la función y explicar beneficio.
  * *Aplicación Práctica:* Diseña rutas para denegación y enlace a ajustes cuando el sistema no permita preguntar de nuevo.
- **Capacidad y plataforma**: No todo dispositivo tiene el mismo sensor ni toda API funciona en simulador. La app debe detectar capacidad y degradar de forma comprensible.
  * *Aplicación Práctica:* Prueba dispositivo real y usa guards de plataforma solo alrededor de diferencias verdaderas.
- **Suscripción y recursos**: Sensores, ubicación y cámara consumen batería y mantienen callbacks. Deben pausarse cuando la pantalla pierde foco o la app va a background.
  * *Aplicación Práctica:* Retorna cleanup, reduce frecuencia y conserva solo los datos necesarios.

#### Flujo Metodológico de la Clase
1. Explicar el beneficio.
2. Consultar y solicitar permiso.
3. Comprobar capacidad.
4. Usar, pausar y liberar recurso.

#### Práctica de Taller / Laboratorio
Implementa una función de cámara o ubicación con todos los estados de permiso y cleanup al perder foco.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Matriz de estados, prueba en dispositivo, medición básica y política de datos.

#### Masterclasses y Referencias Recomendadas
- [React Native Tutorial for Beginners (Programming with Mosh)](https://www.youtube.com/watch?v=0-S5a0eXPoc)

### Semana 12: Consumo Resiliente de APIs, Manejo de Errores y Estrategias Offline

> **Propósito Central de la Sesión:** Consumir APIs de forma resiliente distinguiendo transporte, protocolo, datos y experiencia de usuario.

#### Conceptos Clave de la Clase
- **Capas de error**: Una petición puede fallar por red, timeout, HTTP no exitoso, cuerpo inválido o regla de negocio. `fetch` no rechaza automáticamente por 404 o 500.
  * *Aplicación Práctica:* Comprueba `response.ok`, valida el cuerpo y convierte fallos en un tipo de error manejable.
- **Cancelación y carrera**: Una pantalla puede desmontarse o cambiar de consulta antes de recibir respuesta. Sin AbortController una respuesta vieja puede sobrescribir datos nuevos.
  * *Aplicación Práctica:* Cancela al limpiar el efecto y asocia cada resultado a la intención que lo originó.
- **Caché y experiencia offline**: Caché reduce latencia y uso de red, pero necesita política de frescura e invalidación. Offline-first define qué puede leerse o escribirse sin conexión y cómo sincroniza conflictos.
  * *Aplicación Práctica:* Distingue loading inicial, actualización en segundo plano, dato stale y error sin datos.

#### Flujo Metodológico de la Clase
1. Construir y cancelar solicitud.
2. Clasificar respuesta.
3. Validar datos.
4. Actualizar caché y representar frescura.

#### Práctica de Taller / Laboratorio
Consume una API con timeout, cancelación, validación de respuesta, retry manual y estados offline/stale.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Cliente tipado, matriz de errores, pruebas de carrera y capturas de estados.

#### Masterclasses y Referencias Recomendadas
- [10 React Hooks Explained (Fireship)](https://www.youtube.com/watch?v=TNhaISOUy6Q)

### Semana 13: Gestión de Estado Global y Sincronización de Server State

> **Propósito Central de la Sesión:** Elegir correctamente entre estado local, global y server state para evitar duplicación y desincronización.

#### Conceptos Clave de la Clase
- **Estado por propietario**: El estado debe vivir en el ancestro común más cercano que lo necesita. Mover todo a un store global aumenta acoplamiento y hace más difícil reutilizar componentes.
  * *Aplicación Práctica:* Clasifica cada dato como UI efímera, sesión, dominio cliente o dato remoto.
- **Server state**: Datos remotos tienen dueño externo, pueden quedar obsoletos y requieren caché, deduplicación, refetch e invalidación. Un store cliente genérico no resuelve automáticamente esas propiedades.
  * *Aplicación Práctica:* Usa claves de consulta estables y actualiza o invalida después de una mutación.
- **Actualización optimista**: La UI anticipa éxito y revierte si el servidor rechaza. Mejora percepción, pero necesita snapshot anterior y resolución cuando llegan mutaciones concurrentes.
  * *Aplicación Práctica:* Reserva optimismo para operaciones reversibles y muestra estado pendiente.

#### Flujo Metodológico de la Clase
1. Clasificar propiedad del dato.
2. Leer por clave.
3. Mutar con estrategia explícita.
4. Reconciliar caché con servidor.

#### Práctica de Taller / Laboratorio
Implementa lista remota con caché, invalidación y favorito optimista con rollback.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Mapa de estado, claves, prueba de deduplicación y fallo optimista.

#### Masterclasses y Referencias Recomendadas
- [10 React Hooks Explained (Fireship)](https://www.youtube.com/watch?v=TNhaISOUy6Q)

### Semana 14: Seguridad Móvil, Autenticación, JWT y Flujo OAuth con PKCE

> **Propósito Central de la Sesión:** Implementar autenticación móvil sin confundir sesión de interfaz con protección real de recursos.

#### Conceptos Clave de la Clase
- **Access y refresh token**: El access token debe vivir poco; el refresh token renueva sesión y requiere almacenamiento más protegido y rotación. Persistir ambos sin estrategia amplía el impacto de una extracción.
  * *Aplicación Práctica:* Usa almacenamiento seguro, borra sesión completa al revocar y evita tokens en logs o URLs.
- **Autorización en servidor**: Ocultar una pantalla no protege el endpoint. El servidor verifica firma, claims, rol y propiedad en cada operación sensible.
  * *Aplicación Práctica:* Prueba acceso directo con otro usuario aunque la UI no muestre el botón.
- **OAuth con PKCE en móvil**: Las apps instaladas son clientes públicos y no pueden guardar un client secret. PKCE vincula la respuesta de autorización a la instancia que inició el flujo.
  * *Aplicación Práctica:* Usa navegador del sistema, redirect URI registrado y valida `state` para evitar mezcla de sesiones.

#### Flujo Metodológico de la Clase
1. Autenticar en navegador seguro.
2. Intercambiar código con verifier.
3. Guardar credenciales mínimas.
4. Renovar, autorizar y cerrar sesión.

#### Práctica de Taller / Laboratorio
Modela login, renovación y logout; protege una ruta y prueba token vencido, alterado y de otro usuario.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Diagrama de flujo, almacenamiento elegido, pruebas negativas y threat model.

#### Masterclasses y Referencias Recomendadas
- [An Illustrated Guide to OAuth and OpenID Connect (OktaDev)](https://www.youtube.com/watch?v=t18YB3xDfXI)
- [What Is JWT and Why Should You Use JWT (Web Dev Simplified)](https://www.youtube.com/watch?v=7Q17ubqLfaM)

### Semana 15: Estrategia de Pruebas Automatizadas y CI/CD con EAS Build

> **Propósito Central de la Sesión:** Automatizar pruebas y builds reproducibles para detectar fallos antes de distribuir la aplicación.

#### Conceptos Clave de la Clase
- **Pirámide de pruebas móvil**: Pruebas unitarias validan lógica, componentes validan interacción y E2E valida recorridos reales. Muchas E2E son lentas y frágiles; ninguna E2E deja integraciones críticas sin cubrir.
  * *Aplicación Práctica:* Ubica cada riesgo en el nivel más barato capaz de detectarlo.
- **EAS Build**: Un perfil define canal, credenciales, variables y tipo de artefacto. Development, preview y production tienen objetivos distintos y no deben compartir configuración accidentalmente.
  * *Aplicación Práctica:* Versiona `eas.json`, protege secretos y registra qué commit produjo cada binario.
- **CI/CD móvil**: Además de lint y tests, el pipeline administra firma, builds costosos y distribución. El artefacto debe promoverse con trazabilidad, no reconstruirse de forma distinta para cada etapa.
  * *Aplicación Práctica:* Usa caché con clave de lockfile y aprobación para tiendas.

#### Flujo Metodológico de la Clase
1. Validar código.
2. Ejecutar pruebas por riesgo.
3. Construir artefacto firmado.
4. Distribuir a canal controlado.

#### Práctica de Taller / Laboratorio
Añade pruebas de lógica y componente, configura perfiles EAS y diseña pipeline para preview y producción.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Pruebas, configuración EAS, build identificable y diagrama del pipeline.

#### Masterclasses y Referencias Recomendadas
- [DevOps CI/CD Explained in 100 Seconds (Fireship)](https://www.youtube.com/watch?v=scEDHsr3APg)

### Semana 16: Rollout, Publicación en Tiendas, Monitoreo de Crashes y Analytics

> **Propósito Central de la Sesión:** Publicar responsablemente, observar comportamiento real y cerrar el ciclo de mejora del producto.

#### Conceptos Clave de la Clase
- **Release y rollout**: La aprobación de tienda no elimina riesgo. Un rollout gradual limita exposición y permite detener una versión si aumentan crashes o fallos de negocio.
  * *Aplicación Práctica:* Define umbrales antes de publicar y conserva una ruta de hotfix compatible.
- **Analytics con propósito**: Un evento responde una pregunta de producto; registrar cada toque crea ruido y riesgos de privacidad. Nombre, propiedades y versión forman un contrato.
  * *Aplicación Práctica:* Crea un tracking plan que excluya PII y mida embudo, retención o éxito de tarea.
- **Crash y rendimiento**: Crash-free sessions, ANR, tiempo de arranque y latencia de pantalla reflejan experiencia real. El promedio oculta colas; usa percentiles y segmenta por versión/dispositivo.
  * *Aplicación Práctica:* Asocia release, símbolo y source map para convertir un reporte en una línea accionable.

#### Flujo Metodológico de la Clase
1. Firmar y enviar release.
2. Liberar a una cohorte.
3. Observar salud y producto.
4. Detener, corregir o ampliar rollout.

#### Práctica de Taller / Laboratorio
Prepara checklist de publicación, tracking plan y dashboard con criterios de detener el rollout.

#### Evidencia de Aprendizaje Esperada
**Entregable evaluable:** Checklist, matriz de tiendas, eventos, métricas y plan de respuesta.

#### Masterclasses y Referencias Recomendadas
- [DevOps CI/CD Explained in 100 Seconds (Fireship)](https://www.youtube.com/watch?v=scEDHsr3APg)
- [React Native in 100 Seconds (Fireship)](https://www.youtube.com/watch?v=gvkqT_Uoahw)

---

## 3. Instrucciones de Activación del Agente

- **En ChatGPT / Claude / Gemini:** Carga este archivo o copia el System Prompt del paso 1 en las instrucciones personalizadas. Pídele ayuda diciendo: *"Revisa mi código para el taller de la Semana X con las rúbricas de Compass UniSabana"*.
- **En Cursor / Antigravity / Claude Code:** Agrega este archivo a tus `.cursorrules` o como skill de Antigravity para que revise tus componentes y pantallas con las reglas de rendimiento y accesibilidad vistas en clase.

---

## 4. Rúbrica Institucional de Evaluación

| Criterio | Ponderación | Descripción |
| :--- | :--- | :--- |
| **Funcionalidad y Casos de Borde** | 40% | Resuelve el 100% de los requerimientos y maneja errores adecuadamente. |
| **Clean Code y TypeScript** | 25% | Código legible, componentes atómicos, tipado estricto y diseño modular. |
| **Experiencia, 60 FPS y A11y** | 20% | Rendimiento óptimo, safe area, feedback inmediato y accesibilidad. |
| **Evidencia y Taller** | 15% | Entrega puntual con las instrucciones del taller y demostración funcional. |

---
*Universidad de La Sabana — Compass Desarrollo Móvil con React Native.*
