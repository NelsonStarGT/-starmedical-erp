# Clients Reportes v2 (Enterprise)

## Objetivo
Corregir brechas críticas de confiabilidad/seguridad en Reportes de Clientes y evolucionar la experiencia a una versión operativa enterprise.

## Alcance implementado

### 1) Stabilization (P0/P1/P2)
- **P0 export truncado**:
  - Se eliminó el comportamiento que limitaba export por cap de listado (100 filas).
  - Nuevo flujo de export usa paginación interna server-side (`getClientsReportRowsForExport`) con guardrails.
  - CSV/XLSX/PDF consumen el mismo dataset completo del filtro (hasta el límite de seguridad).
- **P1 RBAC inconsistente**:
  - Se introdujeron capabilities:
    - `CLIENTS_REPORTS_VIEW`
    - `CLIENTS_REPORTS_EXPORT`
    - `CLIENTS_REPORTS_EXPORT_FULL`
    - `CLIENTS_REPORTS_EXPORT_MASKED`
  - Se aplicó guard uniforme en:
    - SSR: `/admin/clientes/reportes`
    - APIs: `summary`, `list`, `geo`, `export`
- **P1 Solo referidos rompe paginación/totales**:
  - `referredOnly` ahora se aplica dentro de `buildWhere` y `buildSqlWhereClauses`.
  - Se removió filtrado post-paginación en `getClientsReportList`.
- **P1 Filtros inconsistente geo/list/summary**:
  - Se reforzó builder SQL para incluir mismos criterios de búsqueda (`q`) que Prisma where (identificadores, teléfonos, emails, etc.).
  - `referredOnly` y `country` aplican en ambos caminos.
- **P2 fecha `to` excluyente**:
  - Se normaliza `to` a fin de día (`23:59:59.999`) y `from` a inicio de día.

### 2) UI cleanup país
- En `/admin/clientes/reportes` se removió el selector antiguo de país dentro de filtros.
- El reporte ahora usa **únicamente** el filtro país global (cookie), alineado con el resto del módulo.

### 3) Features adultas
- **Mapa interactivo**:
  - Nuevo panel de mapa mundial por burbujas (países con centroides estáticos localmente).
  - Click en país -> drill-down a detalle admin1/admin2 vía endpoint geo.
- **Export configurable por rol**:
  - Nuevo modal de export con:
    - Formato (`xlsx`/`csv`)
    - Selección por grupos y columnas
    - Modo enmascarado de PII
  - Enmascarado forzado para roles con alcance `masked`.
  - Export scope resuelto por capabilities (`full`/`masked`/`none`).

## Archivos principales tocados
- `app/admin/clientes/reportes/page.tsx`
- `components/clients/reports/ClientsGeoMapPanel.tsx`
- `components/clients/reports/ClientsReportsExportModal.tsx`
- `app/api/clientes/reportes/summary/route.ts`
- `app/api/clientes/reportes/list/route.ts`
- `app/api/clientes/reportes/geo/route.ts`
- `app/api/clientes/reportes/export/route.ts`
- `lib/clients/reports.service.ts`
- `lib/clients/reports/requestFilters.ts`
- `lib/clients/reports/exportColumns.ts`
- `lib/clients/reports/permissions.ts`
- `lib/clients/reports/countryCentroids.ts`
- `lib/security/permissionCatalog.ts`
- `lib/rbac.ts`
- `app/admin/clientes/page.tsx`

## Tests agregados/actualizados
- `tests/clients.reports.export-full.test.ts`
- `tests/clients.reports.rbac.test.ts`
- `tests/clients.reports.filters-consistency.test.ts`
- `tests/clients.reports.to-date-inclusive.test.ts`
- actualización: `tests/clients.reports-transform.test.ts`

## QA manual sugerido
1. Ingresar a `/admin/clientes/reportes` con usuario sin `CLIENTS_REPORTS_VIEW` -> respuesta 403.
2. Ingresar con usuario con `CLIENTS_REPORTS_VIEW`:
   - validar que no exista selector interno de país.
   - validar que chips reflejen país proveniente de cookie.
3. Activar “Solo referidos” y comparar:
   - total de tabla,
   - paginación,
   - KPIs de resumen (sin inconsistencias).
4. Exportar dataset amplio (`csv`, `xlsx`, `pdf`) y verificar más de 100 registros cuando aplique.
5. Probar export con rol masked:
   - teléfono/email/documento deben salir enmascarados.

## Gates ejecutados
- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅
- `pnpm build` ✅

## Nota operativa
- El export tiene guardrail de volumen (`50,000` filas). Si se excede, endpoint devuelve error controlado para forzar filtros/rango más acotado.
