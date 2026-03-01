# Migración: Membresías -> Suscripciones

As-of date: 2026-02-28

## Objetivo
- Nuevo namespace UI: `/admin/suscripciones/*`
- Nuevo namespace API canónico: `/api/subscriptions/*`
- Compatibilidad mantenida para:
  - `/admin/membresias/*`
  - `/api/memberships/*`
  - `/api/membresias/*`

## Estrategia
1. Se creó `app/admin/suscripciones/membresias/*` con wrappers hacia la implementación existente.
2. Se añadió ruta nueva de negocio:
   - `/admin/suscripciones/membresias/afiliaciones/*` (alias funcional de contratos).
3. Se clonó API de membresías a:
   - `app/api/subscriptions/memberships/*`
4. Se convirtieron rutas legacy canónicas anteriores (`app/api/memberships/*`) en re-export hacia `subscriptions/memberships`.
5. Los wrappers en español (`/api/membresias/*`) continúan operativos sin cambios de contrato.

## Mapa de rutas
- UI:
  - `/admin/membresias` -> `/admin/suscripciones/membresias`
  - `/admin/membresias/contratos` -> `/admin/suscripciones/membresias/afiliaciones`
- API:
  - `/api/memberships/*` -> `/api/subscriptions/memberships/*`
  - `/api/membresias/*` -> compat vía wrappers existentes

## Checklist
- [x] Namespace `/admin/suscripciones` creado
- [x] Namespace `/api/subscriptions/memberships` creado
- [x] Compat `/api/memberships` mantenida por re-export
- [x] Compat `/api/membresias` mantenida
