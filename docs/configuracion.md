# Configuracion central (Admin)

Este documento describe la recuperacion/implementacion de configuracion en `AppStar` para `/admin/configuracion/**`.

## Objetivo

Se centralizo configuracion por tenant para:

- Tema global y branding.
- Politica de navegacion (sidebar).
- Patentes (LegalEntity) multi-tenant.
- Facturacion por patente (series/correlativos).
- Servicios externos (processing-service).
- Seguridad (policy + auditoria).

## Navegacion UI

Rutas nuevas:

- `/admin/configuracion/tema`
- `/admin/configuracion/navegacion`
- `/admin/configuracion/patentes`
- `/admin/configuracion/facturacion`
- `/admin/configuracion/servicios`
- `/admin/configuracion/seguridad`

Componente comun de secciones:

- `components/configuracion/ConfigSectionNav.tsx`

## Tema global

Pantalla:

- `components/configuracion/CentralThemeBrandingPanel.tsx`

API:

- `GET|PUT /api/admin/config/theme`

Modelo tenant:

- `TenantThemePreference`

Tokens por defecto StarMedical:

- Primary: `#4aa59c`
- Accent/Secondary: `#4aadf5`
- Structure/Corporate: `#2e75ba`
- Background: `#f8fafc`
- Surface: `#ffffff`

Puntos importantes:

- Tokens via CSS variables (`app/globals.css`) + mapping en Tailwind (`tailwind.config.ts`).
- Preview en vivo.
- Validacion HEX estricta y warning de contraste recomendado.
- Boton "Restaurar a StarMedical".
- Persistencia de densidad por usuario (`localStorage`) y default por tenant (`TenantThemePreference.densityDefault`).

## Layout ERP unificado y sidebar colapsable

Shell unico:

- `app/admin/layout.tsx`
- `components/layout/AdminShellServer.tsx`
- `components/layout/AdminShellClient.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/Header.tsx`

Persistencia:

- Sidebar: `localStorage` key `star-erp-sidebar-collapsed`.
- Densidad: `localStorage` key `star-erp-density-mode`.

Politica tenant (navegacion):

- `TenantNavigationPolicy` (`defaultSidebarCollapsed`, `forceSidebarCollapsed`, `moduleOrderingEnabled`, `moduleOrder`).
- API: `GET|PUT /api/admin/config/navigation`.
- UI: `components/configuracion/NavigationPolicyPanel.tsx`.

## Patentes (LegalEntity) multi-tenant

API:

- `GET|POST /api/admin/config/legal-entities`
- `PUT|PATCH|DELETE /api/admin/config/legal-entities/[id]`

UI:

- `components/configuracion/LegalEntitiesPanel.tsx`

Reglas:

- Scope estricto por `tenantId`.
- NIT validado por regex basica (`NIT_BASIC_REGEX`).
- Unicidad por tenant para razon social y NIT (validacion servidor).
- Solo `owner/admin` pueden mutar patentes.

## Facturacion por patente

Modelos:

- `TenantBillingPreference`
- `BillingSeries`
- `Invoice`

API:

- `GET|PUT /api/admin/config/billing/preference`
- `GET|POST /api/admin/config/billing/series`
- `PUT|PATCH|DELETE /api/admin/config/billing/series/[id]`

UI:

- `components/configuracion/BillingByLegalEntityPanel.tsx`

Reglas:

- Serie activa por patente/sucursal.
- Maximo una serie default activa por patente.
- Validacion de duplicados (nombre/prefijo) en servidor.
- Correlativo reservado en servidor (`allocateBillingSeriesCorrelativo`).

Flujo de emision:

- `POST /api/facturacion/expedientes/[id]/quick-action` (`EMITIR_DOC`).
- Si hay mas de una patente activa, requiere seleccion de patente.
- Serie obligatoria y validada contra tenant/patente.

## Servicios externos (processing-service)

Modelo:

- `ProcessingServiceConfig`

API:

- `GET|PUT /api/admin/config/services/processing`
- `POST /api/admin/config/services/processing/health`

UI:

- `components/configuracion/ServicesProcessingPanel.tsx`

Seguridad:

- Ref de secretos (`tokenRef`, `hmacSecretRef`) no se exponen en claro en UI.
- Respuesta API retorna refs enmascaradas.
- Cliente interno con timeout, retries, correlationId y soporte token/HMAC:
  - `lib/processing-service/client.ts`

## Multi-tenant y scoping

En este paquete de recuperacion:

- Endpoints de configuracion filtran por `tenantId`.
- Backfill en migracion para tablas core de configuracion historicas sin tenant.
- Prueba de no data leak:
  - `tests/config-api.tenant-scope.test.ts`

## Migracion aplicada

Carpeta:

- `prisma/migrations/20260630130000_config_security_recovery/`

Incluye:

- Backfill `tenantId` en tablas legacy de configuracion.
- Tablas nuevas de configuracion central y facturacion por patente.
- Hardening de `AuditLog` (`createdAt`, `tenantId`, `ip`, `userAgent`).

Pendiente operativo:

- Ejecutar `npm run db:migrate:deploy` en entorno objetivo para activar tablas/columnas nuevas.

## Pruebas relacionadas

- Tema/utilidades: `tests/theme.utils.test.ts`
- Policy seguridad: `tests/security.policy.test.ts`
- Reglas series: `tests/billing.series-validation.test.ts`
- Scope tenant en APIs: `tests/config-api.tenant-scope.test.ts`
- Persistencia UI (sidebar/densidad): `tests/ui.persistence.test.ts`
- Emision obliga patente si hay >1: `tests/facturacion.require-legal-entity.test.ts`
