# Clientes Reportes v2.2.1 — Compact UI + CSV Multi-sección

## Resumen

Se aplicó una compactación visual de Reportes y se mejoró el flujo de exportación CSV cuando el usuario selecciona múltiples secciones.

## Cambios implementados

1. Paneles ON/OFF en popover compacto
- Se reemplazó la grilla de toggles visibles por un botón único:
  - `Paneles (N activos)`
- El popover incluye checklist por panel y acciones:
  - `Mostrar todo`
  - `Ocultar todo`
  - `Reset`
- Persistencia se mantiene en `localStorage`.

2. Presets de rango como chips con estado seleccionado
- Chips visibles:
  - `12m`, `24m`, `36m`, `48m`, `Año actual`, `Año anterior`.
- Al seleccionar un chip:
  - se setean `Desde/Hasta`
  - chip queda activo.
- Al editar manualmente fecha:
  - se desactiva preset y entra en modo `Personalizado`.

3. Charts con default inteligente
- Regla aplicada:
  - buckets `<=1` → `Tabla`
  - buckets `2..10` → `Barras`
  - `Dona` disponible solo si segmentos `<=8`.
- Se mantiene toggle manual por bloque.

4. Export CSV multi-sección como ZIP
- Si formato CSV y hay más de una sección:
  - se genera ZIP server-side con un CSV por sección.
- Naming:
  - `reportes-clientes-YYYYMMDD.zip`
- En UI:
  - se muestra aviso de ZIP automático
  - opción rápida `Seleccionar solo 1 sección`.

## Tests agregados

- `tests/clients.reports.panels-popover.test.ts`
  - persistencia parse/serialize de selección de paneles.
- `tests/clients.reports.preset-chips.test.ts`
  - resolución de preset por `from/to` y detección de `Personalizado`.
- `tests/clients.reports.export-csv-multisection.test.ts`
  - modo CSV multi-sección resuelve `zip_csv`.

## Archivos tocados (v2.2.1)

- `components/clients/reports/ClientsReportsPanelsLayout.tsx`
- `components/clients/reports/ClientsReportsFiltersForm.tsx`
- `components/clients/reports/ClientsReportsChartCard.tsx`
- `components/clients/reports/ClientsReportsExportModal.tsx`
- `app/api/clientes/reportes/export/route.ts`
- `lib/clients/reports/datePresets.ts`
- `lib/clients/reports/exportDelivery.ts`
- `lib/clients/reports/panelsPreferences.ts`
- `tests/clients.reports.panels-popover.test.ts`
- `tests/clients.reports.preset-chips.test.ts`
- `tests/clients.reports.export-csv-multisection.test.ts`

## QA manual sugerido

1. Abrir `/admin/clientes/reportes`.
2. Abrir `Paneles (N activos)`, apagar/encender paneles y recargar para validar persistencia.
3. Seleccionar chips de rango y confirmar autocompletado de `Desde/Hasta`.
4. Cambiar `Desde/Hasta` manualmente y confirmar estado `Personalizado`.
5. En Export:
   - CSV + múltiples secciones → descarga `.zip`.
   - Usar `Seleccionar solo 1 sección` y confirmar export CSV único.
6. Verificar charts:
   - dataset pequeño: barras por defecto
   - segmento único: tabla por defecto
   - dona deshabilitada cuando >8 segmentos.
