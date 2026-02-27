# TECH DEBT REGISTER

Updated: 2026-02-26 21:12:28 CST  
Scope: `app`, `components`, `lib`, `prisma`, `tests`

## Baseline (Sprint 0)

| Category | Metric | Count |
| --- | --- | ---: |
| Fallback DB guards | `warnDevMissingTable(` occurrences | 82 |
| Type escapes | `as unknown as` occurrences | 98 |
| ESLint suppressions | `eslint-disable` occurrences | 40 |
| Pending implementation notes | `TODO` occurrences | 47 |

## Current Snapshot (Roadmap A+B Preflight)

| Category | Metric | Count |
| --- | --- | ---: |
| Fallback DB guards | `warnDevMissingTable(` occurrences | 1 |
| Type escapes | `as unknown as` occurrences | 99 |
| ESLint suppressions | `eslint-disable` occurrences | 40 |
| Pending implementation notes | `TODO` occurrences | 41 |
| React hooks suppressions (Clientes/Recepcion scope) | `eslint-disable react-hooks` occurrences | 1 |

## Top 10 Files By Category

### 1) Fallback DB guards (`warnDevMissingTable(`)

1. `lib/prisma/errors.ts` (1, wrapper de compatibilidad)

Todos los callsites runtime fueron migrados a helpers centrales:
- `resolvePrismaSchemaFallback(...)` for REQUIRED/OPTIONAL handling
- `logPrismaSchemaIssue(...)` for explicit visible logging

### 2) Type escapes (`as unknown as`)

1. `prisma/seed.central-config.ts` (7)
2. `app/admin/clientes/actions.ts` (7)
3. `lib/medical/encounterRealStore.ts` (5)
4. `lib/medical/cie10Store.ts` (4)
5. `tests/attendanceRawPipeline.test.ts` (3)
6. `lib/portales/config.ts` (3)
7. `lib/medical/vitalsTemplateStore.ts` (3)
8. `lib/medical/templateStore.ts` (3)
9. `lib/medical/documentBrandingStore.ts` (3)
10. `tests/reception.client-registration-code.test.ts` (2)

### 3) ESLint suppressions (`eslint-disable`)

1. `app/hr/employees/page.tsx` (2)
2. `app/admin/usuarios/lista/page.tsx` (2)
3. `app/admin/inventario/movimientos/page.tsx` (2)
4. `app/admin/finanzas/page.tsx` (2)
5. `components/memberships/PlanEditorForm.tsx` (1)
6. `components/memberships/ContractsTableView.tsx` (1)
7. `components/medical/encounter/PatientContextCard.tsx` (1)
8. `components/medical/encounter/LetterPages.tsx` (1)
9. `components/medical/encounter/ConsultHeader.tsx` (1)
10. `components/medical/configuration/DocumentBrandingAdminClient.tsx` (1)

### 4) Pending implementation notes (`TODO`)

1. `app/modulo-medico/(suite)/agenda/page.tsx` (7)
2. `components/medical/encounter/ClinicalDiagnosticsPanel.tsx` (6)
3. `app/modulo-medico/(suite)/diagnostico/page.tsx` (4)
4. `prisma/seeds/geo-postal-codes.json` (2)
5. `prisma/schema.prisma` (2)
6. `app/modulo-medico/consultaM/[encounterId]/page.tsx` (2)
7. `app/modulo-medico/(suite)/dashboard/page.tsx` (2)
8. `app/marcaje/layout.tsx` (2)
9. `app/admin/reception/actions.ts` (2)
10. `lib/portal/data.ts` (1)

## Governance Policy

1. Baseline is locked from this document version.
2. New debt is not allowed without ticket and explicit owner.
3. Any PR that increases any category count must include:
   - ticket id,
   - justification,
   - planned removal sprint.
4. CI/PR review must reject debt growth without the metadata above.

## Suggested Sprint Sequence

1. Sprint 1: remove `warnDevMissingTable` hotspots for Clients + Reception.
2. Sprint 2: replace `as unknown as` in business services (non-test first).
3. Sprint 3: eliminate `eslint-disable` in operational/admin modules.
4. Sprint 4: convert `TODO` in medical/reception flows into tracked tickets or implement.
