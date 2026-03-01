# Recurrente integration (Suscripciones)

As-of date: 2026-02-28

## Endpoints canónicos
- `GET/PATCH /api/subscriptions/recurrente/config`
- `POST /api/subscriptions/recurrente/config/test`
- `POST /api/subscriptions/recurrente/checkout`
- `POST /api/subscriptions/webhooks/recurrente`

## Seguridad
- Nunca se almacenan datos de tarjeta en el ERP.
- El webhook valida token/firma (HMAC) en backend.
- Idempotencia por `eventId` en `MembershipWebhookEvent`.

## Variables esperadas
- `RECURRENTE_WEBHOOK_TOKEN`
- `RECURRENTE_WEBHOOK_SECRET`
- `RECURRENTE_CHECKOUT_BASE_URL`

## Mapeo de eventos
- `payment_intent.succeeded`:
  - registra pago
  - activa/renueva contrato
  - intenta generar cobro en finanzas/facturación y asocia `lastInvoiceId`
- `payment_intent.failed` / `subscription.past_due`:
  - estado de cobro `PAST_DUE`
- `subscription.cancel`:
  - cambia contrato a estado cancelado/suspendido según regla de servicio
