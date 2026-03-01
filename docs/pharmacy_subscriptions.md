# Pharmacy Subscriptions (P2.B)

As-of date: 2026-02-28

## Scope
Módulo dentro de `/admin/suscripciones/farmacia` con dos líneas:
- Suscripción por medicamento (operativa)
- Suscripción de descuento (scaffold, controlada por feature flag/config)

Cobranza no se ejecuta dentro del módulo; se usa deep-link a Facturación:
- `/admin/facturacion?source=pharmacy&subscriptionId=...`

## Modelos Prisma
- `PharmacySubscriptionConfig`
- `PharmacyMedicationSubscription`
- `PharmacyMedicationSubscriptionItem`
- `PharmacyReminderEvent`
- `PharmacyDiscountSubscriptionPlan`
- `PharmacyDiscountSubscription`

Enums:
- `PharmacySubscriptionStatus`
- `PharmacyRegimenFrequency`
- `PharmacyDeliveryMethod`
- `PharmacyContactPreference`
- `PharmacyReminderEventType`

## Endpoints canónicos
- `GET/PATCH /api/subscriptions/pharmacy/config`
- `GET/POST /api/subscriptions/pharmacy/medication-subscriptions`
- `POST /api/subscriptions/pharmacy/medication-subscriptions/[id]/status`
- `POST /api/subscriptions/pharmacy/medication-subscriptions/[id]/events`
- `GET /api/subscriptions/pharmacy/queue?windowDays=7`
- `GET/POST /api/subscriptions/pharmacy/discount-plans`
- `GET/POST /api/subscriptions/pharmacy/discount-subscriptions`

## Seguridad y reglas
- RBAC reutiliza permisos de memberships (`READ/WRITE/ADMIN`).
- Scoping por `branchId` cuando el usuario autenticado tiene `branchId`.
- Sin side-effects en GET.
- Feature flag descuento:
  - `SUBSCRIPTIONS_PHARMACY_DISCOUNT_ENABLED` (opcional, override de DB)

## TODOs abiertos
- Relación fuerte con catálogo de productos/inventario (actualmente `medicationId` textual).
- Integración con módulo de tareas/notificaciones internas para recordatorios.
- Endpoint dedicado para registrar/consultar estados de entrega logística avanzada.
