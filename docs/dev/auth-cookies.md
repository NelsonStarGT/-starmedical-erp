# Auth Cookies (Dev)

## Objetivo
Evitar `401 No autenticado` por desalineación de host/cookies durante desarrollo local.

## Configuración actual (ERP)
- Cookie de sesión: `star-erp-session`
- Fuente de sesión en API admin: `getSessionUserFromCookies(...)` / `requireAuthenticatedUser(...)`
- En `development`:
  - `secure=false` (compatible con `http://localhost`)
  - `httpOnly=true`
  - `sameSite=strict`

## Regla operativa clave
Usa **el mismo host** para login y navegación del ERP.

Ejemplo correcto:
- Login en `http://localhost:3000/login`
- Navegación en `http://localhost:3000/admin/...`

Ejemplo problemático:
- Login en `http://localhost:3000/login`
- Navegación en `http://127.0.0.1:3000/admin/...`

En ese caso, el navegador no comparte la cookie entre hosts y las rutas API devuelven `401`.

## Checklist rápido cuando veas 401 en Configuración
1. Verifica URL actual del navegador (`localhost` vs `127.0.0.1`).
2. Cierra sesión y vuelve a iniciar en el host correcto.
3. Revisa `Application > Cookies` y confirma `star-erp-session`.
4. Reintenta `/api/me`:
   - `200` con sesión válida
   - `401` si no hay cookie/sesión.
