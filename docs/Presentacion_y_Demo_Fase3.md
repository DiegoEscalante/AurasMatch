# AurasMatch — Entregable de Presentación Ejecutiva y Demostración en Vivo (Fase 3)

**Correspondencia en Rúbrica (`Course Project Phase 3`):**  
* **Sección 4 — Presentación Ejecutiva y Demostración en Vivo:** 10 % de la nota final.  
* **Sección 5 — Defensa Técnica Individual:** 40 % de la nota final.  

**Metadatos de Exposición:**
* **Integrantes:** Kenny Kaven Fang Cen · Diego Eduardo Escalante García
* **Duración total asignada:** `[inserte aqui tiempo total asignado por el profesor en minutos]`
* **Enlace a diapositivas (Canva / Google Slides / PDF):** `[inserte aqui enlace público o ruta de la presentación]`
* **Video de respaldo de la demo (plan B si falla la red del aula):** `[inserte aqui enlace a grabación MP4 o YouTube no listado]`

---

## I. Estructura Recomendada de Diapositivas (Pitch de Producto y Arquitectura)

| Diapositiva | Título Sugerido | Contenido Clave Basado en Fases 1, 2 y 3 | Expositor Sugerido |
| :--- | :--- | :--- | :--- |
| **1. Portada** | *AurasMatch: Descubrimiento Estético Real + Accesibilidad Universal* | Nombre, eslogan oficial, autores, Universidad de La Sabana y asignatura. | `[inserte aqui nombre]` |
| **2. Problema y Mercado** | *El problema del "AI Slop" y la brecha digital-física* | Inviabilidad de replicar IA [8], 71 % rechazo a anuncios intrusivos [3], Beauty Tech USD \$172.9B al 2030 (17.9 % CAGR) [1], 54 % sentimiento negativo ante *AI slop* y -14 % intención de compra [4]. | `[inserte aqui nombre]` |
| **3. Solución y Competencia** | *AurasMatch vs. SkinSort, Dupe AI, Temptalia y Pinterest* | Tres pilares: Feed 100 % humano (`< 0.50`), 5 subculturas (*Jirai Kei, Clean Girl, Goth, E-Girl, Y2K*) y mapeo facial a **3,085 SKUs** en Supabase. | `[inserte aqui nombre]` |
| **4. Arquitectura End-to-End** | *Expo / React Native 0.88 + Cloud Run + Supabase + R2* | Flujo JSON Base64 (`POST /analyze-look`), Context API + Headless Hooks, Event Bus (`applyLookMutationToRow`), RLS + RPCs atómicas y compactación DRY (`AccessibleModal`, `LookMiniCard`). | `[inserte aqui nombre]` |
| **5. Motor CV y Anti-IA** | *MediaPipe 468 Landmarks, CIELAB $\Delta E$ y Filtro de 3 Etapas* | Exclusión poligonal (dientes/esclerótica), `Jev` paralelo (`asyncio.gather`), C2PA/EXIF + FFT/microtextura + `vision_ai_score`, regla estricta `< 0.50` y apelación humana. | `[inserte aqui nombre]` |
| **6. Accesibilidad Corte 2 → 3** | *16 Promesas WCAG 2.1/2.2 AA & AAA en Producción* | Guardas `Platform.OS === 'web'` anti-`RCTView`, contraste hasta 21:1, dislexia + 200 % (1 columna desde 150 %), botones 48 dp, *Step-Zoom*, Levenshtein, *Alt-Text* TTS y *AssistiveVoiceBar*. | `[inserte aqui nombre]` |
| **7. Demo en Vivo** | *Recorrido End-to-End en Dispositivo Real* | Salto inmediato a teléfono físico / emulador siguiendo el guion de la Sección II. | Ambos |

---

## II. Guion Cronometrado de Demostración en Vivo (Sobre Dispositivo / Emulador)

