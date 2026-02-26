# CLIENTS CONFIG QA (Walkthrough Funcional + Checklist Manual)

## 1) Objetivo
Validar funcional y operativamente el rediseño de `/admin/clientes/configuracion` con foco en:
- legibilidad (Resumen como vista principal),
- administración enfocada por catálogo/directorio (sin saturación visual),
- visibilidad de fallback,
- deprecación segura de catálogos no usados.

## 2) Alcance
Pestañas incluidas en esta guía:
- Resumen
- Catálogos
- Directorios
- Validaciones
- Deprecación (flujo transversal desde Resumen)

Fuera de alcance:
- cambios de lógica de negocio en creación de clientes,
- migraciones destructivas de base de datos.

## 3) Prerrequisitos
- Usuario con permisos de administración en Clientes Configuración.
- Tenant de pruebas disponible.
- Ambiente local o QA con acceso a `/admin/clientes/configuracion`.
- Datos mínimos en catálogos/directorios (o tenant limpio para validar fallback).

## 4) Comandos de verificación (técnicos)
Ejecutar en `/Users/nelsonsebastianlopez/Documents/STARMEDICAL/app_star`:

1. Levantar app: `npm run dev`
2. Typecheck clientes: `npm run typecheck:clients`
3. Lint de módulos tocados:  
`npx eslint app/admin/clientes/configuracion/page.tsx app/admin/clientes/actions.ts components/clients/config/ClientContactDirectoriesManager.tsx components/clients/config/ClientsConfigCatalogFocus.tsx components/clients/config/ClientsConfigDirectoriesSummary.tsx components/clients/config/ClientsConfigManagerDrawer.tsx components/clients/config/ClientsConfigManagerRenderer.tsx components/clients/config/ClientsConfigOverview.tsx components/clients/config/GeoCatalogManager.tsx lib/clients/clientsConfigRegistry.ts`
4. Suite QA clientes (reglas + registry + directorios):  
`npx tsx --test tests/clients.config-registry.test.ts tests/clients.contact-directories.test.ts tests/clients.company-profile.test.ts`

Resultado esperado:
- todos los comandos finalizan sin error.

## 5) Walkthrough funcional por pestaña

## 5.1 Resumen (default)
Pasos:
1. Abrir `/admin/clientes/configuracion` sin query params.
2. Verificar que la pestaña activa por defecto sea `Resumen`.
3. Confirmar tabla maestra con columnas:
   Nombre, Sección, Scope, Usado en, Estado, Items (act/inact), Dependencias, Acción.
4. Probar filtros:
   búsqueda global, Sección, Scope, Estado, Uso.
5. Seleccionar una fila y usar `Abrir`.
6. Confirmar apertura de Drawer lateral con el manager correcto.

Resultado esperado:
- carga rápida inicial y lectura clara.
- filtros afectan filas sin recargar página completa.
- Drawer abre/cierra con Escape y botón `Cerrar`.

Captura esperada (descripción):
- pantalla con tab `Resumen` activo, filtros visibles arriba, tabla con badges `db/fallback`, y botón `Abrir` por fila.

## 5.2 Catálogos
Pasos:
1. Ir a `/admin/clientes/configuracion?section=catalogos`.
2. Confirmar que no se renderizan todas las tablas a la vez.
3. Verificar combobox `Selecciona catálogo`.
4. Seleccionar distintos catálogos y validar que solo se renderiza 1 manager en modo foco.
5. Activar/desactivar `Ver modo grid`.

Resultado esperado:
- vista por defecto en modo foco.
- modo grid opcional muestra múltiples managers solo al activarlo.
- badges de source e items visibles por manager.

Captura esperada (descripción):
- selector de catálogo en cabecera y un único manager debajo.

## 5.3 Directorios
Pasos:
1. Ir a `/admin/clientes/configuracion?section=directorios`.
2. Verificar autoguía en header.
3. Confirmar cards resumidas:
   Áreas, Cargos, Categorías PBX, Correlación.
4. Presionar `Administrar` en cada card.
5. Confirmar apertura en Drawer del manager correspondiente.
6. Si source está en fallback, verificar banner/CTA visible (`Cargar iniciales`).

Resultado esperado:
- vista resumida por defecto (no saturada).
- acceso puntual por drawer a cada administración.
- fallback siempre visible, nunca silencioso.

Captura esperada (descripción):
- grid de cards con conteos y badge de source; drawer abierto en una card.

## 5.4 Validaciones (Geo)
Pasos:
1. Ir a `/admin/clientes/configuracion?section=validaciones`.
2. Confirmar flujo country-first:
   selector de país en parte superior.
