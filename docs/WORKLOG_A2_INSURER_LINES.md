# WORKLOG A2 - Insurer Lines (Ramos de seguro)

Updated: 2026-02-27  
Scope: A2 (Camino A)

## 1) Estado funcional

A2 ya estaba implementado y operativo en el repo; se verifico cobertura funcional y tecnica sin regresiones:

- Catalogo tenant-scoped de ramos: `ClientInsurerLineDirectory`.
- Manager en Configuracion de Clientes (`directories:insurer_lines`).
- Formulario de Aseguradora con:
  - `insurerLinePrimaryCode` (required)
  - `insurerLineSecondaryCodes` (multi)
  - exclusion principal vs secundarios.
- Compat legacy hacia `otro` para datos previos.

## 2) Evidencia verificada

- Form y validaciones:
  - `components/clients/ClientOrganizationCreateFormBase.tsx`
  - `app/admin/clientes/actions.ts`
- Catalogo/config:
  - `lib/clients/clientsConfigRegistry.ts`
  - `components/clients/config/ClientContactDirectoriesManager.tsx`
  - `components/clients/config/ClientsConfigDirectoriesSummary.tsx`
- Fallback/defaults:
  - `lib/clients/contactDirectories.server.ts`
  - `lib/catalogs/insurerLines` (seed/fallback)

## 3) Tests asociados

- `tests/clients.contact-directories.test.ts`
  - CTA defaults de ramos
  - no duplicidad principal en secundarios
  - fallback/catalog behavior

## 4) QA manual sugerido (A2)

1. Ir a `/admin/clientes/configuracion` -> Directorios -> Ramos de seguro.
2. Cargar defaults y validar listado activo/inactivo.
3. Crear aseguradora y definir ramo principal + secundarios.
4. Confirmar que principal no puede quedar duplicado en secundarios.
5. Editar un ramo inactivo y validar render con estado visible.

