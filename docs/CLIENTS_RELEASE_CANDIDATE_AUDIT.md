# CLIENTS RELEASE CANDIDATE AUDIT

Generated at: 2026-02-28
Branch: `codex/release/clients-rc-v1`

## 1) Scope
Audited module scope:
- UI routes: Dashboard, Lista, Personas, Empresas, Instituciones, Aseguradoras, Configuración, Reportes.
- APIs: `app/api/clientes/*` and `app/api/admin/clientes/*`.
- Services: `lib/clients/*` and `lib/clients/reports/*` in active use for these routes.

Audit focus:
- auth + RBAC consistency (SSR + API)
- tenant/branch scoping
- migration/fallback state
- release debt in Clientes only (warnings, status codes, server/client boundaries, tenant filters)

## 2) Route Inventory (SSR)

| Route | Auth | RBAC / Capability | Tenant Scope | Branch Scope |
|---|---|---|---|---|
| `/admin/clientes` | `getSessionUserFromCookies` + redirect login | dashboard render gated by session; report card gated by `CLIENTS_REPORTS_VIEW` | `tenantIdFromUser` | N/A (master clients) |
| `/admin/clientes/lista` | required | session-based; export/import buttons respect bulk capabilities | queries include `tenantId` server-side | N/A |
| `/admin/clientes/personas` | required (in listing flow) | personas listing/actions follow existing role policy | tenant-scoped services/actions | N/A |
| `/admin/clientes/personas/nuevo` | required | explicit `isAdmin(...)` gate | tenant-scoped create | N/A |
| `/admin/clientes/empresas` | required (listing flow) | session + server actions policy | tenant-scoped | N/A |
| `/admin/clientes/empresas/nuevo` | required | session + create action policy | `tenantIdFromUser` | N/A |
| `/admin/clientes/instituciones` | required (listing flow) | session + actions policy | tenant-scoped | N/A |
| `/admin/clientes/instituciones/nuevo` | required | session + actions policy | `tenantIdFromUser` | N/A |
| `/admin/clientes/aseguradoras` | required (listing flow) | session + actions policy | tenant-scoped | N/A |
| `/admin/clientes/aseguradoras/nuevo` | required | session + actions policy | `tenantIdFromUser` | N/A |
| `/admin/clientes/[id]` | required | docs tab/actions gated via permissions resolver | strict tenant ownership; cross-tenant -> `notFound()` | N/A |
| `/admin/clientes/configuracion` | required | diagnostics tabs gated by `canViewClientsConfigDiagnostics` / global equivalent | tenant-scoped config and diagnostics | N/A |
| `/admin/clientes/reportes` | required | hard gate `canViewClientsReports` (`CLIENTS_REPORTS_VIEW`) | all report loaders derive tenant from session | N/A |
| `/admin/clientes/buscar` | required | session only | redirect target resolved from tenant-scoped query | N/A |

## 3) API Inventory (Auth/RBAC/Tenant)

| API | Auth | Capability Gate | Tenant Scope | Branch Scope |
|---|---|---|---|---|
| `/api/clientes/reportes/summary` | `requireAuth` | `CLIENTS_REPORTS_VIEW` | `tenantIdFromUser` in filters | N/A |
| `/api/clientes/reportes/list` | `requireAuth` | `CLIENTS_REPORTS_VIEW` | `tenantIdFromUser` in filters | N/A |
| `/api/clientes/reportes/geo` | `requireAuth` | `CLIENTS_REPORTS_VIEW` | `tenantIdFromUser` in filters | N/A |
| `/api/clientes/reportes/birthdays` | `requireAuth` | `CLIENTS_REPORTS_VIEW` | `tenantIdFromUser` in filters | N/A |
| `/api/clientes/reportes/export` | `requireAuth` | `CLIENTS_REPORTS_VIEW` + export scope (`full/masked/none`) | `tenantIdFromUser`; export uses same effective filters | N/A |
| `/api/admin/clientes/export/csv` | `requireAuth` | `CLIENTS_EXPORT_DATA` | `tenantIdFromUser`; country filter sanitized server-side | N/A |
| `/api/admin/clientes/import/template` | `requireAuth` | `CLIENTS_EXPORT_TEMPLATE` | capability-only (template static) | N/A |
| `/api/admin/clientes/import/csv` | `requireAuth` | `CLIENTS_IMPORT_ANALYZE` / `CLIENTS_IMPORT_PROCESS` (+ update capability) | `tenantIdFromUser` for analyze/process | N/A |
| `/api/admin/clientes/[id]/preview` | `requireAuth` | docs visibility + admin checks | tenant filter in lookup | N/A |
| `/api/admin/clientes/diagnostics/export` | `requireAuth` | diagnostics capability | tenant derived server-side | N/A |
| `/api/admin/clientes/diagnostics/resolve` | `requireAuth` | diagnostics capability | tenant derived server-side | N/A |
| `/api/admin/clientes/operating-country` | `requireAuth` | session-gated | cookie write/read in tenant context | N/A |
| `/api/admin/clientes/schema-health` | `requireAuth` | diagnostics capability | global snapshot endpoint, tenant-aware UI consumption | N/A |
| `/api/clientes/importar` (legacy compatibility) | `requireAuth` | `CLIENTS_IMPORT_ANALYZE` | tenant/actor passed to processing context | N/A |
| `/api/clientes/plantilla-excel` (legacy compatibility) | `requireAuth` | `CLIENTS_EXPORT_TEMPLATE` | tenant/actor passed to processing context | N/A |

## 4) Migration / Fallback State

`pnpm db:migrate:status`:
- `69 migrations found in prisma/migrations`
- `Database schema is up to date!`

Fallbacks visible (expected, controlled):
- `lib/clients/list.service.ts` keeps legacy-safe fallback for missing document workflow columns.
- `lib/prisma/domainSchemaHealth.ts` + `/api/admin/clientes/schema-health` exposes optional/required schema drift as diagnostics.
- Reportes referrals still support `source: compat` with warning banner when live relation is unavailable.

## 5) Debt Inventory (Clientes scope)

### P0
- Legacy endpoints `/api/clientes/importar` and `/api/clientes/plantilla-excel` lacked hard RBAC alignment with enterprise bulk flow.
- Status: **Fixed** (now `requireAuth` + capability checks + blocked-event logging).

### P1
- Tenant guardrail (`check:tenant:isolation`) flagged `commercialList` query due implicit `where` composition.
- Status: **Fixed** (explicit tenant marker in Prisma query + guardrail green).

- Visual density anomalies in report/list tables (overflow/truncation in small viewport).
- Status: **Fixed** (responsive overflow, truncation bounds, compact header wrapping improvements).

### P2
- No active React key/hydration warning found in Clientes scope after previous fixes.
- No runtime client import of server-only modules found in Clientes scope (one type-only import in diagnostics client component is compile-time only).

## 6) Gates Evidence

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅ (`471 passed`, `0 failed`, `1 skipped`)
- `pnpm build` ✅ (see release notes section for latest run)
- `pnpm check:tenant:isolation` ✅

## 7) Conclusion
Release candidate is technically stable for Clientes scope with:
- consistent auth/RBAC enforcement,
- tenant-safe report/export/import surfaces,
- validated migration state,
- controlled fallback behavior,
- resolved high-impact visual anomalies without business-logic changes.
