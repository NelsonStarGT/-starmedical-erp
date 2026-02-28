# Clientes Reportes v2.2 — Worklog

## Qué se implementó

1. Paneles on/off en Reportes (sin alterar filtros de datos):
   - Clientes por tipo
   - Top canales
   - Aseguradoras por ramo
   - Mapa + detalle geográfico
   - Top referidores
   - Cumpleañeros
   - Listado de clientes

2. Presets de rango nuevos en filtros:
   - 12m, 24m, 36m, 48m
   - Año actual
   - Año anterior
   - Se mantienen desde/hasta manuales y presets existentes.

3. Charts por bloque con toggle de representación:
   - Tabla | Barras | Dona
   - Aplicado en:
     - Clientes por tipo
     - Top canales
     - Geo por país

4. Export “Pro”:
   - Modal de exportación con selección de secciones y formato.
   - Preview de lo que se exportará según filtros actuales.
   - Formatos: PDF, Excel, CSV.
   - Reglas:
     - PDF máximo 5 secciones.
     - CSV una sección por archivo.
     - Excel múltiples secciones en hojas separadas.
   - Mantiene RBAC full/masked.

5. Backend export por secciones:
   - `sections` (query param) controla datasets incluidos.
   - Se respeta tenant scope y filtros vigentes.
   - Mapa + detalle geográfico exporta países/admin1/admin2 juntos.

## Cómo se implementó

- Se creó un registro de paneles compartido (`lib/clients/reports/panels.ts`) para sincronizar:
  - Toolbar de visibilidad de paneles.
  - Modal de exportación.
  - Endpoint de export por secciones.

- Se añadieron componentes UI reutilizables:
  - `ClientsReportsPanelsLayout`: control de paneles con persistencia (`localStorage`).
  - `ClientsReportsChartCard`: visualización con modo tabla/barras/dona usando Recharts.

- Se refactorizó `app/admin/clientes/reportes/page.tsx` para:
  - Mantener filtros y dataset existentes.
  - Renderizar paneles con visibilidad dinámica.
  - Integrar charts por bloque sin romper mapa ni cumpleaños.

- Se extendió `datePresets` con rangos de meses y año anterior.

- Se rediseñó el endpoint `/api/clientes/reportes/export` para soportar export por secciones con comportamiento por formato.

## Tests agregados / actualizados

- `tests/clients.reports.date-presets.test.ts`
  - Cubre presets 12m/24m/36m/48m y año anterior.

- `tests/clients.reports.export-modal.test.ts`
  - Valida payload/query del modal pro (secciones, formato, máscara).

- `tests/clients.reports.birthdays-route.test.ts`
  - Verifica tenant-safety del endpoint de cumpleaños ante query manipulada.

## QA manual recomendado (10 minutos)

1. Entrar a `/admin/clientes/reportes`.
2. En “Paneles”, apagar/encender secciones y recargar página: confirmar persistencia de preferencias.
3. Probar presets 12m, 24m, año actual y año anterior: confirmar que actualizan Desde/Hasta.
4. Cambiar bloque “Clientes por tipo” entre Tabla/Barras/Dona y validar datos consistentes.
5. Abrir “Exportar”:
   - seleccionar varias secciones + Excel y descargar.
   - seleccionar varias secciones + CSV (debe advertir/bloquear).
   - seleccionar >5 secciones + PDF (debe rechazar en API).
6. Confirmar que “Mapa + detalle geográfico” sigue junto y funcional.
7. Confirmar que Cumpleañeros sigue aplicando filtros y export CSV.

## Archivos tocados (v2.2)

- `app/admin/clientes/reportes/page.tsx`
- `app/api/clientes/reportes/export/route.ts`
- `components/clients/reports/ClientsReportsChartCard.tsx`
- `components/clients/reports/ClientsReportsExportModal.tsx`
- `components/clients/reports/ClientsReportsFiltersForm.tsx`
- `components/clients/reports/ClientsReportsPanelsLayout.tsx`
- `lib/clients/reports/datePresets.ts`
- `lib/clients/reports/panels.ts`
- `tests/clients.reports.birthdays-route.test.ts`
- `tests/clients.reports.date-presets.test.ts`
- `tests/clients.reports.export-modal.test.ts`
