# Seguridad (Config central)

Este documento resume el hardening aplicado para configuracion y autenticacion multi-tenant.

## Cobertura

- RBAC consistente en `/admin/configuracion/**`.
- Politicas de seguridad por tenant.
- Auditoria de cambios y eventos de login.
- Headers/cookies de seguridad.
- Rate limiting en endpoints sensibles.

## RBAC de configuracion

Capacidades en `lib/config-central/rbac.ts`:

- `CONFIG_THEME_READ|WRITE`
- `CONFIG_NAVIGATION_READ|WRITE`
- `CONFIG_SAT_READ|WRITE`
- `CONFIG_BILLING_READ|WRITE`
- `CONFIG_SERVICES_READ|WRITE`
- `CONFIG_SECURITY_READ|WRITE`
- `CONFIG_AUDIT_READ`

Reglas:

- `ADMIN` y `OWNER` tienen acceso total de configuracion.
- Roles no privilegiados requieren permisos explicitos.
- Para patentes, ademas de capability, solo `owner/admin` pueden mutar.

## Politica de seguridad por tenant

Modelo:

- `TenantSecurityPolicy`

API:

- `GET|PUT /api/admin/config/security/policy`

Campos relevantes:

- `sessionTimeoutMinutes`
- `enforce2FA` (flag de enforcement)
- `passwordMinLength`
- `passwordRequireUppercase|Lowercase|Number|Symbol`
- `ipAllowlist`
- `allowRememberMe`
- `maxLoginAttempts`
- `lockoutMinutes`

## Login hardening

Ruta:

- `POST /api/login`

Controles activos:

- Rate limit por IP/path.
- Validacion de IP allowlist por tenant.
- Lockout por ventana de intentos fallidos (`AuditLog`).
- Bloqueo temporal con `423` al exceder intentos.
- Respeta `allowRememberMe` y timeout de sesion por tenant.
- Auditoria de `LOGIN_SUCCESS`, `LOGIN_FAILED`, bloqueos por IP/lockout.

Cookies:

- `httpOnly: true`
- `sameSite: strict`
- `secure` en produccion
- Sesion no persistente cuando `rememberMe` no aplica.

## Auditoria

Modelo:

- `AuditLog`

Campos usados:

- `tenantId`
- `actorUserId`
- `action`
- `entityType`, `entityId`
- `before`, `after`, `metadata`
- `ip`, `userAgent`
- `createdAt`

Vista/API:

- `GET /api/admin/config/security/audit`
- UI: `components/configuracion/SecurityPolicyPanel.tsx` (filtros por accion/actor/fecha)

Eventos auditados en este scope:

- Tema
- Navegacion
- Patentes
- Facturacion por patente (series/preferencias)
- Processing-service
- Politica de seguridad
- Login success/fail/lockouts

## Headers y policies de app

Aplicados en `proxy.ts`:

- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
- `Strict-Transport-Security` (solo prod)

Notas CSP:

- En desarrollo se permite `unsafe-eval` para compatibilidad.
- En produccion se elimina `unsafe-eval`.

## Rate limiting

Helper:

- `src/lib/api/rateLimit.ts`

Aplicado en:

- `/api/login`
- `/api/admin/config/theme` (PUT)
- `/api/admin/config/navigation` (PUT)
- `/api/admin/config/security/policy` (PUT)
- `/api/admin/config/security/audit` (GET)
- `/api/admin/config/services/processing` (PUT)
- `/api/admin/config/services/processing/health` (POST)
- `/api/admin/config/legal-entities` (POST)
- `/api/admin/config/legal-entities/[id]` (PUT/PATCH/DELETE)
- `/api/admin/config/billing/preference` (PUT)
- `/api/admin/config/billing/series` (POST)
- `/api/admin/config/billing/series/[id]` (PUT/PATCH/DELETE)

## Operacion y despliegue

Antes de promover:

1. Ejecutar migraciones nuevas.
2. Confirmar que `TenantSecurityPolicy` y `AuditLog.createdAt` existen.
3. Validar login con:
   - IP permitida/no permitida.
   - lockout por intentos.
   - remember-me permitido/no permitido por tenant.
4. Verificar cabeceras de seguridad en respuestas de `/admin/*` y `/api/*`.
