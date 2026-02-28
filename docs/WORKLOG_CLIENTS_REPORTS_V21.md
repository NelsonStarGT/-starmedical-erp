# Clients Reportes v2.1

## Qué se hizo
- Se reemplazó el mapa de centroides por un mapa mundial real SVG con TopoJSON local (`/public/maps/world-countries-110m.topo.json`) usando `react-simple-maps`.
- Se añadió navegación 2D del mapa:
  - pan por drag,
  - zoom + / - con límites (`1..6`),
  - reset de vista.
- Se añadieron capas visuales con toggle:
  - `Mapa`,
  - `Burbujas`,
  - `Ambos`.
- Se añadió filtro de región multiselección (solo UI mapa):
  - América / Europa / África / Asia / Oceanía,
  - subregiones de América (Norte / Centro / Sur).
- Se migraron los filtros de fecha de Reportes al `DateField` canónico del ERP y se agregaron presets:
  - Hoy
  - 7 días
  - 30 días
  - Mes actual
  - Año actual
- Se creó el reporte operativo de **Cumpleaños** dentro de Reportes:
  - Filtro por mes
  - Filtro por próximos días (7/14/30)
  - Tabla con acciones de contacto (perfil/teléfono/WhatsApp/email)
  - Export CSV de cumpleañeros

## Cómo se hizo
- UI:
  - Nuevo componente cliente: `components/clients/reports/ClientsReportsFiltersForm.tsx`
  - Refactor del mapa: `components/clients/reports/ClientsGeoMapPanel.tsx`
  - `app/admin/clientes/reportes/page.tsx` ahora:
    - usa filtros canónicos,
    - mantiene chips/tabla/resumen,
    - agrega sección de cumpleañeros y export.
- Backend:
  - `lib/clients/reports.service.ts`:
    - nuevo `getClientsReportBirthdays`
    - utilitarios de proyección/normalización para cumpleaños
  - `app/api/clientes/reportes/birthdays/route.ts`:
    - JSON para consumo UI
    - CSV para export operativo
    - tenant scoped + country filter por cookie
- Mapa y filtro país:
  - click en país persiste cookie vía `/api/admin/clientes/operating-country`
  - `router.refresh()` para sincronizar todo el reporte con el país seleccionado.
- Mapa interactivo v2.1:
  - `ZoomableGroup` controlado por estado (`center`, `zoom`),
  - controles flotantes en esquina superior derecha,
  - burbujas renderizadas con centroides (`countryIso2`) y escala raíz cuadrada,
  - filtro regional aplicable solo a la capa visual (sin tocar queries backend).

## Archivos tocados
- `app/admin/clientes/reportes/page.tsx`
- `components/clients/reports/ClientsGeoMapPanel.tsx`
- `components/clients/reports/ClientsReportsFiltersForm.tsx`
- `app/api/clientes/reportes/birthdays/route.ts`
- `lib/clients/reports.service.ts`
- `lib/clients/reports/datePresets.ts`
- `lib/clients/reports/countryRegions.ts`
- `public/maps/world-countries-110m.topo.json`
- `package.json`
- `package-lock.json`
- `tests/clients.reports.date-presets.test.ts`
- `tests/clients.reports.birthdays.test.ts`
- `tests/clients.reports.geo-map.test.ts`
- `tests/clients.reports.map-regions.test.ts`

## QA manual (10 min)
1. Entrar a `/admin/clientes/reportes` y validar que el mapa mundial renderiza países (sin burbujas antiguas).
2. Hacer hover sobre países y confirmar tooltip con nombre + total.
3. Hacer click en un país del mapa y verificar:
   - se actualiza el filtro país global (cookie),
   - la página refresca y los datos quedan filtrados.
4. Probar presets de fecha y confirmar que impactan resumen, tabla, mapa y export.
5. En sección Cumpleaños:
   - filtrar por mes y por próximos días,
   - validar acciones tel/wa/mail,
   - exportar CSV y revisar columnas/filas.
6. En mapa:
   - arrastrar + zoom +/- y reset,
   - cambiar entre `Mapa`, `Burbujas`, `Ambos`,
   - filtrar por `América` y validar atenuación del resto,
   - click en país (shape o burbuja) y validar drill-down admin1/admin2.
