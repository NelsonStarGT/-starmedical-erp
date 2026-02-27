# Work Report: Tenant Isolation (Clientes + Recepción)

Fecha: 2026-02-27

## Resumen ejecutivo
Se completó enforcement de aislamiento multi-tenant y branch scope en superficies críticas de Clientes/Recepción. Se eliminó dependencia de `tenantId`/`branchId` desde frontend en endpoints objetivo y se agregó guardrail anti-regresión.

## PR plan (entrega recomendada)
### PR1 — Auditoría (docs)
- `docs/TENANT_ISOLATION_SPEC.md`
- `docs/TENANT_BRANCH_SCOPING_POLICY.md`
- `docs/TENANT_ISOLATION_AUDIT.md`

### PR2 — Tenant enforcement + tests core
- Helper central: `lib/security/tenantContext.server.ts`
- Hardening routes/actions/pages (clientes + recepción)
- Tests tenant scope en `companies`, `diagnostics`, `service-requests`

### PR3 — Branch scoping
- Aplicación de `allowedBranchIds`/`assertBranchAccess` en flujos de Recepción
- Ajustes de resolución de sucursal activa y selección permitida

### PR4 — Guardrail + runbook
- `scripts/check-tenant-scope.sh`
- `docs/TENANT_ISOLATION_RUNBOOK.md`
- script npm `check:tenant:isolation`

## Checklist por PR (resumen/archivos/QA/gates)
### PR1 (Auditoría)
- Resumen:
  - Definición formal de aislamiento tenant + política branch.
  - Inventario de queries críticas y clasificación SAFE/UNSAFE/MIXED.
- Archivos:
  - `docs/TENANT_ISOLATION_SPEC.md`
  - `docs/TENANT_BRANCH_SCOPING_POLICY.md`
  - `docs/TENANT_ISOLATION_AUDIT.md`
- QA manual (5 pasos):
  1. Revisar que todas las superficies críticas estén listadas en Spec.
  2. Validar que la política branch define LOCKED/SWITCH.
  3. Validar que cada hallazgo en auditoría incluye riesgo y recomendación.
  4. Confirmar criterio `404` para cross-tenant por ID.
  5. Confirmar política “no tenantId desde frontend” documentada.
- Gates:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

### PR2 (Tenant enforcement + tests core)
- Resumen:
  - Enforcement tenant server-side en routes/actions/pages/repos críticos.
  - Endpoints `companies`, `diagnostics`, `service-requests` blindados.
  - Tests core de no-override de tenant.
- Archivos:
  - `app/api/admin/companies/route.ts`
  - `app/api/admin/companies/[id]/route.ts`
  - `lib/companies/repositories/company.repo.ts`
  - `app/api/admin/clientes/diagnostics/export/route.ts`
  - `app/api/admin/clientes/diagnostics/resolve/route.ts`
  - `app/api/reception/service-requests/route.ts`
  - `app/api/reception/service-requests/[id]/route.ts`
  - `tests/clients.companies.routes.tenant-scope.test.ts`
  - `tests/clients.diagnostics.routes.test.ts`
  - `tests/reception.service-requests.tenant-scope.test.ts`
- QA manual (5 pasos):
  1. `GET /api/admin/companies?tenantId=otro` mantiene tenant de sesión.
  2. `GET /api/admin/companies/[id]?tenantId=otro` no fuga cross-tenant.
  3. Export diagnostics responde solo datos del tenant autenticado.
  4. Resolve diagnostics ignora `tenantId` enviado en body.
  5. `service-requests` por `visitId` aplica filtro `patient.tenantId`.
- Gates:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

### PR3 (Branch scoping)
- Resumen:
  - Enforce de sucursal permitida en recepción (tenant interno multi-branch).
  - Bloqueos explícitos de branch fuera de alcance.
- Archivos:
  - `lib/security/tenantContext.server.ts`
  - `app/admin/reception/actions.ts`
  - `app/admin/reception/visit/[visitId]/page.tsx`
  - `app/admin/reception/solicitudes-portal/page.tsx`
  - `lib/reception/active-branch.ts`
  - `lib/reception/branches.service.ts`
