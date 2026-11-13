# **Proyecto de Curso: Fase 3 (Entrega Final Definitiva) — Despliegue de Producto, Accesibilidad Móvil y Defensa Técnica**

**Asignatura:** Desarrollo de Aplicaciones Móviles  
**Institución:** Universidad de La Sabana — Facultad de Ingeniería  
**Entregable:** Documento Técnico Final (PDF / Markdown) \+ Repositorio de Código Funcional \+ Presentación y Sustentación en Vivo  
**Modalidad:** Entrega en Equipos (Defensa Técnica Individual Aleatoria)  
**Ponderación:** 100% de la Entrega Final (Tercer Corte)

# **1\. Visión General y Objetivo (Overview & Objective)**

A lo largo del semestre, cada equipo ha concebido, diseñado y evolucionado una aplicación móvil desde sus cimientos:

* **Fase 1 (Primer Corte — Product Vision & State of the Art Proposal):** Validación rigurosa del problema real, definición de *user personas*, análisis competitivo (matriz comparativa y brechas del mercado) y formulación de la estrategia de innovación y estado del arte.  
* **Fase 2 (Segundo Corte — Propuesta de Accesibilidad y Mejora de UX/UI):** Auditoría e iteración arquitectónica enfocada en diseño inclusivo, proponiendo e integrando mejoras de accesibilidad móvil (estándares WCAG 2.1/2.2 adaptados a dispositivos móviles, compatibilidad con lectores de pantalla *VoiceOver / TalkBack*, contraste, escalado tipográfico y agrupación semántica de controles).

El objetivo de la **Fase 3 (Entrega Final Definitiva)** es consolidar ambas fases previas en un **producto móvil 100% funcional de extremo a extremo (End-to-End)**, verificando que tanto la propuesta de valor original como la propuesta de accesibilidad formulada en el segundo corte estén completamente implementadas en el código fuente, respaldadas por un documento técnico consolidado y defendidas oralmente ante el profesor.

# **2\. Estructura Requerida del Documento Final (20% de la Nota)**

El documento final consolida la evolución del proyecto desde la Fase 1 y Fase 2 hasta el producto terminado. Debe organizarse estrictamente en las siguientes cinco (5) secciones:

## **Sección 1: Consolidación de Visión del Producto, Problema y Estado del Arte (Evolución Fase 1\)**

* **Resumen Ejecutivo y Propuesta de Valor (UVP):** Nombre definitivo del proyecto, *tagline*, propósito central y *user personas* (incluyendo usuarios con necesidades de accesibilidad).  
* **Síntesis del Problema y Análisis Competitivo Actualizado:** Resumen del problema validado y tabla comparativa frente a los 3–4 competidores analizados en la Fase 1, demostrando cómo el producto final construido supera las brechas identificadas.  
* **Innovación Lograda frente al Estado del Arte:** Justificación técnica de los diferenciadores implementados en la versión final.

## **Sección 2: Arquitectura de Software Móvil e Implementación Técnica**

* **Diagrama de Arquitectura End-to-End:** Topología completa de la solución (Cliente Móvil en React Native / Expo, gestión de estado global con Redux Toolkit o Context, consumo de APIs/Backend, persistencia en base de datos como Supabase/SQLite y servicios externos).  
* **Decisiones Arquitectónicas y Estructura de Componentes:** Organización modular del proyecto, flujo de navegación (Expo Router / React Navigation), manejo de estado asíncrono, almacenamiento seguro de sesión y optimización de rendimiento en listas y vistas complejas.  
* **Modelo de Datos y Contratos de Servicio:** Esquema relacional o documental utilizado y especificación de los flujos de datos principales.

## **Sección 3: Implementación y Auditoría de Accesibilidad Móvil (Consolidación Fase 2\)**

Evidencia técnica de cómo la propuesta de accesibilidad del Segundo Corte fue llevada a la práctica en el código de la aplicación:

