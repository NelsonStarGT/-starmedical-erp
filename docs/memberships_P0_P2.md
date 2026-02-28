# Membresías P0-P2

As-of date: 2026-02-28

## Alcance implementado

### P0 - Catálogos + Plan Builder
- Configuración por pestañas en `/admin/membresias/configuracion`:
  - `Catálogos` (categorías B2C/B2B)
  - `Duraciones` (presets)
  - `Servicios incluidos` (beneficios)
  - `Pasarela de pagos` (UI real admin-only)
  - `Permisos / Visibilidad`
- Nuevos modelos Prisma:
  - `MembershipDurationPreset`
  - `MembershipBenefitCatalog`
  - `MembershipPlanBenefit`
- Builder de planes:
  - categoría, segmento, duración preset/custom, beneficios, imageUrl
- Regla RBAC de precio:
  - `MEMBERSHIPS:PRICING:VIEW` controla visibilidad de precio en UI

### P1 - Afiliaciones + operación
- UX label: `Afiliaciones` (sin romper rutas `/contracts`).
- Estados operativos con `PENDIENTE_PAGO`.
- Filtros de listado:
  - estado, plan, búsqueda, paymentMethod, ventana de renovación, branchId.
- Acciones rápidas:
  - afiliar, renovar, cambiar estado, registrar pago, ir a facturación.
- Lógica de pago manual:
  - renovación no pagada deja contrato en `PENDIENTE_PAGO`.
  - registrar pago no reactiva `SUSPENDIDO`/`CANCELADO`.

### P2 - Recurrente + webhooks + auto-factura
- Configuración pasarela (admin-only):
  - provider, mode, apiKey, webhookSecret, isEnabled.
  - botón `Probar conexión`.
  - indicador `lastWebhookAt`.
- Modelos nuevos Prisma:
  - `MembershipGatewayConfig`
  - `MembershipContractBillingProfile`
  - `MembershipWebhookEvent`
  - enum `MembershipBillingProvider`.
- Endpoint checkout recurrente:
  - `POST /api/memberships/contracts/[id]/recurrente/checkout`
- Webhook:
  - `POST /api/webhooks/recurrente`
  - validación token/HMAC
  - idempotencia por `eventId`
  - mapeo de eventos a estado de contrato y billing profile
- Auto-factura:
  - en `payment_intent.succeeded` crea borrador en finanzas (receivable) cuando existe `partyId`.
  - actualiza `lastInvoiceId` en contrato cuando aplica.

## Seguridad y guardrails
- Sin side-effects en `GET /api/memberships/contracts`.
- Legacy wrappers en `/api/membresias/*` reexportean canónico.
- No se almacena información de tarjeta en ERP.
- Cobranza se deriva a Facturación/Finanzas mediante deep-link o draft.

## Migraciones
- `20260228170000_memberships_p0_catalog_builder`
- `20260228173000_memberships_p1_afiliaciones_state`
- `20260721120000_memberships_p2_recurrente_gateway`

## Tests mínimos
- Paridad canónico/legacy (incluye rutas P2 nuevas).
- Suite DB legacy:
  - categoría/plan/dashboard
  - guard de estados en pagos
  - subscribe público idempotente
  - webhook idempotente

## Limitaciones abiertas
- Si no existe infraestructura de invoice fiscal externa, se usa draft/receivable interno.
- `tax_invoice_url` de proveedor externo no se sincroniza aún.
- El flujo de wizard de alta de afiliación sigue en MVP (`ownerId` manual).