3. Verificar toggle `Auditoría mundial`.
4. Con toggle apagado, validar foco en país seleccionado.
5. Con toggle encendido, validar visualización amplia de tabla global.

Resultado esperado:
- experiencia orientada por país primero.
- auditoría global opcional, no predeterminada en country-first.

Captura esperada (descripción):
- selector de país visible arriba y toggle `Auditoría mundial`.

## 5.5 Deprecación (desde Resumen)
Pasos:
1. Volver a `Resumen`.
2. Filtrar `Uso = Sin uso`.
3. Elegir entrada deprecable y presionar `Marcar deprecado`.
4. Confirmar badge `Deprecado` en la fila.
5. Navegar a su sección y validar que no aparece por defecto.
6. Regresar a Resumen y usar `Rehabilitar`.
7. Confirmar reaparición en su sección.

Resultado esperado:
- solo permite deprecar entradas `canDeprecate=true` y sin uso.
- no elimina datos en DB.
- se conserva trazabilidad en auditoría.

Captura esperada (descripción):
- fila con badge `Deprecado` y botones `Abrir` + `Rehabilitar`.

## 6) Checklist QA manual (aceptación)
Marcar cada punto como PASS/FAIL:

1. Resumen carga por defecto al entrar sin query.
2. Master table muestra todas las columnas esperadas.
3. Filtros de Resumen funcionan combinados.
4. Acción `Abrir` abre manager correcto en Drawer.
5. Catálogos inicia en modo foco (solo 1 tabla).
6. Catálogos permite alternar a modo grid.
7. Directorios muestra cards resumidas y botón `Administrar`.
8. Directorios usa drawer en lugar de render masivo.
9. Si hay fallback en directorios, banner/CTA es visible.
10. Validaciones opera en country-first y toggle mundial funcional.
11. Deprecación solo habilitada para entradas sin uso.
12. Entrada deprecada se oculta de tabs/secciones por defecto.
13. Rehabilitar revierte ocultamiento sin pérdida de datos.
14. No se observan errores de permisos para admin válido.
15. UI mantiene consistencia visual (rounded-xl, h-11, focus teal).

## 7) Casos legacy (regresión controlada)
Objetivo: asegurar compatibilidad sin romper operación previa.

Caso L1: claves legacy en channels/catálogos
1. En Resumen, identificar entradas legacy (scope `legacy`).
2. Validar que solo se puedan deprecar si `usedBy` está vacío.
3. Confirmar ocultamiento al deprecar y recuperación al rehabilitar.

Resultado esperado:
- comportamiento deprecable controlado por metadata, no por borrado físico.

Caso L2: estado deprecado guardado en cookie previa
1. Refrescar sesión y volver a Resumen.
2. Confirmar que estado deprecado permanece.

Resultado esperado:
- persistencia del estado deprecado por cookie de configuración.

Caso L3: entradas inactivas históricas en directorios
1. Abrir directorio con ítems activos/inactivos.
2. Verificar conteos y posibilidad de reactivar.

Resultado esperado:
- no se pierde histórico; se controla por `isActive`.

## 8) Caso tenant sin seeds (fallback controlado)
Objetivo: validar experiencia de tenant nuevo sin carga inicial.

Pasos:
1. Ingresar con tenant sin directorios/catálogos sembrados.
2. Ir a Directorios y confirmar `source=fallback`.
3. Verificar mensaje visible de fallback y CTA `Cargar iniciales`.
4. Ejecutar CTA en Áreas, Cargos y PBX.
5. Refrescar sección.

Resultado esperado:
- source cambia de fallback a db (cuando aplica),
- conteos se actualizan,
- no hay errores por catálogos vacíos.

Captura esperada (descripción):
- card/directorio mostrando fallback + CTA antes, y source db después de carga.

## 9) Evidencia recomendada para cierre QA
Guardar evidencia mínima:
1. Captura de Resumen con filtros aplicados.
2. Captura de Drawer abierto desde Resumen.
3. Captura de Catálogos en modo foco y en modo grid.
4. Captura de Directorios cards + drawer.
5. Captura de Validaciones country-first.
6. Captura de flujo Deprecar/Rehabilitar.
7. Log de comandos ejecutados (typecheck/lint/tests).

## 10) Criterio de salida (Go/No-Go)
Go:
- Checklist completo en PASS.
- Casos legacy PASS.
- Caso tenant sin seeds PASS.
- Comandos técnicos sin error.

No-Go:
- fallback silencioso,
- deprecación de entradas en uso,
- managers incorrectos al abrir desde Resumen,
- errores de permisos o ruptura de navegación.
