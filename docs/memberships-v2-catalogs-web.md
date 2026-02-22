# Membresías v2 (Catálogos + KPIs + Web-ready)

As-of date: 2026-02-22

## Alcance implementado
- Módulo Admin en source:
  - `/admin/membresias`
  - `/admin/membresias/contratos/pacientes`
  - `/admin/membresias/contratos/empresas`
  - `/admin/membresias/planes`
  - `/admin/membresias/renovaciones`
  - `/admin/membresias/impresion`
  - `/admin/membresias/configuracion`
- API canónica:
  - `/api/memberships/dashboard`
  - `/api/memberships/plans` + `/[id]` + `/[id]/status`
  - `/api/memberships/contracts` + `/[id]` + `/[id]/status` + `/[id]/payment`
  - `/api/memberships/config`
  - `/api/memberships/plan-categories` + `/[id]` + `/[id]/status`
- Wrappers legacy por reexport:
  - `/api/membresias/*`
  - `/api/membresias/catalogos/tipos-plan/*`
- Endpoint público web-ready:
  - `POST /api/public/memberships/subscribe`

## Reglas aplicadas
- Cobranza NO vive en Membresías.
- `Generar factura` usa deep-link hacia facturación/finanzas.
- GET de listados sin side-effects.
- Registro de pago no reactiva automáticamente contratos `SUSPENDIDO`/`CANCELADO`.

## Cambios de modelo (Prisma)
- `MembershipPlan.id`, `MembershipContract.id`, `MembershipPayment.id` con `@default(cuid())`.
- Nuevo enum `MembershipPlanSegment` (`B2C`, `B2B`).
- Nuevo modelo `MembershipPlanCategory`.
- `MembershipPlan`: `segment`, `categoryId`, `imageUrl`.
- `MembershipContract`: `lastInvoiceId`.
- Nuevo modelo `MembershipPublicSubscriptionRequest` para idempotency y trazabilidad web.

## Configuración de categorías
- En Configuración > Catálogo de categorías se puede:
  - Crear categoría por segmento.
  - Editar nombre y orden.
  - Activar/desactivar.

## Dashboard v2
- KPI removido: saldo pendiente informativo.
- KPIs activos:
  - Planes activos
  - Contratos activos
  - Renovaciones 7/15/30
  - Contratos en riesgo
  - MRR estimado total
  - B2C/B2B activos + MRR por segmento
- Tabla: KPIs por categoría (activos, renovaciones 30d, MRR).

## Planes v2
- Editor de plan con:
  - Segmento B2C/B2B
  - Categoría por segmento (solo activas)
  - `imageUrl` + preview
- Tabla muestra miniatura, categoría, segmento.

## Public subscribe (skeleton)
- `POST /api/public/memberships/subscribe`
- Seguridad:
  - `x-memberships-public-token` o HMAC (`x-memberships-signature` + `x-memberships-timestamp`)
- `idempotencyKey` obligatorio.
- Flujo:
  - Resolve/upsert cliente
  - Crea `MembershipContract` en `PENDIENTE`
  - Intenta crear borrador financiero (`Receivable OPEN`) y vincula `lastInvoiceId`
  - Responde `{ contractId, invoiceId, nextStepUrl }`

## Limitaciones conocidas / TODO seguro
- Alta de contrato en UI es MVP (ownerId manual). Pendiente wizard de búsqueda avanzada.
- Upload de imagen de plan: MVP URL directa; pendiente endpoint de subida dedicado.
- El borrador de factura usa `Receivable` financiero (no existe entidad dedicated invoice draft en este módulo).
