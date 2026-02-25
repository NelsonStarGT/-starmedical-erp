# Seguridad de Configuración Central

## RBAC obligatorio

Todos los endpoints de `/api/admin/config/**` usan sesión válida + capacidad RBAC de Configuración Central.

Base:

- `lib/config-central/rbac.ts`
- `requireConfigCentralCapability(req, capability)`

Capacidades clave:

- `CONFIG_BRANCH_*`
- `CONFIG_SAT_*`
- `CONFIG_THEME_*`
- `CONFIG_NAVIGATION_*`
- `CONFIG_BILLING_*`
- `CONFIG_SERVICES_*`
- `CONFIG_SECURITY_*`
- `CONFIG_AUDIT_READ`

## Auditoría de mutaciones

Se registra auditoría en cambios críticos:

- Sucursales / horarios / SAT
- Tema
- Navegación
- Patentes
- Facturación por patente
- Processing-service
- Seguridad
- Correo SMTP y test

Modelo: `AuditLog` con `tenantId`, `actorUserId`, `action`, `entityType`, `entityId`, `before`, `after`, `ip`, `userAgent`, `createdAt`.

## Secretos y exposición en UI

No se exponen secretos en texto plano:

- `processing-service`: se maneja por `tokenRef` / `hmacSecretRef` enmascarados.
- SMTP: password solo para rotación; nunca se devuelve en claro.

## Headers y políticas de app

Middleware/proxy aplica:

- CSP
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- `Strict-Transport-Security` en producción

Archivo: `proxy.ts`.

## Rate limiting

Endpoints sensibles de configuración aplican `enforceRateLimit` con respuesta `429` (`code: RATE_LIMIT`).
