# Tenant Isolation Runbook (Clientes + Recepción)

## Objetivo
Validar y operar aislamiento multi-tenant/multi-sucursal sin fugas.

## Comandos de validación rápida
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:tenant:isolation
```

## Validación manual mínima (5 pasos)
1. Iniciar sesión con usuario de `tenant A` y abrir `/admin/clientes/lista`.
2. Buscar por correlativo/NIT de clientes de `tenant A` y verificar resultados correctos.
3. Forzar URL de detalle con un `id` perteneciente a `tenant B` (`/admin/clientes/[id]`) y validar `404`.
4. Ejecutar export CSV/reportes desde tenant A y confirmar que no aparecen registros de tenant B.
5. En Recepción (`/admin/reception`), intentar operar con `siteId` fuera de `allowedBranchIds`; validar bloqueo.

## Validación API dirigida
- `GET /api/admin/companies?tenantId=<otro>`: debe ignorar query y usar tenant de sesión.
- `GET /api/admin/companies/[id]?tenantId=<otro>`: debe filtrar por tenant de sesión.
- `GET /api/admin/clientes/diagnostics/export?...&tenantId=<otro>`: debe exportar solo tenant de sesión.
- `POST /api/admin/clientes/diagnostics/resolve` con `tenantId` en body: debe ignorarlo.
- `GET/POST /api/reception/service-requests`: debe exigir tenant + branch scope.

## Señales de observabilidad
Buscar eventos `TENANT_ISOLATION_BLOCKED` en `SystemEventLog`:
- `domain=security`
- `severity=WARN`
- `metaJson.route/resourceType/reason`

## Respuesta a incidente
1. Confirmar endpoint y actor involucrado.
2. Revisar query efectiva y verificar ausencia/presencia de `tenantId` server-side.
3. Revisar `allowedBranchIds` del actor y branch solicitada.
4. Aplicar fix en helper común (`tenantContext.server.ts`) o capa de acceso afectada.
5. Agregar/actualizar test de regresión antes de merge.

## Patrones de remediación
- Cambiar `findUnique({ id })` por `findFirst({ id, tenantId })` o scope relacional equivalente.
- Eliminar `tenantId`/`branchId` del contrato de frontend cuando aplique.
- Reusar `requireTenantContextFromRequest` y `assertBranchAccess`.
