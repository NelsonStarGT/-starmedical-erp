# WORKLOG_CLIENTS_CONFIG_RESPONSIVE_CARDS

## Objetivo
Mejorar la legibilidad y respuesta a zoom/pantalla en Clientes -> Configuración -> Directorios, evitando cards demasiado compactas y texto truncado agresivo.

## Qué se cambió

### 1) Componente reusable nuevo
- Se creó `components/ui/ResponsiveInfoCard.tsx`.
- Este componente estandariza:
  - padding adaptativo (`p-4 sm:p-5`)
  - tipografía responsive (`text-xs sm:text-sm md:text-base` según bloque)
  - toggle accesible expand/collapse (`aria-expanded`, `aria-controls`)
  - layout de badges/acciones con wrap para zoom alto

### 2) Refactor de Directorios
- Se reemplazó la implementación de cards en:
  - `components/clients/config/ClientsConfigDirectoriesSummary.tsx`
- Ajustes principales:
  - grid responsive: `1 col` mobile, `2` en md, `3` en xl, `4` en 2xl
  - card más alta y respirada
  - títulos/subtítulos con wrap natural
  - badges y CTA “Administrar” con tamaños consistentes
  - detalles largos dentro de bloque expandible

### 3) Comportamiento en zoom
- El contenido ahora envuelve correctamente en zoom alto.
- Se evita desbordamiento horizontal en textos de “Qué es / Se usa en / Dependencias”.
- El botón de expandir/ocultar permanece usable en breakpoints pequeños.

## Archivos tocados
- `components/ui/ResponsiveInfoCard.tsx`
- `components/clients/config/ClientsConfigDirectoriesSummary.tsx`

## QA manual
1. Ir a `/admin/clientes/configuracion`.
2. Revisar grid en mobile/tablet/desktop (1-2-3-4 columnas según ancho).
3. Probar zoom browser 100%/125%/150%.
4. Confirmar que texto no se desborda y que cards conservan legibilidad.
5. Expandir/colapsar detalles de varias cards y validar accesibilidad teclado.

## Evidencia (antes/después)
- Antes: `docs/screenshots/cbc-ui-compact-pack/before/config-directorios.png`
- Después: `docs/screenshots/cbc-ui-compact-pack/after/config-directorios.png`

## Gates
- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅
- `pnpm build` ✅
