# PR-02 Scope Models (tenantId + deletedAt + branchId)

## Objetivo
Definir alcance real multi-tenant para inventario en Prisma y endpoints API, con filtros obligatorios por `tenantId` y `deletedAt = null`.

## Clasificación de modelos de inventario

### A) Core catálogo
- `ProductCategory`
- `ProductSubcategory`
- `ServiceCategory`
- `ServiceSubcategory`
- `InventoryArea`
- `Product`
- `Service`
- `Combo`
- `ComboService`
- `ComboProduct`
- `PriceList`
- `PriceListItem`

### B) Operación y auxiliares
- `ProductStock`
- `InventoryMovement`
- `PurchaseRequest`
- `PurchaseRequestItem`
- `PurchaseOrder`
- `PurchaseOrderItem`
- `InventoryEmailSetting`
- `InventoryEmailSchedule`
- `InventoryEmailScheduleLog`
- `InventoryMarginPolicy`
- `InventoryReportLog`

## Plan de campos por modelo

### Regla general
- `tenantId`: obligatorio en todos los modelos listados arriba.
- `deletedAt`: agregado en todos los modelos listados arriba para permitir filtro consistente (`deletedAt: null`) y soft-delete progresivo.
- `branchId`: solo en modelos donde ya existe o donde la operación es por sucursal (existencias/movimientos/órdenes/solicitudes/schedules).

### Core catálogo
- `ProductCategory`: `tenantId`, `deletedAt`
- `ProductSubcategory`: `tenantId`, `deletedAt`
- `ServiceCategory`: `tenantId`, `deletedAt`
- `ServiceSubcategory`: `tenantId`, `deletedAt`
- `InventoryArea`: `tenantId`, `deletedAt`
- `Product`: `tenantId`, `deletedAt`
- `Service`: `tenantId`, `deletedAt`
- `Combo`: `tenantId`, `deletedAt`
- `ComboService`: `tenantId`, `deletedAt`
- `ComboProduct`: `tenantId`, `deletedAt`
- `PriceList`: `tenantId`, `deletedAt`
- `PriceListItem`: `tenantId`, `deletedAt`

### Operación y auxiliares
- `ProductStock`: `tenantId`, `deletedAt`, `branchId` (ya existe)
- `InventoryMovement`: `tenantId`, `deletedAt`, `branchId` (ya existe)
- `PurchaseRequest`: `tenantId`, `deletedAt`, `branchId` (ya existe)
- `PurchaseRequestItem`: `tenantId`, `deletedAt`
- `PurchaseOrder`: `tenantId`, `deletedAt`, `branchId` (ya existe)
- `PurchaseOrderItem`: `tenantId`, `deletedAt`
- `InventoryEmailSetting`: `tenantId`, `deletedAt`, `branchId` (ya existe, nullable)
- `InventoryEmailSchedule`: `tenantId`, `deletedAt`, `branchId` (ya existe, nullable)
- `InventoryEmailScheduleLog`: `tenantId`, `deletedAt`
- `InventoryMarginPolicy`: `tenantId`, `deletedAt`
- `InventoryReportLog`: `tenantId`, `deletedAt`

## Estrategia de migración/backfill
1. Agregar columnas nuevas.
2. Backfill de `tenantId` para filas existentes con `DEFAULT_TENANT_ID` y fallback `'global'`.
3. `deletedAt` se mantiene `NULL` por defecto.
4. Índices por modelo para consultas de listados y filtros:
- `(tenantId, deletedAt)`
- `(tenantId, status, deletedAt)` o `(tenantId, isEnabled, deletedAt)` según aplique
- `(tenantId, updatedAt)` o `(tenantId, createdAt)` donde aplique.

## Nota branch scope
`branchId` se aplicará en filtros reales cuando el endpoint sea de existencias/movimientos/órdenes/solicitudes/reportes por sucursal.
En catálogos globales de inventario no se forzará `branchId`.