* **Cumplimiento de Pautas de Accesibilidad Móvil (WCAG 2.1 / 2.2 Nivel AA):**  
  * **Semántica para Lectores de Pantalla (VoiceOver / TalkBack):** Uso riguroso de propiedades nativas (`accessible`, `accessibilityLabel`, `accessibilityHint`, `accessibilityRole`, `accessibilityState`) y agrupamiento correcto de contenedores táctiles para evitar focos fragmentados.  
  * **Diseño Visual, Contraste y Tipografía Adaptativa:** Relaciones de contraste verificadas (mínimo 4.5:1 en texto normal), manejo adecuado de `lineHeight` para evitar recorte de caracteres (*clipping*), soporte para escalado dinámico de fuentes y alternativas visuales que no dependan exclusivamente del color.  
  * **Ergonomía Táctil y Navegación:** Áreas mínimas de toque (*hit targets* ≥ 44x44 pt / 48x48 dp), uso de `hitSlop` donde corresponda, orden lógico de foco y retroalimentación háptica/auditiva/visual clara ante errores o estados de carga.  
* **Matriz Trazable (Propuesta Corte 2 vs. Implementación Final):** Tabla comparativa que liste cada mejora de accesibilidad prometida en el segundo corte, el componente/archivo exacto donde se implementó y la prueba de validación realizada.

## **Sección 4: Pruebas Funcionales, Rendimiento y Validación de Usuario**

* **Casos de Prueba Ejecutados:** Evidencia de validación de los flujos principales del negocio (*happy paths* y manejo de errores de red o validación).  
* **Auditoría de Accesibilidad en Dispositivo:** Resultados de pruebas ejecutadas con lectores de pantalla o herramientas de inspección de accesibilidad.

## **Sección 5: Conclusiones, Limitaciones y Trabajo Futuro**

* **Lecciones Aprendidas y Alcance Logrado:** Balance técnico del proyecto, retos de ingeniería superados durante el semestre y hoja de ruta (*roadmap*) para futuras versiones.

# **3\. Requisitos de Funcionalidad y Repositorio de Código (30% de la Nota)**

* **Aplicación Móvil Funcional End-to-End:**  
  * Los flujos principales definidos en la visión del producto (Fase 1\) y las mejoras de accesibilidad (Fase 2\) deben operar en tiempo real sin datos estáticos simulados (*hardcoded mocks* injustificados) ni cierres inesperados (*crashes*).  
  * Fidelidad visual, fluidez en animaciones/navegación y aplicación real de los atributos de accesibilidad en las pantallas de la app.  
* **Calidad del Repositorio en Git (GitHub / GitLab):**  
  * Estructura de carpetas limpia, código tipado y modularizado, y cero credenciales o secretos expuestos en el historial.  
  * **Trazabilidad de Commits:** El historial de Git debe evidenciar participación continua y equitativa de todos los integrantes del equipo a lo largo del corte.  
  * **Archivo `README.md` Completo:** Instrucciones claras de instalación, variables de entorno requeridas, arquitectura del proyecto, guía de ejecución y resumen de las características de accesibilidad implementadas.

# **4\. Presentación Ejecutiva y Demostración en Vivo (10% de la Nota)**

Durante la sesión final, cada equipo contará con un bloque estricto de tiempo para realizar su presentación y demostración:

* **Pitch de Producto y Arquitectura:** Exposición ejecutiva del problema, la solución construida, la arquitectura móvil y los diferenciadores de accesibilidad implementados.  
* **Demo en Vivo sobre Dispositivo/Emulador:** Ejecución en directo de la aplicación mostrando tanto el flujo de negocio completo como las capacidades de accesibilidad en acción (navegación asistida, etiquetas semánticas, contraste/temas, áreas táctiles y respuesta de la interfaz).

# **5\. Defensa Técnica Individual: Preguntas por el Profesor (40% de la Nota)**

