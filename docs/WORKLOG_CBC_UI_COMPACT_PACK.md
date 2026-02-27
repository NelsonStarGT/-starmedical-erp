# WORKLOG — CBC UI COMPACT PACK (Clientes)

## Objetivo
Reducir altura visual y bloques verticales en vistas de Clientes sin mover la navegación contextual del módulo, manteniendo funcionalidad existente (filtros, export/import, cookie de país, RBAC).

## Qué se hizo
- `CBC-1` Barra de país ultra compacta:
  - Se creó `components/clients/CbcCountryFilterBar.tsx`.
  - Label actualizado a `Filtro por país`.
  - Texto explicativo largo removido de la vista y movido a tooltip (`?`).
  - Selector en una sola línea con altura compacta y soporte popover.
  - Se mantiene flujo funcional: cookie + POST server + `router.refresh()`.
- `CBC-2` Compactación de hero headers en listados:
  - Se reemplazaron headers grandes por `components/clients/CbcHeaderBar.tsx` en Lista y listados por tipo.
  - Títulos cortos y ayuda en tooltip, sin duplicar bloques informativos altos.
- `CBC-3` KPI en modo compacto por defecto:
  - `components/clients/ClientListKpiStrip.tsx` mantiene chips compactos por defecto.
  - `Ver más` expande tarjetas grandes solo bajo demanda.
  - Se agregó persistencia por vista (`localStorage`) para expanded/compact.
- `CBC-4` Acciones masivas contextuales:
  - Se creó `components/ui/CompactToolbar.tsx` y se integró en `components/clients/ClientBulkActionsPanel.tsx`.
  - La barra solo renderiza cuando `selectedCount > 0`.
  - Se mantiene sticky y permisos de backend.
- `CBC-5` Filtros rápidos + avanzados colapsados:
  - En engine de listados se deja visible solo filtro rápido por defecto.
  - `Filtros avanzados` inicia cerrado en `<details>`.
  - En Lista catálogo maestro se compactó spacing y altura visual de barra de filtros.
- `CBC-6` Directorios en Configuración con colapso por card:
  - Se creó `components/ui/CollapsibleCard.tsx`.
  - `components/clients/config/ClientsConfigDirectoriesSummary.tsx` ahora muestra información mínima inicial y detalles colapsados.
  - Banner grande de fallback se compactó con `CollapsibleCard` y detalles expandibles.
- `CBC-7` Sub-header compacto común:
  - Se usa `CbcHeaderBar` bajo topbar/sobre contenido para título contextual y acciones principales en listados.
  - No se movió la navegación contextual de Clientes.

## Componentes creados y por qué
- `components/clients/CbcHeaderBar.tsx`:
  - Encabezado reusable compacto para títulos de pestaña + acciones primarias + ayuda contextual.
- `components/clients/CbcCountryFilterBar.tsx`:
  - Barra compacta reusable para filtro país con tooltip y layout de baja altura.
- `components/ui/CollapsibleCard.tsx`:
  - Contenedor accesible para detalles expand/collapse por sección/tarjeta.
- `components/ui/CompactToolbar.tsx`:
  - Toolbar sticky de acciones contextuales que no ocupa espacio cuando no aplica.

## Cambios por pantalla (antes/después)
- `Lista`:
  - Antes: hero más alto y más separación vertical.
  - Después: header compacto + barra de filtros más ajustada + acciones visibles sin bloquear tabla.
- `Personas`:
  - Antes: encabezado y filtros consumían alto visible.
  - Después: CbcHeaderBar compacto + KPIs compactos por defecto + acciones masivas solo con selección + filtros avanzados cerrados.
- `Empresas`:
  - Antes: misma problemática de bloques apilados altos.
  - Después: estructura compacta equivalente a Personas.
- `Instituciones`:
  - Antes: alta densidad de bloques previos a tabla.
  - Después: patrón compacto unificado (header + KPI chips + quick filters).
- `Aseguradoras`:
  - Antes: mismo patrón vertical alto.
  - Después: patrón compacto unificado.
- `Configuración (Directorios)`:
  - Antes: cards con descripción extendida siempre visible y banner de fallback voluminoso.
  - Después: cards con resumen mínimo + `Ver detalles` colapsable + banner fallback compacto expandible.

## Archivos tocados (CBC)
- `app/admin/clientes/layout.tsx`
- `app/admin/clientes/lista/page.tsx`
- `app/admin/clientes/configuracion/page.tsx`
- `components/clients/ClientsCountryContextBar.tsx`
- `components/clients/CbcCountryFilterBar.tsx`
- `components/clients/CbcHeaderBar.tsx`
- `components/clients/ClientListKpiStrip.tsx`
- `components/clients/ClientBulkActionsPanel.tsx`
- `components/clients/config/ClientsConfigDirectoriesSummary.tsx`
- `components/ui/CollapsibleCard.tsx`
- `components/ui/CompactToolbar.tsx`
- `components/clients/CountryPicker.tsx`
- `lib/clients/list/ClientListEngine.tsx`
- `lib/clients/operatingCountryContext.ts`

## Evidencia (capturas)
- Personas listado:
  - Antes: `docs/screenshots/cbc-ui-compact-pack/before/personas-listado.png`
  - Después: `docs/screenshots/cbc-ui-compact-pack/after/personas-listado.png`
- Empresas listado:
  - Antes: `docs/screenshots/cbc-ui-compact-pack/before/empresas-listado.png`
  - Después: `docs/screenshots/cbc-ui-compact-pack/after/empresas-listado.png`
- Configuración Directorios:
  - Antes: `docs/screenshots/cbc-ui-compact-pack/before/config-directorios.png`
  - Después: `docs/screenshots/cbc-ui-compact-pack/after/config-directorios.png`

## QA manual (pasos)
1. Entrar a `/admin/clientes/personas` y verificar que se ve `CbcHeaderBar` compacto, KPIs en chips y más filas visibles sin scroll adicional.
2. Seleccionar filas en la tabla y confirmar que `Acciones masivas` aparece como toolbar sticky; deseleccionar todo y verificar que desaparece por completo.
3. En Personas/Empresas/Instituciones/Aseguradoras abrir `Filtros avanzados` y confirmar que inician cerrados por defecto.
4. Ir a `/admin/clientes/configuracion?section=directorios` y validar que cada card muestra resumen mínimo, con detalles solo al expandir `Ver detalles`.
5. Validar barra de país: aparece en `/admin/clientes/lista` y `/admin/clientes/reportes`, no aparece en `/admin/clientes` ni `/admin/clientes/configuracion` ni rutas `*/nuevo`.

## Notas
- No se alteró la lógica de negocio de backend ni permisos.
- Se priorizó reducción de alto visual reutilizando componentes, evitando estilos aislados por página.
