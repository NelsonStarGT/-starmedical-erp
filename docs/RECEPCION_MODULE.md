# Módulo de Recepción (`/admin/reception`)

## Estado actual
Recepción quedó unificada con ruta canonical en inglés y etiqueta de UI en español:
- Canonical: `/admin/reception/*`
- Alias legacy: `/admin/recepcion/*` (solo redirects 308)

## Rutas canonical
- `/admin/reception/dashboard`
- `/admin/reception`
- `/admin/reception/check-in`
- `/admin/reception/appointments`
- `/admin/reception/availability`
- `/admin/reception/queues`
- `/admin/reception/registros`
- `/admin/reception/incidents`
- `/admin/reception/worklist`
- `/admin/reception/settings`
- `/admin/reception/companies`
- `/admin/reception/solicitudes-portal`
- `/admin/reception/visit/[visitId]`
- `/admin/reception/caja` (redirect a `/admin/facturacion/caja`)

## Alias y compatibilidad legacy
Redirects 308 principales:
- `/admin/recepcion` -> `/admin/reception/dashboard`
- `/admin/recepcion/cola` -> `/admin/reception/queues`
- `/admin/recepcion/citas` -> `/admin/reception/appointments`
- `/admin/recepcion/admisiones` -> `/admin/reception/check-in`
- `/admin/recepcion/caja` -> `/admin/reception/caja`
- `/admin/recepcion/registros` -> `/admin/reception/registros`
- `/admin/recepcion/*` -> `/admin/reception/*` (incluye subrutas equivalentes)

## RBAC
Capacidades v1 de recepción siguen en catálogo global:
- `RECEPTION_VIEW`
- `RECEPTION_QUEUE_VIEW` / `RECEPTION_QUEUE_WRITE`
- `RECEPTION_APPOINTMENTS_VIEW` / `RECEPTION_APPOINTMENTS_WRITE`
- `RECEPTION_ADMISSIONS_VIEW` / `RECEPTION_ADMISSIONS_WRITE`
- `RECEPTION_CASHIER_VIEW` / `RECEPTION_CASHIER_WRITE`
- `RECEPTION_REGISTRATIONS_VIEW` / `RECEPTION_REGISTRATIONS_WRITE`

En el módulo canonical se amplió mapeo de roles para acceso compatible:
- `SUPER_ADMIN`, `ADMIN`, `TENANT_ADMIN`, `RECEPTION_ADMIN` -> admin
- `SUPERVISOR`, `RECEPTION_SUPERVISOR`, `OPS` -> supervisor
- `RECEPTIONIST`, `RECEPTION`, `RECEPTION_OPERATOR`, `SECRETARY`, `NURSE`, `CASHIER` -> operador

## Integración con Clientes
- Dashboard de Clientes incluye accesos a:
  - `/admin/reception/check-in?mode=existing`
  - `/admin/reception/queues`
  - `/admin/reception/registros`
- Detalle de cliente incluye botón:
  - `/admin/reception/check-in?mode=existing&clientId=...`

## Nota
`app/admin/recepcion/*` se mantiene únicamente como capa de alias temporal para bookmarks legacy. No contiene lógica operativa canonical.