### Preparación Previa (Antes de Pasar al Frente)
* **Backend Cloud Run:** verificar respuesta `200 OK` en `GET /health` (`[inserte aqui URL pública de Cloud Run]`/health).
* **Cuenta y fotos listas en el teléfono:** tener a mano:
  1. Una **selfie real con maquillaje** en galería (sin filtros pesados) para demostrar aprobación humana (`ai_confidence_score < 0.50`) y publicación exitosa al Feed.
  2. Una **imagen sintética generada por IA** (p. ej. Midjourney/Flux con rostro) para demostrar detección y bloqueo hacia el Feed (`ai_confidence_score >= 0.50`) + flujo de apelación en Perfil.
  3. Credenciales de prueba listas (`[inserte aqui usuario de prueba o uso del botón de acceso rápido de prueba si aplica]`).

### Paso 1 — Feed Comunitario, *Gradual Engagement* y Filtro Tolerante a Errores
1. Abrir **Feed (`index.tsx`)** sin iniciar sesión: explicar que no se bloquea la exploración pública.
2. Escribir con error ortográfico en el buscador: **`"jiray"`** o **`"gotico"`** → mostrar chips predictivos generados con **distancia de Levenshtein** (`fuzzy-search.ts`).
3. Abrir el panel **Filtro Triple (`triple-filter-dropdown.tsx`)**: combinar *Subcultura* + *Zona facial* + *Familia de color CIELAB* y limpiar filtros.
4. Tocar **Me gusta** o **Guardar** estando sin sesión → mostrar apertura del modal unificado **`ContextualAuthModal`** (sin pérdida de contexto) y autenticar.

### Paso 2 — Detalle estilo Pinterest y Popups Accesibles (`look/[id].tsx`)
1. Entrar a un look del Feed → mostrar barra fija de 3 pestañas basada en `<Slot />`.
2. Probar **`StepZoomImage`** usando los botones discretos `+ Zoom` y `↺` (alternativa motora al gesto *pinch*, WCAG 2.5.1).
3. Tocar **Audio (`🔊`)** → escuchar lectura TTS en español con nombres descriptivos de color CIELAB (`color-names.ts`), y mostrar la insignia transparente de las 3 etapas Anti-IA.
4. Tocar un producto recomendado → abrir **`ProductDetailModal`** (implementado sobre **`AccessibleModal`**), mostrando color detectado vs. tono oficial del SKU, coordenadas $L^*a^*b^*$ y porcentaje $\Delta E$.
5. Abrir comentarios plegables (`AccessibleCollapsible`), intentar enviar comentario vacío para evidenciar **`VisualAlertBanner`** (borde visual + vibración háptica + anuncio accesible) y luego enviar un comentario válido.

### Paso 3 — Subida, Análisis IA Real en Cloud Run y Regla Anti-IA `< 0.50` (`upload.tsx`)
1. Abrir pestaña **Subir** y tocar el banner **`ActionBannerButton`** (*Guía de Iluminación y Extracción*) → abrir `LightingGuideModal` sin errores nativos `RCTView`.
2. Seleccionar la **foto generada por IA** → presionar **Analizar con IA**:
   * Señalar el bloqueo temporal de navegación (`AnalysisLockContext` + botón atrás bloqueado durante inferencia).
   * Mostrar que si `ai_confidence_score >= 0.50`, la app bloquea la publicación hacia el Feed público (`isLookHumanApproved = false`) y permite solicitar **Apelación humana** (`appeal_status = 'pending'`).
3. Seleccionar ahora la **selfie real de maquillaje** → presionar **Analizar con IA**:
   * Mostrar detección de subcultura (`Jev`), colores CIELAB por zona (`MediaPipe`), sugerencia automática de ***Alt-Text* en español**, editar manualmente el texto y publicar en Supabase (`POST /analyze-look` en Base64 JSON → R2 → PostgreSQL).
   * *(Plan B si falla Wi-Fi del aula: activar botón **Simulación Asistida** demostrando continuidad operativa con catálogo espejo `REAL_SUPABASE_MIRROR_PRODUCTS`).*

