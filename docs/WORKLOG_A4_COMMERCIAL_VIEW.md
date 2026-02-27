# WORKLOG A4 - Commercial View (CRM-lite)

Updated: 2026-02-27  
Scope: A4 (Camino A)

## 1) Estado funcional

A4 ya estaba operativo y se mantuvo como implementacion canonica:

- Toggle `Operativa | Comercial` en listado de clientes.
- Tabla comercial con:
  - `clientCode`
  - nombre
  - tipo
  - NIT/ID
  - canal
  - actividad/ramo
  - ubicacion
  - contacto principal
  - estado
  - ultima actividad
- Filtros: busqueda global, tipo, estado, canal, actividad/ramo, ubicacion, score, rango fechas.

## 2) Evidencia verificada

- UI: `app/admin/clientes/lista/page.tsx`
- Servicio: `lib/clients/commercialList.service.ts`
- Integracion de orden/paginacion estable en listado comercial.

## 3) Cobertura y QA

- Busqueda por `clientCode` habilitada desde servicio/listado.
- Vista comercial conserva estilo StarMedical (tabla zebra, cards, filtros compactos).
- Validacion automatizada global:
  - `pnpm lint` -> PASS
  - `pnpm typecheck` -> PASS
  - `pnpm test` -> PASS

## 4) QA manual sugerido (A4)

1. Abrir `/admin/clientes/lista`.
2. Cambiar entre `Operativa` y `Comercial`.
3. Buscar por `clientCode` (`C001`, `E0`, etc.).
4. Aplicar filtros combinados (tipo + estado + ubicacion + fechas).
5. Validar columna `Actividad / ramo` para aseguradoras.
6. Revisar paginacion y orden por `ultima actividad`.

