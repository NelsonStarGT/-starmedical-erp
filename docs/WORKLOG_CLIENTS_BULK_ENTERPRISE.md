# WORKLOG_CLIENTS_BULK_ENTERPRISE

## Decision de producto (XLSX truth)
- La plantilla oficial de carga masiva de Clientes es **Excel (XLSX)**.
- CSV queda para:
  - Exportar datos reales (obligatorio).
  - Plantilla CSV (opcional) solo porque ahora esta alineada 1:1 con el mismo registry.
- Fuente de verdad unica: `lib/clients/bulk/clientBulkSchema.ts`.

## Que se corrigio en CSV (y por que estaba mal)
Problema previo:
- Habia drift funcional entre plantilla/import/export (headers y validaciones no siempre iban sincronizados).

Correccion:
- CSV plantilla y export ahora salen del mismo registry.
- Import CSV acepta headers con `*` y sin `*` (normalizacion/aliases del registry).
- Export datos usa exactamente el mismo orden de columnas que la plantilla CSV.
- Contratos de test agregados para bloquear regresiones.

## Headers finales por tipo (registry canonico)

### PERSON
`PrimerNombre*`, `SegundoNombre`, `TercerNombre`, `PrimerApellido*`, `SegundoApellido`, `TercerApellido`, `Sexo`, `PaisDocumentoISO2`, `TipoDocumento`, `NumeroDocumento*`, `TelefonoPrincipal*`, `EmailPrincipal`, `FechaNacimiento`, `TipoSangre`, `PaisResidencia`, `DepartamentoResidencia`, `CiudadResidencia`, `DireccionResidencia`, `SegmentosServicio`, `CanalAdquisicion`, `DetalleAdquisicion`, `Notas`

### COMPANY
`RazonSocial*`, `NombreComercial*`, `NIT*`, `FormaJuridica`, `FormaJuridicaOtro`, `TamanoEmpresa`, `ActividadEconomicaPrincipal`, `ActividadesEconomicasSecundarias`, `SitioWeb`, `DireccionPrincipal*`, `Pais*`, `Departamento*`, `Ciudad*`, `CodigoPostal`, `TelefonoPrincipal`, `EmailPrincipal`, `EmailFacturacion`, `MonedaPreferida`, `MonedasAceptadas`, `CanalAdquisicion`, `DetalleAdquisicion`, `NotaComercial`

### INSTITUTION
`NombreLegal*`, `NombrePublico`, `TipoInstitucion*`, `RegimenInstitucional`, `SectorInstitucional`, `EsPublica`, `NIT`, `SitioWeb`, `DireccionPrincipal*`, `Pais*`, `Departamento*`, `Ciudad*`, `CodigoPostal`, `TelefonoPrincipal`, `EmailPrincipal`, `EmailFacturacion`, `MonedaPreferida`, `MonedasAceptadas`, `CanalAdquisicion`, `DetalleAdquisicion`, `NotaComercial`

### INSURER
`NombreLegal*`, `NombreComercial`, `NIT*`, `TipoAseguradora*`, `AlcanceAseguradora`, `CodigoAseguradora`, `RamoPrincipal`, `RamosSecundarios`, `PortalAutorizaciones`, `EmailAutorizaciones`, `EmailSiniestros`, `TelefonoSoportePrestadores`, `WhatsAppSoportePrestadores`, `SitioWeb`, `DireccionPrincipal*`, `Pais*`, `Departamento*`, `Ciudad*`, `CodigoPostal`, `TelefonoPrincipal`, `EmailPrincipal`, `EmailFacturacion`, `MonedaPreferida`, `MonedasAceptadas`, `CanalAdquisicion`, `DetalleAdquisicion`, `NotaComercial`

## Reglas de dedupe

### Claves duras
- PERSON: `NumeroDocumento` (DPI/Documento).
- COMPANY / INSTITUTION / INSURER: `NIT`.

### Claves secundarias (probables)
- `TelefonoPrincipal`
- `EmailPrincipal`

### Modo ANALYZE
- Detecta:
  - `EXACT_DUPLICATE` (clave dura existente)
  - `PROBABLE_DUPLICATE` (telefono/email)
- Devuelve conflicto con: fila, registro, campo, valor, `existingId`, accion sugerida (`SKIP`/`REVIEW`).
- Permite descargar reporte CSV de duplicados desde analisis.

### Modo PROCESS
- Modo por defecto seguro: `dedupeMode=skip`.
- Duplicado exacto => **SKIP** (no crea, no actualiza) y se reporta.
- Resumen incluye `skipped` y `duplicates`.
- Se entrega CSV de duplicados y preview en UI.

## RBAC/capabilities agregados

Permisos nuevos:
- `CLIENTS_EXPORT_TEMPLATE`
- `CLIENTS_EXPORT_DATA`
- `CLIENTS_IMPORT_ANALYZE`
- `CLIENTS_IMPORT_PROCESS`
- `CLIENTS_IMPORT_PROCESS_UPDATE` (reservado para modo update controlado)

Aplicacion:
- Template endpoint: requiere `CLIENTS_EXPORT_TEMPLATE`.
- Export datos endpoint: requiere `CLIENTS_EXPORT_DATA`.
- Import endpoint:
  - `mode=analyze` requiere `CLIENTS_IMPORT_ANALYZE`.
  - `mode=process` requiere `CLIENTS_IMPORT_PROCESS`.
  - `dedupeMode=update` requiere `CLIENTS_IMPORT_PROCESS_UPDATE`.

Defaults por rol:
- `ADMIN/SUPER_ADMIN`: acceso total (por modelo admin).
- `OPS`: template + export data + analyze + process (agregado en role map base).

## UX operable de import
- Modal de import refactorizado:
  - CTA primario: descargar plantilla Excel oficial.
  - soporte subida CSV/XLSX.
  - analisis con tabla de conflictos.
  - resultado con banners:
    - Verde: sin errores.
    - Amarillo: carga parcial / duplicados / skips.
    - Rojo: no cargo ninguno y hubo errores.
  - botones de descarga:
    - errores CSV
    - duplicados CSV

## Archivos tocados (principales)
- `lib/clients/bulk/clientBulkSchema.ts`
- `lib/clients/bulk/clientBulkTemplateWorkbook.ts`
- `lib/clients/bulk/clientBulkExport.ts`
- `lib/clients/bulk/permissions.ts`
- `components/clients/ClientBulkExportMenu.tsx`
- `components/clients/ClientCsvImportButton.tsx`
- `lib/clients/list/ClientListEngine.tsx`
- `app/admin/clientes/lista/page.tsx`
- `app/api/admin/clientes/import/template/route.ts`
- `app/api/admin/clientes/export/csv/route.ts`
- `app/api/admin/clientes/import/csv/route.ts`
- `lib/security/permissionCatalog.ts`
- `lib/rbac.ts`
- `tests/clients.bulk-templates.test.ts`
- `tests/clients.bulk-rbac-dedupe.test.ts`

## QA manual (paso a paso)
1. Iniciar sesion con usuario con permisos de bulk (ADMIN/OPS).
2. Abrir Personas/Empresas/Instituciones/Aseguradoras y validar dropdown Exportar:
   - plantilla Excel (oficial)
   - plantilla CSV (opcional)
   - exportar datos CSV
3. Abrir Importar, descargar plantilla Excel, cargar 1 fila valida y ejecutar Analyze + Process.
4. Probar duplicado exacto (mismo documento o NIT): verificar SKIP y reporte de duplicados.
5. Probar usuario sin permisos (por ejemplo sin `CLIENTS_IMPORT_PROCESS`): verificar 403 en API y UI restringida.