### Paso 4 — Accesibilidad Universal en Vivo (`profile.tsx` + `AccessibilityModal`)
1. Ir a **Usuario (`profile.tsx`)** → mostrar colecciones propias (*Publicaciones, Likes, Guardados*) renderizadas con **`LookMiniCard`**.
2. Abrir **Opciones de Accesibilidad** (`ActionBannerButton`):
   * Activar **Alto Contraste AAA (21:1)** y fuente **Dislexia**.
   * Subir **Tamaño de texto al 200 %** y volver brevemente al Feed para evidenciar la conmutación automática a **1 columna** sin recorte de texto (*clipping*).
   * Activar **Barra Asistida de Voz (`AssistiveVoiceBar`)** y tocar `"Escuchar Pantalla"` para demostrar paridad de comandos por voz (WCAG 2.5.3).
   * Activar **TalkBack / VoiceOver** (si el docente lo solicita en vivo) y recorrer `LookCard` verificando foco agrupado y acciones nativas.

---

## III. Mapa Rápido para la Defensa Técnica Individual (40 % de la Nota)

Si el profesor solicita ubicar código línea por línea en el editor, usar esta guía directa:

* **Context API vs. Redux y Providers globales:** [`frontend/src/app/_layout.tsx`](../frontend/src/app/_layout.tsx) y [`frontend/src/contexts/`](../frontend/src/contexts/accessibility-context.tsx).
* **Navegación `<Slot />` y bloqueo Android `BackHandler`:** [`frontend/src/components/app-tabs.tsx`](../frontend/src/components/app-tabs.tsx) y [`frontend/src/contexts/analysis-lock-context.tsx`](../frontend/src/contexts/analysis-lock-context.tsx).
* **Compactación DRY:**
  * Modales compartidos: [`frontend/src/components/ui/accessible-modal.tsx`](../frontend/src/components/ui/accessible-modal.tsx) y [`frontend/src/components/auth/contextual-auth-prompt.tsx`](../frontend/src/components/auth/contextual-auth-prompt.tsx).
  * Acciones Like/Save compartidas: [`frontend/src/hooks/look-action-helpers.ts`](../frontend/src/hooks/look-action-helpers.ts) + `applyLookMutationToRow` en [`frontend/src/services/supabase.ts`](../frontend/src/services/supabase.ts).
  * Banner y Mini-Card compartidos: [`frontend/src/components/ui/action-banner-button.tsx`](../frontend/src/components/ui/action-banner-button.tsx) y [`frontend/src/components/look/look-mini-card.tsx`](../frontend/src/components/look/look-mini-card.tsx).
  * Diccionarios centralizados y regla Anti-IA `< 0.50`: [`frontend/src/types/database.ts`](../frontend/src/types/database.ts).
* **Guardas Web ARIA vs. roles nativos (`RCTView`):** [`frontend/src/components/ui/accessible-modal.tsx`](../frontend/src/components/ui/accessible-modal.tsx) y [`frontend/src/components/ui/visual-alert-banner.tsx`](../frontend/src/components/ui/visual-alert-banner.tsx).
* **RLS, Trigger protector y RPCs `SECURITY DEFINER`:** [`docs/supabase-rls-and-rpcs.sql`](supabase-rls-and-rpcs.sql).
* **Pipeline Backend FastAPI / MediaPipe / CIELAB / Anti-IA:** [`backend/app/main.py`](../backend/app/main.py), [`backend/app/cv/mediapipe_cv.py`](../backend/app/cv/mediapipe_cv.py), [`backend/app/cv/color_math.py`](../backend/app/cv/color_math.py), [`backend/app/cv/anti_ai.py`](../backend/app/cv/anti_ai.py) y [`backend/app/cv/vision_api.py`](../backend/app/cv/vision_api.py).
