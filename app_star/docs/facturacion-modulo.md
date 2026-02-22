# Módulo de Facturación · StarMedical ERP

## Objetivo
Facturación opera expedientes de cobro clínico multi-pagador y multi-servicio.
No reemplaza Finanzas: sólo clasifica, liquida y documenta el cobro para después publicar cuentas por cobrar.

## Alcance operativo
- Bandejas: pendientes de cobro, en proceso, cobro parcial, crédito, pendiente autorización, anulaciones/NC, documentos por emitir.
- Expediente de cobro: paciente/entidad, episodio, items, pagadores/split, pagos, documentos y auditoría.
- Flujos: cobro inmediato, crédito empresarial/aseguradora, pagos parciales, anticipos, emisión/anulación documental.

## Estados del expediente
1. `PREPARACION`
2. `PENDIENTE_AUTORIZACION`
3. `PENDIENTE_COBRO`
4. `EN_PROCESO`
5. `COBRO_PARCIAL`
6. `CREDITO_ABIERTO`
7. `PAGADO_PEND_DOC`
8. `CERRADO_FACTURADO`
9. `AJUSTADO_NC`
10. `ANULADO`

Transiciones en `lib/billing/workflow.ts`.

## Estructura técnica
- Dominio: `lib/billing/types.ts`, `lib/billing/workflow.ts`
- Datos de ejemplo y catálogos: `lib/billing/mock.ts`
- Servicios para UI: `lib/billing/service.ts`
- Parseo de filtros/query: `lib/billing/query.ts`
- Formato: `lib/billing/format.ts`

## UI del módulo
- Layout y tabs: `app/admin/facturacion/layout.tsx`
- Dashboard: `app/admin/facturacion/page.tsx`
- Bandejas: `app/admin/facturacion/bandeja/[trayId]/page.tsx`
- Expediente: `app/admin/facturacion/expedientes/[id]/page.tsx`
- Documentos: `app/admin/facturacion/documentos/page.tsx`
- Caja: `app/admin/facturacion/caja/page.tsx`

## Componentes UX operativos
- `components/facturacion/BillingControlStrip.tsx`: strip de control (listos, urgentes, lock, parciales, docs).
- `components/facturacion/PriorityChip.tsx`: prioridad operativa por expediente.
- `components/facturacion/LockedByUserIndicator.tsx`: lock por usuario + edad del lock.
- `components/facturacion/MoneyPill.tsx`: cápsulas de total/pagado/saldo.
- `components/facturacion/BillingSummaryCard.tsx`: resumen financiero reusable.
- `components/facturacion/QuickPayPanel.tsx`: acción rápida de cobro/abono/crédito/emisión con validaciones UX.
- `components/facturacion/BillingCaseTable.tsx`: tabla “torre de control” con acciones inline.

## Diseño de marca aplicado
- Primary `#4aa59c`
- Secondary `#4aadf5`
- Corporate Blue `#2e75ba`
- Fondo blanco / slate claro, componentes con `rounded-xl` + `shadow-sm`
- Tipografía de módulo: Montserrat (títulos), Inter (cuerpo)

## Nota de integración
Cuando se conecte a backend real, reemplazar `billingCasesMock` por repositorios Prisma y emitir eventos de AR hacia Finanzas sin acoplar contabilidad dentro de Facturación.

## API de acciones rápidas
- Endpoint: `POST /api/facturacion/expedientes/[id]/quick-action`
- Acciones: `COBRAR`, `ABONO`, `CREDITO`, `EMITIR_DOC`
- Persistencia: actualiza/mantiene `Receivable`, registra `Payment` y `FinancialTransaction` para cobros/abonos, y escribe auditoría en `AuditLog`.
- Seguridad:
  - Usuario autenticado requerido.
  - Control por rol real (`SUPER_ADMIN`, `ADMIN`, `SUPERVISOR`, `RECEPTION`, `FINANCE`) para operar.
  - Acciones supervisoras validadas con RBAC para casos marcados como sensibles.
