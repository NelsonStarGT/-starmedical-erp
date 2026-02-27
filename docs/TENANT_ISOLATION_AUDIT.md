# Tenant Isolation Audit (Clientes + Recepción)

Fecha de auditoría: 2026-02-27

## Metodología
- Revisión de queries Prisma en superficies críticas (actions/routes/pages/services).
- Verificación de origen de contexto (`tenantId`/`branch`) únicamente desde sesión.
- Revisión de accesos por ID directo (URL params) y rutas de export/report.

## Hallazgos
| Archivo:línea | Query / patrón | Estado | Riesgo | Recomendación |
|---|---|---|---|---|
| `app/api/admin/companies/route.ts:17` | Listado empresas: `tenantId` desde sesión en schema parse | SAFE | ALTO mitigado | Mantener bloqueo de `tenantId` por query |
| `app/api/admin/companies/[id]/route.ts:25` | Detalle empresa: `tenantId` desde sesión | SAFE | ALTO mitigado | Mantener `id + tenant` en repositorio |
| `lib/companies/repositories/company.repo.ts:104` | `company.findFirst({ id, tenantId })` | SAFE | ALTO mitigado | No regresar a `findUnique(id)` |
| `app/api/admin/clientes/diagnostics/export/route.ts:83` | Export diagnostics con `tenantIdFromUser` | SAFE | ALTO mitigado | Mantener sin bypass global |
| `app/api/admin/clientes/diagnostics/resolve/route.ts:53` | Resolve digest tenant-scoped | SAFE | ALTO mitigado | Ignorar `tenantId` en body |
| `app/api/admin/clientes/import/csv/route.ts:607` | Import CSV deriva tenant desde sesión | SAFE | ALTO mitigado | Mantener firma `processRows(..., tenantId)` |
| `app/api/admin/clientes/import/csv/route.ts:349` | `clientProfile.findFirst` con `tenantId` (persona) | SAFE | ALTO mitigado | Reforzar tests de import cross-tenant |
| `app/api/admin/clientes/import/csv/route.ts:409` | `clientProfile.findFirst` con `tenantId` (empresa) | SAFE | ALTO mitigado | Reforzar tests de import cross-tenant |
| `app/admin/clientes/[id]/page.tsx:322` | Detalle cliente por `id + tenantId` | SAFE | ALTO mitigado | Mantener `notFound()` cuando no coincide tenant |
| `app/admin/clientes/[id]/page.tsx:327` | Detección de ID en otro tenant + log bloqueo | SAFE | MEDIO mitigado | Mantener log sin PII |
| `app/api/reception/service-requests/route.ts:46` | Visit lookup con `patient.tenantId` | SAFE | ALTO mitigado | Mantener scope relacional en modelos sin tenant directo |
| `app/api/reception/service-requests/route.ts:75` | Branch guard con `assertBranchAccess` | SAFE | ALTO mitigado | Mantener validación antes de listar/crear |
| `app/api/reception/service-requests/route.ts:122` | POST valida `visitId + siteId + tenant` | SAFE | ALTO mitigado | Mantener orden de validación previo a create |
| `app/api/reception/service-requests/[id]/route.ts:22` | GET/PATCH `serviceRequest` scoping por `visit.patient.tenantId` | SAFE | ALTO mitigado | Mantener `findFirst` + 404 |
| `app/admin/reception/visit/[visitId]/page.tsx:20` | Detalle visita por tenant + branch permitido | SAFE | ALTO mitigado | Mantener `notFound` y log bloqueo |
| `app/admin/reception/actions.ts:460` | Queue item scope con `visit.patient.tenantId + siteId` | SAFE | ALTO mitigado | Mantener helper central y reuse en acciones |
| `app/admin/reception/actions.ts:829` | Transition status visit con tenant scope | SAFE | ALTO mitigado | Mantener bloqueo cross-tenant con evento |
| `lib/security/tenantContext.server.ts:41` | Helper único de contexto tenant/branch | SAFE | ALTO mitigado | Evitar resoluciones ad-hoc de tenant/branch |

## Métricas de auditoría
- Queries críticas auditadas: 18
- SAFE: 18
- MIXED: 0
- UNSAFE: 0

## Conclusión
No se detectan rutas críticas en Clientes/Recepción con acceso cross-tenant activo tras enforcement.
