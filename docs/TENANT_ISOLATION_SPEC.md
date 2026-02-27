# TENANT Isolation Spec (Clientes + Recepción)

## Objetivo
Garantizar aislamiento SaaS estricto en StarMedical ERP para módulos `Clientes` y `Recepción`:
- Cero lectura/escritura cross-tenant.
- Cero confianza en `tenantId`/`branchId` enviados por frontend.
- Enforce server-side consistente en Listado, Detalle, Búsqueda, Export, Reportes, Check-in y Docs.

## Regla de oro (formal)
1. `tenantId` siempre se deriva de sesión (`tenantIdFromUser(user)`).
2. `tenantId` recibido por query/body se ignora explícitamente.
3. Toda query crítica Prisma usa scope de tenant en `where`.
4. Acceso por ID externo (URL/params) fuera de tenant responde `404` (no `403`) para evitar enumeración.
5. Multi-sucursal se aplica dentro del tenant por `allowedBranchIds`/`activeBranchId` server-side.
6. Intentos bloqueados se registran como evento `TENANT_ISOLATION_BLOCKED` (sin PII sensible).

## Superficies de enforcement
- Server Actions:
  - `app/admin/reception/actions.ts`
- Route Handlers:
  - `app/api/reception/service-requests/route.ts`
  - `app/api/reception/service-requests/[id]/route.ts`
  - `app/api/admin/companies/route.ts`
  - `app/api/admin/companies/[id]/route.ts`
  - `app/api/admin/clientes/diagnostics/export/route.ts`
  - `app/api/admin/clientes/diagnostics/resolve/route.ts`
  - `app/api/admin/clientes/import/csv/route.ts`
- Pages (detail/list/search/report):
  - `app/admin/clientes/[id]/page.tsx`
  - `app/admin/clientes/lista/page.tsx`
  - `app/admin/clientes/buscar/page.tsx`
  - `app/admin/reception/visit/[visitId]/page.tsx`
- Services/Repos:
  - `lib/security/tenantContext.server.ts`
  - `lib/companies/repositories/company.repo.ts`
  - `lib/clients/commercialList.service.ts`

## Fuente única de contexto
`lib/security/tenantContext.server.ts` centraliza:
- `resolveTenantContextForUser(...)`
- `requireTenantContextFromRequest(...)`
- `requireTenantContextFromCookies(...)`
- `assertBranchAccess(...)`
- `recordTenantIsolationBlocked(...)`

Contrato del contexto:
- `tenantId`
- `activeBranchId`
- `allowedBranchIds`
- `canAccessAllBranches`
- `permissions`

## Patrones permitidos y prohibidos

### Prohibido
- `findUnique({ where: { id } })` para recursos tenant-scoped accesibles por URL.
- Aceptar `tenantId`/`branchId` desde query/body como fuente de verdad.
- Export/report sin `tenantId` server-side.

### Permitido
- `findFirst({ where: { id, tenantId } })`.
- Scope por relación (`visit.patient.tenantId`) cuando el modelo no tiene `tenantId` directo.
- Scope por `branch/site` permitido por `allowedBranchIds` dentro del tenant.

## Ejemplos

### Correcto (tenant from session)
```ts
const tenantId = tenantIdFromUser(auth.user);
const row = await prisma.company.findFirst({ where: { id, tenantId } });
```

### Correcto (modelo sin tenantId directo)
```ts
const row = await prisma.serviceRequest.findFirst({
  where: { id, visit: { patient: { tenantId: context.tenantId } } }
});
```

### Correcto (detalle cross-tenant)
```ts
if (!client) return notFound();
```

## Observabilidad
Al bloquear acceso cross-tenant:
- `eventType`: `TENANT_ISOLATION_BLOCKED`
- `severity`: `WARN`
- `metaJson`: `{ route, resourceType, resourceId, reason, actorUserId }`
- Sin exponer datos clínicos/documentales.

## Gates de calidad obligatorios
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm check:tenant:isolation`
