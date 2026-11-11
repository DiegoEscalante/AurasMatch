# Spec 03 — Base de Datos (Forma 2), Cliente Supabase/R2 y Autenticación

## 1. Objetivo de la Pieza de Lego
Conectar la aplicación móvil con Supabase (`profiles`, `looks`, `products`, `saved_looks`) y con el bucket de imágenes en Cloudflare R2 (`auras-match`), sin crear tablas nuevas y sin romper el backend en Google Cloud Run.

## 2. Ajuste Aditivo en Supabase (Forma 2 — CERO Tablas Nuevas)
Se mantienen únicamente las 4 tablas actuales (`profiles`, `looks`, `products`, `saved_looks`) y se agregan columnas con valor por defecto (`DEFAULT`) a `public.looks`:
```sql
ALTER TABLE public.looks
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS liked_by uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS appeal_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]';
```
- **Compatibilidad total con el Backend:** Como todas las columnas nuevas tienen `DEFAULT`, el `INSERT` actual de FastAPI en Cloud Run sigue funcionando sin modificaciones.

## 3. Resolución de Imágenes (Cloudflare R2 y Catálogo de Productos)
- **Imágenes de Looks (`looks.image_path`):** La base de datos guarda la referencia relativa en el bucket R2 (ej. `"user_looks/uuid.jpg"` o `"scraped_looks/uuid.jpg"`). El helper `resolveLookImageUrl(imagePath)` construye la URL completa usando `EXPO_PUBLIC_R2_PUBLIC_URL`.
- **Imágenes de Cosméticos (`products.image_url`):** El helper `resolveProductImageUrl(url)` normaliza las URLs de Makeup API que inician con `"//s3.amazonaws.com/..."` anteponiendo `"https:"` para que carguen correctamente en React Native (`expo-image`).

## 4. Autenticación sin Expiración Abrupta (`AuthContext` + `useAuth`)
- Configuración de `@supabase/supabase-js` con almacenamiento persistente seguro, `autoRefreshToken: true` y `persistSession: true` (cumpliendo la promesa de **Cancelación de temporizadores / sesiones sin expiración abrupta** de `2ndPhaseProposal.pdf`).
- Al iniciar sesión o registrarse:
  1. Verifica que exista la fila del usuario en `public.profiles(id, username, accessibility_prefs)` y la crea automáticamente si no existe (evitando errores de llave foránea `looks.user_id`).
  2. Sincroniza `profiles.accessibility_prefs` con el `AccessibilityContext` de la Fase 01.
- Pantallas compactas de **Login** y **Registro** con validación accesible de errores.