- QA manual (5 pasos):
  1. Usuario branch-lock sólo ve/opera su sucursal.
  2. Usuario con switch opera sucursales permitidas.
  3. `siteId` no permitido devuelve bloqueo.
  4. Detalle visita fuera de branch permitido responde `404`.
  5. Se genera evento `TENANT_ISOLATION_BLOCKED` cuando corresponde.
- Gates:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

### PR4 (Guardrail + runbook)
- Resumen:
  - Script anti-regresión de scope tenant/branch en superficies críticas.
  - Runbook operativo de validación y respuesta a incidentes.
- Archivos:
  - `scripts/check-tenant-scope.sh`
  - `package.json`
  - `docs/TENANT_ISOLATION_RUNBOOK.md`
  - `docs/WORK_REPORT_TENANT_ISOLATION.md`
- QA manual (5 pasos):
  1. Ejecutar `pnpm check:tenant:isolation`.
  2. Confirmar salida `OK`.
  3. Verificar allowlist documentada y mínima.
  4. Validar que script cubre superficies críticas objetivo.
  5. Revisar runbook para pasos de incidente.
- Gates:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

## Queries corregidas (representativas)
- `lib/companies/repositories/company.repo.ts:104`
  - `findUnique(id)` -> `findFirst({ id, tenantId })`
- `app/api/admin/companies/route.ts:17`
  - `tenantId` de query -> `tenantIdFromUser(auth.user)`
- `app/api/admin/companies/[id]/route.ts:25`
  - `tenantId` de query -> `tenantIdFromUser(auth.user)`
- `app/api/admin/clientes/diagnostics/export/route.ts:83`
  - export siempre tenant-scoped
- `app/api/admin/clientes/diagnostics/resolve/route.ts:53`
  - resolve siempre tenant-scoped
- `app/api/reception/service-requests/route.ts:46,122`
  - visit lookup por `patient.tenantId` + branch access
- `app/api/reception/service-requests/[id]/route.ts:22,66`
  - service request scope por `visit.patient.tenantId`
- `app/admin/clientes/[id]/page.tsx:322`
  - detalle por `id + tenantId`; cross-tenant => `notFound()`
- `app/admin/reception/visit/[visitId]/page.tsx:20`
  - visita por tenant + branch permitido

## Tests agregados/actualizados
- Nuevo: `tests/clients.companies.routes.tenant-scope.test.ts`
  - valida que `tenantId` inyectado por query se ignora.
- Nuevo: `tests/reception.service-requests.tenant-scope.test.ts`
  - valida tenant scope por `visit.patient.tenantId`.
  - valida bloqueo por branch fuera de alcance.
- Actualizado: `tests/clients.diagnostics.routes.test.ts`
  - valida tenant scope en export.
  - valida que `tenantId` en body/query no override sesión.

## Métricas
- Estado auditado final: `UNSAFE -> 0`
- Queries críticas auditadas: 18
- SAFE: 18
- MIXED: 0
- UNSAFE: 0

## Verificación manual (Clientes/Recepción/Export/Reportes)
1. Lista Clientes tenant A sin fugas de tenant B.
2. Detalle `/admin/clientes/[id]` de tenant B responde 404.
3. Export/diagnostics no exponen tenant distinto al de sesión.
4. `service-requests` bloquea `siteId` fuera de `allowedBranchIds`.
5. Accesos cross-tenant generan evento `TENANT_ISOLATION_BLOCKED`.

## Riesgos y mitigaciones
- Riesgo: regresiones en nuevas queries Prisma.
  - Mitigación: `pnpm check:tenant:isolation` + tests de rutas.
- Riesgo: modelos sin `tenantId` directo (visit/serviceRequest).
  - Mitigación: scope relacional por `visit.patient.tenantId` + branch guard.
- Riesgo: falsa sensación de seguridad por bypasses ad-hoc.
  - Mitigación: helper único `tenantContext.server.ts` y prohibición explícita de tenant desde frontend.

## Gates ejecutados
- `pnpm lint`: OK
- `pnpm typecheck`: OK
- `pnpm test`: OK (385 pass, 0 fail, 1 skipped)
- `pnpm build`: OK
- `pnpm check:tenant:isolation`: OK
