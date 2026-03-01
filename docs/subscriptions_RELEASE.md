# Suscripciones — Release Runbook

As-of date: 2026-02-28

## 1) Deploy backend/runtime
1. `npx prisma migrate deploy`
2. `npx prisma generate`
3. Seed mínimo de Suscripciones (idempotente):
   - `npx tsx scripts/subscriptions/seed-minimum.ts`

Expected seed output:
- `categories=5`
- `durations=5`
- `benefits=4`

## 2) Variables de entorno Recurrente
Definir en entorno server (no cliente):
- `RECURRENTE_CHECKOUT_BASE_URL`
- `RECURRENTE_WEBHOOK_TOKEN`
- `RECURRENTE_WEBHOOK_SECRET`

Opcional relacionado:
- `MEMBERSHIPS_PUBLIC_TOKEN` (endpoint público de suscripción web)

## 3) Webhook Recurrente
- Canonical URL: `/api/subscriptions/webhooks/recurrente`
- Compat URL: `/api/webhooks/recurrente`

Validación de seguridad (se acepta cualquiera):
- Header token: `x-webhook-token` = `RECURRENTE_WEBHOOK_TOKEN`
- Firma HMAC: `x-recurrente-signature` usando `RECURRENTE_WEBHOOK_SECRET`

Notas operativas:
- Idempotencia por `eventId` (`MembershipWebhookEvent`)
- No se almacenan datos de tarjeta en ERP

## 4) RBAC operativo final
- Farmacia suscripciones (lectura/escritura):
  - `RECEPTION`, `RECEPTIONIST`, `OPS`
- Farmacia configuración:
  - Solo `ADMIN` (`MEMBERSHIPS:ADMIN`)
- Precio de membresías:
  - Solo `ADMIN` (hardening runtime)

## 5) QA manual (smoke)
UI:
- `/admin/suscripciones` (redirect esperado a membresías)
- `/admin/suscripciones/membresias`
- `/admin/suscripciones/membresias/afiliaciones/pacientes`
- `/admin/suscripciones/membresias/planes`
- `/admin/suscripciones/membresias/renovaciones`
- `/admin/suscripciones/membresias/configuracion`
- `/admin/suscripciones/farmacia`

APIs:
- `/api/subscriptions/memberships/dashboard`
- `/api/subscriptions/memberships/plans`
- `/api/subscriptions/memberships/plans?active=true`
- `/api/subscriptions/memberships/config`
- `/api/subscriptions/memberships/config/duration-presets?includeInactive=true`
- `/api/subscriptions/memberships/config/benefits?includeInactive=true`
- `/api/subscriptions/pharmacy/config`
- `/api/subscriptions/pharmacy/queue?windowDays=7`
- `/api/subscriptions/pharmacy/discount-plans?includeInactive=true`

## 6) Smoke local reproducible
1. Sembrar usuario admin dev:
   - `npm run dev:seed:auth`
2. Levantar app:
   - `npm run dev`
3. Login API con cookie jar y ejecutar curl de rutas/UI + APIs.

Referencia de credencial dev local:
- email: `nelsonlopezallen@gmail.com`
- password: `StarDev123!`
