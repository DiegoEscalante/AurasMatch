# Spec 08 — Extras de Baja Prioridad (Comentarios y Barra Asistida de Comandos de Voz)

## 1. Objetivo de la Pieza de Lego (Prioridad Baja / Cierre de Promesas Fase 2)
Implementar de forma compacta los dos puntos de `2ndPhaseProposal.pdf` clasificados por el usuario en baja prioridad, únicamente después de que las Fases 01 a 07 estén 100% operativas.

## 2. Alcance Compacto
1. **Sección de Comentarios en el Detalle del Look (`2ndPhaseProposal.pdf` Sección V.D.2):**
   - Usa la columna `looks.comments` (`jsonb DEFAULT '[]'`) agregada en la Fase 03 (sin crear tablas nuevas).
   - Muestra los comentarios existentes con etiquetas semánticas para VoiceOver/TalkBack y un campo sin límite de tiempo para agregar un comentario nuevo.
2. **Comandos de Voz / Barra de Acciones Asistidas (`2ndPhaseProposal.pdf` Sección V.A.3):**
   - Además de que todos los botones de la app llevan desde la Fase 02 a 07 las etiquetas `accessibilityLabel` exactas para el control por voz nativo de iOS/Android (*"Publicar"*, *"Siguiente publicación"*, *"Dar me gusta"*, *"Desplazar hacia abajo"*), añade un control opcional activable desde el desplegable de Accesibilidad para ejecutar estas acciones con un toque o comando rápido durante la demostración en vivo.

