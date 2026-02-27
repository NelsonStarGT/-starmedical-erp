# WORKLOG — CVC Update (Clientes)

## Qué se hizo
- Se reconstruyó el bloque CVC (header + KPIs + acciones) para las vistas:
  - `/admin/clientes/personas`
  - `/admin/clientes/empresas`
  - `/admin/clientes/instituciones`
- Se estandarizó naming y copy:
  - `Personas`
  - `Empresas`
  - `Instituciones`
  - subtítulo homogéneo: `Listado maestro para consultar y gestionar la base de ...`
- Se implementó diseño compacto por defecto para KPIs con opción `Ver más`.
- Se mantuvo la lógica de datos existente (queries/servicios/backend) sin cambios funcionales de negocio.

## Cómo se hizo
- Se crearon dos componentes reutilizables nuevos:
  - `components/clients/CvcListHeader.tsx`
    - Header compacto con título, subtítulo en una línea, acciones primarias y tooltip opcional.
  - `components/clients/CvcKpiRow.tsx`
    - Fila KPI compacta (chips) + expansión opcional a cards.
    - Persistencia simple de expandido/colapsado via `localStorage` por vista.
- Integración centralizada en `lib/clients/list/ClientListEngine.tsx`:
  - Para `PERSON`, `COMPANY`, `INSTITUTION` se usa el nuevo CVC.
  - Se conservaron acciones por vista: crear + exportar + importar.
  - KPIs usados:
    - Total
    - Incompletos
    - Docs vencidos
    - Por vencer
    - Req. pendientes
    - Req. rechazados
    - Req. vencidos
  - Se conservó el filtrado por alertas al hacer click en chips/cards.
- Ajuste visual adicional para consistencia de altura de controles:
  - Botón principal de importar en `ClientCsvImportButton` actualizado a `h-10`.

## Archivos tocados
- `components/clients/CvcListHeader.tsx` (nuevo)
- `components/clients/CvcKpiRow.tsx` (nuevo)
- `lib/clients/list/ClientListEngine.tsx`
- `components/clients/ClientCsvImportButton.tsx`
- `docs/WORKLOG_CVC_UPDATE.md`
- Evidencias:
  - `docs/screenshots/cvc-update/before/personas-listado.png`
  - `docs/screenshots/cvc-update/after/personas-listado.png`
  - `docs/screenshots/cvc-update/before/empresas-listado.png`
  - `docs/screenshots/cvc-update/after/empresas-listado.png`
  - `docs/screenshots/cvc-update/before/instituciones-listado.png`
  - `docs/screenshots/cvc-update/after/instituciones-listado.png`

## QA manual (pasos)
1. Ir a `/admin/clientes/personas` y verificar:
   - título `Personas`
   - subtítulo de una línea
   - acciones: Crear persona / Exportar CSV / Importar
   - KPIs compactos en una fila.
2. Ir a `/admin/clientes/empresas` y verificar:
   - título `Empresas`
   - acciones correctas de empresa
   - sin términos de pacientes.
3. Ir a `/admin/clientes/instituciones` y verificar:
   - título `Instituciones`
   - no aparece copy redundante `clientes institucionales`.
4. En cualquiera de las 3 vistas:
   - usar botón `Ver más` en KPIs
   - confirmar expand/collapse correcto sin mover el menú contextual del módulo.
5. Confirmar que se visualizan más filas por pantalla que en las capturas `before`.

## Gates ejecutados
- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅
- `pnpm build` ✅
