# Plan de Cierre – Módulo Finanzas (StarMedical ERP)

> Alcance: operación básica sin nuevas features. Basado en código actual (UI `app/admin/finanzas`, APIs `app/api/finanzas/*`, Prisma schema).

---

## Flujo A – Registro contable manual (Journal Entries)
**Propósito:** Permitir asientos contables manuales con débitos/créditos balanceados y listarlos.  
**Roles:** `FINANCE:*` / `ACCOUNTING:*` (inferido de endpoints finanzas).  
**UI:** `/admin/finanzas` (única vista principal; aún sin subpáginas visibles).  
**APIs involucradas:**  
- `POST/GET /api/finanzas/journal-entries`  
- `GET /api/finanzas/journal-entries/[id]`  
- `POST /api/finanzas/journal-entries/[id]/post` (publicar)  
- `POST /api/finanzas/journal-entries/[id]/reverse` (reversar)
**Tablas Prisma:** `JournalEntry`, `JournalEntryLine`, `FinancialAccount`, `FinanceCategory/Subcategory`, `LegalEntity` (para entidad contable).  
**Campos críticos:** fecha, referencia, `debit`, `credit`, `accountId`, `legalEntityId`, estado (`posted`/`draft`).  
**Qué falta para considerarlo “cerrado”:**  
- UI dedicada para crear/editar asientos (hoy la vista es general).  
- Validación de balance (sum(debit)=sum(credit)) en UI y en endpoint (revisar si el endpoint ya valida).  
- Listado con filtros por fecha, entidad legal y estado.  
- Feedback de error visible en UI al postear/reversar.  
**Riesgos:** errores de balance si la validación solo vive en frontend; falta de vista para revisar líneas antes de postear.

---

## Flujo B – Facturación → Cobro → Impacto financiero
**Propósito:** Registrar factura, registrar pago y reflejar en contabilidad/summary.  
**Roles:** `FINANCE:*`, `AR:*` (cuentas por cobrar).  
**UI:** `/admin/finanzas` (sin subruta específica de facturación en el App Router actual).  
**APIs involucradas (existentes):**  
- `POST/GET /api/finanzas/receivables` (cuentas por cobrar)  
- `POST/GET /api/finanzas/payments` (pagos)  
- `POST/GET /api/finanzas/transactions` (movimientos)  
- `POST/GET /api/finanzas/summary` (resumen)  
- `POST /api/finanzas/journal-entries` (si se genera asiento)  
