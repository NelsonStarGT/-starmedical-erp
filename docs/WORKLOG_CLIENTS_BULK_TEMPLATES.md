# WORKLOG_CLIENTS_BULK_TEMPLATES

## Qué se hizo
Se reconstruyó el flujo de carga masiva de Clientes con una sola fuente de verdad por tipo para:
- plantilla CSV
- plantilla Excel
- export de datos CSV
- import CSV/XLSX (analyze + process)

Todo el pipeline usa el mismo registry de columnas y validaciones.

## Cómo se hizo

### Fase 0 - Reset controlado
- Se creó rama de trabajo: `codex/fix/clients-bulk-templates-v1`.
- Se dejó en baseline estable el flujo CSV anterior (rollback de cambios parciales previos y limpieza de archivos intermedios del intento anterior).
- Resultado: módulo clientes volvió a estado compilable antes de reconstruir.

### Fase 1 - Auditoría real (UI -> DB)
- Se auditó formularios y server actions reales.
- Se revisó el Excel de referencia y capturas del operador.
- Se definió que la plantilla incluye solo campos persistibles hoy.
- Evidencia de auditoría: `docs/CLIENTS_BULK_SCHEMA_AUDIT.md`.

### Fase 2 - Registry canónico
- Nuevo archivo fuente de verdad: `lib/clients/bulk/clientBulkSchema.ts`.
- Por tipo se definieron columnas con:
  - `key`
  - `headerDisplay`
  - `required`
  - `example`
  - `target`
  - `parser`
  - `aliases`
- Helpers comunes para headers, required, mapping sugerido, validación y extracción de valores.

### Fase 3 - Plantillas CSV + Excel
- Endpoint plantilla actualizado: `app/api/admin/clientes/import/template/route.ts`.
- CSV:
  - headers con `*` en requeridos
  - una fila ejemplo
- XLSX:
  - mismo orden/headers
  - requeridos en rojo (texto blanco)
  - hoja `Notas` con reglas de formato y diccionario campo->destino
- Generador estático:
  - `scripts/clients/generate-bulk-templates.ts`
  - comando: `pnpm clients:bulk:templates`
  - salida: `public/templates/clients/*`

### Fase 4 - Export/Import alineados al registry
- Export datos CSV actualizado: `app/api/admin/clientes/export/csv/route.ts`
  - usa headers del registry (mismo orden de plantilla)
  - serializador unificado: `lib/clients/bulk/clientBulkExport.ts`
  - respeta filtros activos + tenant scoping
- Import actualizado: `app/api/admin/clientes/import/csv/route.ts`
  - acepta CSV y XLSX
  - modo `analyze` con sugerencia de mapping + columnas ignoradas
  - modo `process` con validación de requeridos del mismo registry
  - reporte de errores en CSV (`row;message`)
- UI:
  - nuevo dropdown: `components/clients/ClientBulkExportMenu.tsx`
  - opciones:
    - Descargar plantilla CSV
    - Descargar plantilla Excel
    - Exportar datos CSV
  - microcopy de compatibilidad formulario/import

## Inventario FINAL de headers por tipo

### PERSON
`PrimerNombre*`, `SegundoNombre`, `TercerNombre`, `PrimerApellido*`, `SegundoApellido`, `TercerApellido`, `Sexo`, `PaisDocumentoISO2`, `TipoDocumento`, `NumeroDocumento*`, `TelefonoPrincipal*`, `EmailPrincipal`, `FechaNacimiento`, `TipoSangre`, `PaisResidencia`, `DepartamentoResidencia`, `CiudadResidencia`, `DireccionResidencia`, `SegmentosServicio`, `CanalAdquisicion`, `DetalleAdquisicion`, `Notas`

### COMPANY
`RazonSocial*`, `NombreComercial*`, `NIT*`, `FormaJuridica`, `FormaJuridicaOtro`, `TamanoEmpresa`, `ActividadEconomicaPrincipal`, `ActividadesEconomicasSecundarias`, `SitioWeb`, `DireccionPrincipal*`, `Pais*`, `Departamento*`, `Ciudad*`, `CodigoPostal`, `TelefonoPrincipal`, `EmailPrincipal`, `EmailFacturacion`, `MonedaPreferida`, `MonedasAceptadas`, `CanalAdquisicion`, `DetalleAdquisicion`, `NotaComercial`

### INSTITUTION
`NombreLegal*`, `NombrePublico`, `TipoInstitucion*`, `RegimenInstitucional`, `SectorInstitucional`, `EsPublica`, `NIT`, `SitioWeb`, `DireccionPrincipal*`, `Pais*`, `Departamento*`, `Ciudad*`, `CodigoPostal`, `TelefonoPrincipal`, `EmailPrincipal`, `EmailFacturacion`, `MonedaPreferida`, `MonedasAceptadas`, `CanalAdquisicion`, `DetalleAdquisicion`, `NotaComercial`

### INSURER
`NombreLegal*`, `NombreComercial`, `NIT*`, `TipoAseguradora*`, `AlcanceAseguradora`, `CodigoAseguradora`, `RamoPrincipal`, `RamosSecundarios`, `PortalAutorizaciones`, `EmailAutorizaciones`, `EmailSiniestros`, `TelefonoSoportePrestadores`, `WhatsAppSoportePrestadores`, `SitioWeb`, `DireccionPrincipal*`, `Pais*`, `Departamento*`, `Ciudad*`, `CodigoPostal`, `TelefonoPrincipal`, `EmailPrincipal`, `EmailFacturacion`, `MonedaPreferida`, `MonedasAceptadas`, `CanalAdquisicion`, `DetalleAdquisicion`, `NotaComercial`

## Archivos tocados (bulk templates)
- `lib/clients/bulk/clientBulkSchema.ts`
- `lib/clients/bulk/clientBulkExport.ts`
- `lib/clients/bulk/clientBulkTemplateWorkbook.ts`
- `app/api/admin/clientes/import/template/route.ts`
- `app/api/admin/clientes/export/csv/route.ts`
- `app/api/admin/clientes/import/csv/route.ts`
- `components/clients/ClientBulkExportMenu.tsx`
- `components/clients/ClientCsvImportButton.tsx`
- `lib/clients/list/ClientListEngine.tsx`
- `scripts/clients/generate-bulk-templates.ts`
- `public/templates/clients/*`
- `tests/clients.bulk-templates.test.ts`
- `package.json`

## Tests y verificación
- Test suite nueva:
  - `tests/clients.bulk-templates.test.ts`
- Cobertura mínima validada:
  - plantilla por tipo contiene headers correctos y orden fijo
  - export usa mismos headers que plantilla
  - import valida requeridos
  - round-trip mínimo por tipo
  - estructura XLSX esperada (zip + sheets + styles)

## QA manual (pasos)
1. Ir a `/admin/clientes/personas` (repetir por tipo) y abrir export.
2. Descargar `Plantilla CSV` y `Plantilla Excel`.
3. Confirmar headers con `*` en requeridos y hoja `Notas` en XLSX.
4. Completar 1 fila válida y cargar en import (`analyze` -> `process`).
5. Exportar `Datos CSV` y validar que usa el mismo orden de headers.
6. Repetir para Empresas, Instituciones y Aseguradoras.

## Gates ejecutados
- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅
- `pnpm build` ✅
