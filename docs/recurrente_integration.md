# Integración Recurrente (Membresías)

As-of date: 2026-02-28

## Variables de entorno
- `RECURRENTE_CHECKOUT_BASE_URL`: URL base de checkout hosted.
- `RECURRENTE_WEBHOOK_TOKEN`: token estático alternativo para webhook.
- `RECURRENTE_WEBHOOK_SECRET`: secret HMAC para firma webhook.

Opcional para subscribe público:
- `MEMBERSHIPS_PUBLIC_TOKEN`
- `MEMBERSHIPS_PUBLIC_HMAC_SECRET`

## Endpoints

### 1) Iniciar checkout recurrente
`POST /api/memberships/contracts/{id}/recurrente/checkout`

Permiso requerido:
- `MEMBERSHIPS:PAYMENTS:ADMIN`

Body:
```json
{
  "returnUrl": "https://erp.local/admin/membresias/contratos/pacientes",
  "cancelUrl": "https://erp.local/admin/membresias/contratos/pacientes"
}
```

Respuesta:
```json
{
  "data": {
    "contractId": "...",
    "provider": "RECURRENT",
    "checkoutUrl": "https://...",
    "billingProfileId": "..."
  }
}
```

### 2) Webhook recurrente
`POST /api/webhooks/recurrente`

Autenticación:
- token en `x-webhook-token`, o
- firma HMAC en `x-recurrente-signature`.

Eventos manejados:
- `payment_intent.succeeded`
- `payment_intent.failed`
- `subscription.past_due`
- `subscription.cancel`

## Idempotencia
- `eventId` se persiste en `MembershipWebhookEvent.eventId` (unique).
- Reintentos del mismo evento devuelven estado idempotente sin duplicar pagos.

## Mapeo de estado
- `payment_intent.succeeded`:
  - registra pago
  - activa contrato
  - avanza `nextRenewAt`
  - crea draft financiero cuando posible
- `payment_intent.failed` y `subscription.past_due`:
  - `PENDIENTE_PAGO`
  - billing status `PAST_DUE`
- `subscription.cancel`:
  - contrato `CANCELADO`
  - billing status `CANCELLED`

## Consideraciones
- No se persisten PAN/CVV ni datos sensibles de tarjeta.
- El ERP guarda IDs de referencia del proveedor (customer/subscription/payment intent).
- Si falta entidad financiera activa (`LegalEntity`), el webhook procesa estado pero omite creación de receivable.
