# CLIENTS RELEASE NOTES

Generated at: 2026-02-28
Target: release candidate closure for módulo Clientes

## Resumen de cambios

### Seguridad / RBAC
- Se alinearon rutas API de reportes con auditoría de intentos bloqueados en `SystemEventLog`:
  - `/api/clientes/reportes/{summary,list,geo,birthdays,export}`
- Se reforzaron endpoints legacy de bulk para mantener el mismo estándar enterprise:
  - `/api/clientes/importar` ahora exige `CLIENTS_IMPORT_ANALYZE`
  - `/api/clientes/plantilla-excel` ahora exige `CLIENTS_EXPORT_TEMPLATE`
- Se añadieron eventos `CLIENTS_ACCESS_BLOCKED` para denegaciones de permisos en reportes/bulk.

### Integridad de datos
- Se agregó comando `pnpm clients:audit:data`.
- El comando genera `docs/CLIENTS_DATA_INTEGRITY_REPORT.md` con:
  - clientes sin ubicación principal,
  - ubicación principal sin `geoCountryId`,
  - personas sin documento,
  - organizaciones sin NIT,
  - sin teléfono/email principal,
  - duplicados potenciales por DPI/NIT/teléfono/email,
  - afiliaciones en `PENDING_VERIFY` efectivo.

### UX / Visual polish (sin tocar lógica de negocio)
- Se agregaron badges operativos en listas para detectar rápido:
  - `Falta ubicación`
  - `Falta contacto`
- Reportes tablas principales ahora usan `overflow-x-auto` para evitar quiebres en viewport pequeño.
- Truncación controlada en columnas largas (ubicación/canal/detalle/referidor).
- Headers reutilizables (`CbcHeaderBar`, `CvcListHeader`) ahora permiten subtítulo legible (sin truncado agresivo).
- Popover de paneles en reportes ahora es responsive (`w-[min(92vw,320px)]`).

### Export Reportes (compacto vs separado)
- Se agregó preferencia explícita en modal de export:
  - `Excel: Compactar en una sola hoja cuando sea posible` (ON por defecto)
  - `PDF: Compactar secciones pequeñas en una página cuando sea posible` (ON por defecto)
- Preferencias persisten en `localStorage`.
- Si se desactiva compactación:
  - XLSX fuerza hojas separadas.
  - PDF fuerza una sección por página.
- Excepción aplicada: `Mapa + detalle geográfico` siempre va separado (no compacta).

## Impacto
- Menor riesgo de fuga por rutas legacy.
- Mayor trazabilidad de intentos bloqueados.
- Exportes más controlables por usuario sin cambiar datos ni filtros.
- Mejor lectura operativa de calidad de datos desde listado/reportes.

## Gates
- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅
- `pnpm build` ✅

## Riesgo residual
- Los fallbacks de esquema legacy siguen visibles por diseño (diagnostics) hasta converger entornos al mismo estado de migraciones.
