# CLIENTS DATA INTEGRITY REPORT

Generated at: 2026-02-28T02:18:01.465Z

## Global counts

- Clientes activos: 1
- Clientes sin ubicación principal: 0
- Ubicación principal sin geoCountryId: 0
- Personas sin DPI/identificador activo: 0
- Empresas/Instituciones/Aseguradoras sin NIT: 0
- Clientes sin teléfono principal: 0
- Clientes sin email principal: 1
- Afiliaciones en PENDING_VERIFY efectivo: 0

## Potential duplicates

- DPI: 0 buckets / 0 clientes
- NIT: 0 buckets / 0 clientes
- Teléfono: 0 buckets / 0 clientes
- Email: 0 buckets / 0 clientes

## By tenant (issue counts)

| Tenant | Clientes | Sin ubicación principal | Ubicación sin país | Personas sin doc | Orgs sin NIT | Sin teléfono principal | Sin email principal | Afiliaciones pending verify |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| global | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |

## Notes

- Scope: clientes activos (`deletedAt IS NULL`).
- Duplicados potenciales se calculan por tenant.
- Teléfono se normaliza por dígitos; email se normaliza en minúsculas.
- PENDING_VERIFY efectivo usa regla actual de `resolveAffiliationEffectiveStatus`.
