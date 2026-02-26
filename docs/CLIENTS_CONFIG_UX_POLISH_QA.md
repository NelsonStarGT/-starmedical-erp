# CLIENTS CONFIG UX POLISH QA (Pasos 1-4 + opcionales)

## Scope
Ruta: `/admin/clientes/configuracion`

## Pre-check técnico
1. `npm run typecheck:clients`
2. `npx eslint app/admin/clientes/configuracion/page.tsx components/clients/config/ClientsConfigTabsNav.tsx components/clients/config/ClientsConfigOverview.tsx components/clients/config/ClientsConfigCatalogFocus.tsx components/clients/config/ClientsConfigDirectoriesSummary.tsx components/clients/config/ClientsConfigChannelsSummary.tsx app/admin/clientes/actions.ts`
3. `npx tsx --test tests/clients.config-registry.test.ts tests/clients.contact-directories.test.ts tests/clients.company-profile.test.ts`

## Paso 1 — Resumen
1. Abrir `/admin/clientes/configuracion` (default `Resumen`).
2. Confirmar toolbar compacto (inputs/selects h-10) y autoguía en layout 50/50 con filtros.
3. Hacer scroll dentro de la tabla y validar encabezados sticky visibles.
4. Probar botón `Abrir` (drawer abre/cierra con ESC).
5. Probar menú `...` en Acción y validar `Marcar deprecado/Rehabilitar` con guardrails.

PASS si:
- header de tabla no se pierde en scroll,
- filtros no se desbordan en md/lg,
- acciones secundarias están en menú compacto.

## Paso 2 — Directorios
1. Abrir `?section=directorios`.
2. Verificar cards con micro-autoguía:
   - Qué es
   - Se usa en
   - Scope badge
3. Validar conteos activos/inactivos visibles.
4. Abrir `Administrar` en cada card y validar drawer correcto.

PASS si:
- un usuario nuevo entiende cada directorio sin abrir tablas,
- no existe scroll largo por render masivo.

## Paso 3 — Canales y comercial
1. Abrir `?section=canales`.
2. Confirmar layout en cards (ya no scroll largo de managers).
3. Verificar descripción por card (propósito comercial) y `Administrar` abre drawer.
4. Revisar cards legacy visibles solo si no están deprecadas.

PASS si:
- navegación es por bloques claros,
- cada manager se abre en drawer bajo demanda.

## Paso 4 — Validación por país (Geo)
1. Abrir `?section=validaciones`.
2. Confirmar 2 cards de acceso (geografía + documentos/validaciones).
3. Abrir geografía y validar picker de país con buscador + banderas.
4. Buscar por nombre e ISO; si hay prefijo disponible, validar que también filtra.
5. Confirmar glosario Admin1/Admin2/Admin3 visible y compacto.

PASS si:
- selector país es consistente con sistema,
- usuario entiende niveles administrativos sin ayuda externa.

## Mejora opcional 1 — Persistencia UI por usuario
1. Abrir `Resumen`, cambiar filtros (sección/scope/estado/uso + query).
2. Cambiar de tab, recargar browser y volver a `Resumen`.
3. Validar que filtros y query se restauran.
4. En `Catálogos`, cambiar a `modo grid`, seleccionar otro catálogo, recargar.
5. Validar que `modo grid/foco` y catálogo seleccionado se restauran.
6. Cambiar tab activa, entrar a `/admin/clientes/configuracion` sin query `section`.
7. Validar redirección automática a la última tab usada para ese usuario.

PASS si:
- persisten tab activa, filtros de Resumen y vista focus/grid por usuario.

## Mejora opcional 2 — Indicador global fallback en Resumen
1. Ir a `Resumen` y localizar badge `N items en fallback`.
2. Clic en `Filtrar fallback`.
3. Validar que la tabla queda filtrada a estados `fallback/defaults`.
4. Clic en `Limpiar filtro`.
5. Validar retorno al estado de filtro general.

PASS si:
- el indicador muestra conteo,
- el botón aplica filtro inmediato en la tabla.

## Mejora opcional 3 — Atajo Cmd/Ctrl+K
1. En `Resumen`, presionar `Cmd+K` (macOS) o `Ctrl+K` (Windows/Linux).
2. Validar apertura de buscador global del registry.
3. Buscar por `label`, `key` o `sección`.
4. Navegar con flechas y presionar `Enter`.
5. Validar que abre el manager correspondiente en drawer.
6. Presionar `Esc` para cerrar.

PASS si:
- shortcut funciona sin romper inputs,
- selección abre manager correcto.

## Mejora opcional 4 — Empty states con CTA
1. En un tenant sin seeds, abrir `Catálogos`, `Directorios` y `Canales`.
2. Verificar que cards vacías muestren:
   - mensaje de impacto,
   - botón `Cargar iniciales` (cuando aplica).
3. Clic en `Cargar iniciales` para una card vacía.
4. Validar mensaje de resultado (`nuevas/reactivadas`) y refresco de conteos.
5. Abrir manager de esa card y confirmar que ya hay opciones cargadas.

PASS si:
- no hay empty state silencioso,
- CTA carga datos iniciales sin salir de configuración.

## Casos legacy y tenant sin seeds
1. Tenant con datos legacy inactivos:
   - ejecutar `Cargar iniciales` y validar reactivación sin borrar históricos.
2. Tenant sin ningún catálogo/directorio:
   - validar que todas las cards vacías muestren CTA visible.
3. Tabs sin query `section`:
   - validar fallback a preferencia local del usuario actual.
4. Datos de fallback activos en Resumen:
   - validar quick-filter operativo y conteo coherente.

## Evidencia esperada
- Captura Resumen con badge fallback + toolbar compacto.
- Captura Command Palette (`Cmd/Ctrl+K`) abierta.
- Captura Catálogos/Directorios/Canales con empty state + CTA.
- Captura de restauración de tab/filtros después de recarga.
