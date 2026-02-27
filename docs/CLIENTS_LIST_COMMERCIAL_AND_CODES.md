# Clientes: Vista Comercial + Correlativo Automático

## Alcance
- Nueva vista en `/admin/clientes/lista` con toggle:
  - `Operativa`
  - `Comercial`
- Correlativo automático por tipo de cliente, tenant-scoped:
  - Persona: `C###`
  - Empresa: `E###`
  - Institución: `I###`
  - Aseguradora: `A###`

## Cambios de datos
- `ClientProfile`
  - `tenantId` (default `global`)
  - `clientCode` (nullable)
  - unique compuesto `(tenantId, clientCode)`
- `ClientSequenceCounter`
  - `tenantId`
  - `clientType`
  - `prefix`
  - `nextNumber`
  - unique `(tenantId, clientType)`

## Flujo de correlativo
- En creación de cliente (persona/empresa/institución/aseguradora), dentro de transacción:
  1. Reserva correlativo en `ClientSequenceCounter` (incremento atómico).
  2. Asigna `clientCode` al `ClientProfile`.

## Backfill
- Script: `scripts/backfill-client-codes.ts`
- Comando:
  - `pnpm backfill:client-codes`
- Comportamiento:
  - Recorre clientes sin `clientCode` por `tenantId + tipo`.
  - Asigna códigos por orden `createdAt` ascendente.
  - Ajusta `ClientSequenceCounter.nextNumber` al siguiente valor disponible.

## Verificación rápida
1. Ejecutar migraciones:
   - `pnpm db:migrate:deploy`
2. Correr backfill:
   - `pnpm backfill:client-codes`
3. Crear cliente nuevo por tipo y validar códigos `C/E/I/A` incrementales.
4. Revisar `/admin/clientes/lista` (Operativa/Comercial) y búsqueda por correlativo.
