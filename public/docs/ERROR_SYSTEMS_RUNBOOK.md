# ERROR SYSTEMS Runbook

Guía operativa para eventos de `ERROR SYSTEMS` (Clientes/Recepción/Portales/Ops/Medical).

## scope
- Esta guía aplica a eventos operativos (`schema`, `fallback`, `action errors` controlados).
- No incluye logs de render/debug ni PII.

## schema-required-missing-table
### Objetivo
Recuperar una dependencia de esquema requerida (evento `P2021` + `REQUIRED`).

### Pasos
1. Ejecutar `pnpm db:migrate:status`.
2. Si hay pendientes, ejecutar `pnpm db:migrate:deploy`.
3. Regenerar cliente Prisma con `pnpm db:generate`.
4. Validar `schema-health` en Configuración.
5. Reintentar la operación de negocio.

## schema-optional-fallback
### Objetivo
Salir de fallback opcional (`P2021` + `OPTIONAL`).

### Pasos
1. Revisar tabla opcional faltante en `ERROR SYSTEMS`.
2. Cargar iniciales desde Configuración cuando aplique.
3. Aplicar migraciones y validar source `db`.

## schema-legacy-mismatch
### Objetivo
Corregir desfase legacy (`P2022` o evento legacy).

### Pasos
1. Confirmar migraciones pendientes.
2. Aplicar `pnpm db:migrate:deploy`.
3. Ejecutar `pnpm db:generate`.
4. Validar desaparición de eventos legacy.

## schema-health-required
### Objetivo
Resolver faltantes requeridos detectados por `schema-health`.

### Pasos
1. Abrir detalle de schema-health.
2. Priorizar tablas marcadas como `requiredMissing`.
3. Completar migración/bootstrapping.

## schema-health-optional
### Objetivo
Resolver faltantes opcionales detectados por `schema-health`.

### Pasos
1. Revisar `optionalMissing` por dominio.
2. Planificar migración compatible y seed de catálogos/directorios.
3. Confirmar transición de `Legacy` a `OK`.

## clients-action-controlled-error
### Objetivo
Corregir error controlado en acciones de Clientes.

### Pasos
1. Revisar `resource` (acción específica) en el evento.
2. Ejecutar migraciones/seed de dependencia faltante.
3. Reprobar la acción en UI.
4. Marcar digest como resuelto con nota.

## prisma-required-blocked
### Objetivo
Desbloquear evento `PRISMA_SCHEMA_REQUIRED_BLOCKED`.

### Pasos
1. Verificar tabla requerida faltante.
2. Corregir schema en entorno objetivo.
3. Revalidar operación bloqueada.

## prisma-fallback-optional
### Objetivo
Eliminar `PRISMA_SCHEMA_FALLBACK_OPTIONAL`.

### Pasos
1. Identificar dependencia opcional.
2. Aplicar migration/seed.
3. Verificar reducción de eventos fallback.

## generic-review
### Objetivo
Revisión estándar cuando no hay match específico.

### Pasos
1. Ver `code`, `eventType`, `resource`, `digest`.
2. Validar permisos, tenant y contexto de ejecución.
3. Reintentar flujo y confirmar estabilidad.