Inmediatamente después de finalizar la presentación, se llevará a cabo la **Defensa Técnica Oral**, diseñada para verificar la autoría individual y la comprensión profunda de la arquitectura y del código fuente.

## **5.1. Reglas de la Sesión de Preguntas**

* **Interrogatorio Aleatorio e Individual:** El profesor formulará preguntas técnicas directas a cada integrante del equipo sobre cualquier parte del proyecto: arquitectura de React Native, manejo de estado, consumo de APIs/base de datos, implementación técnica de accesibilidad (`accessibilityRole`, `accessibilityLabel`, manejo de foco, `lineHeight`, `Pressable`), o decisiones documentadas en las Fases 1, 2 y 3\.  
* **Carácter Personal e Intransferible:** Ningún miembro del equipo puede responder, interrumpir ni complementar la pregunta asignada a su compañero.  
* **Inspección de Código en Vivo:** El profesor podrá solicitar a cualquier estudiante abrir el repositorio en su editor, ubicar un archivo o componente específico, explicar línea por línea su funcionamiento o realizar un ajuste en vivo.

## **5.2. Escala de Evaluación Cuantitativa de las Preguntas (40%)**

| Nivel de Respuesta | Criterio de Calificación en la Defensa Oral | Impacto en el 40% |
| :---- | :---- | :---- |
| **No supo responder (0%)** | El estudiante desconoce la ubicación de los componentes en el repositorio, no sabe explicar cómo funciona el estado o la navegación, ignora cómo se implementaron las propiedades de accesibilidad o evidencia falta de participación en el desarrollo. | **0%** |
| **Respondió parcialmente (50%)** | El estudiante ubica los archivos y describe superficialmente qué hace la vista, pero falla al justificar decisiones técnicas, flujo de datos, ciclo de vida de hooks, manejo de asincronía o el funcionamiento real de las pautas de accesibilidad en el código. | **50%** |
| **Respondió perfecto (100%)** | El estudiante argumenta con total solvencia ingenieril las decisiones arquitectónicas, domina de principio a fin el código fuente (UI, lógica, datos y accesibilidad) y responde con precisión a las contrapreguntas del profesor. | **100%** |

# **6\. Rúbrica Oficial de Evaluación (Resumen de Ponderación)**

| Componente | Descripción | Peso |
| :---- | :---- | :---- |
| **1\. Documento Final (Fase 3\)** | Documento estructurado que consolida la visión y estado del arte (Fase 1), la arquitectura final implementada y la trazabilidad completa de la propuesta de accesibilidad (Fase 2\) con diagramas, tablas y referencias en formato IEEE/APA. | **20%** |
| **2\. Funcionalidad y Repositorio** | Aplicación móvil 100% funcional de extremo a extremo, implementación real de la propuesta de accesibilidad en la UI, código limpio, `README.md` reproducible e historial de commits equitativo en Git. | **30%** |
| **3\. Presentación** | Claridad, estructura del pitch, calidad visual del material de apoyo, manejo del tiempo y demostración fluida en vivo de la app y sus funciones de accesibilidad. | **10%** |
| **4\. Preguntas por el Profesor** | Defensa técnica individual y aleatoria posterior a la presentación sobre el código fuente, la arquitectura móvil y la implementación técnica de accesibilidad. | **40%** |
| **TOTAL** | **Calificación Definitiva de la Entrega Final** | **100%** |

# **7\. Formato de Entrega y Reglas de Envío (Submission Rules)**

* **Formato del Documento:** Archivo PDF (o Markdown estructurado con diagramas renderizados) ubicado en la raíz del repositorio Git del equipo (`/docs` o raíz) y cargado en la plataforma del curso.  
* **Extensión Sugerida:** 5 a 8 páginas (excluyendo portada y referencias bibliográficas en formato IEEE o APA).  
* **Regla Estricta de Puntualidad:** **Si la entrega del equipo se registra un minuto o más después de la fecha y hora estipuladas, la entrega no será aceptada.**

