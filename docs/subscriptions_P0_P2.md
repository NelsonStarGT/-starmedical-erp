# Suscripciones P0 -> P2

As-of date: 2026-02-28

## P0 (Membresías)
- Configuración con pestañas operativas:
  - Catálogos de categorías
  - Duraciones (presets)
  - Servicios incluidos (benefits)
  - Pasarela (base)
  - Permisos/visibilidad
- Plan builder en `/admin/suscripciones/membresias/planes`:
  - categoría, segmento, duración preset/custom, beneficios, imagen/icono
  - ocultamiento de precio por permiso `MEMBERSHIPS:PRICING:VIEW`
- API canónica:
  - `/api/subscriptions/memberships/config`
  - `/api/subscriptions/memberships/config/duration-presets`
  - `/api/subscriptions/memberships/config/benefits`
- Seed base (idempotente):
  - Categorías: Individual, Escolar, Familiar, Familiar Plus, Empresarial
  - Duraciones: 15/30/90/180/365
  - Beneficios demo: Consulta general, Hemograma, Rx tórax, Audiometría

## P1 (Afiliaciones + Renovaciones)
- UI:
  - `/admin/suscripciones/membresias/afiliaciones/pacientes`
  - `/admin/suscripciones/membresias/afiliaciones/empresas`
  - subnav compacta Pacientes/Empresas.
- API aliases:
  - `/api/subscriptions/memberships/afiliaciones/*` -> contrato subyacente.
  - `/api/membresias/afiliaciones/*` -> compat en español.
- Renovaciones se mantiene en:
  - `/admin/suscripciones/membresias/renovaciones`

## P2 (Recurrente + Farmacia)
- Ver commits de P2 para:
  - `recurrente` (checkout + webhook + auto-factura)
  - `farmacia` (suscripciones por medicamento + cola operativa + descuento scaffold)

### P2.B Farmacia
- UI `/admin/suscripciones/farmacia` con tabs:
  - Suscripciones por medicamento
  - Suscripción de descuento
  - Configuración
- API canónica:
  - `/api/subscriptions/pharmacy/medication-subscriptions`
  - `/api/subscriptions/pharmacy/queue`
  - `/api/subscriptions/pharmacy/config`
  - `/api/subscriptions/pharmacy/discount-plans`
  - `/api/subscriptions/pharmacy/discount-subscriptions`
- Modelo de descuento preparado con feature flag (DB + override ENV):
  - `SUBSCRIPTIONS_PHARMACY_DISCOUNT_ENABLED`
