# Recepcion vs Ingreso (Intake)

## Recepcion (modulo principal)
- Ruta canonical: `/admin/reception`
- Objetivo: flujo operativo de ingreso, colas, check-in, turnos, SLA y dashboard en tiempo real.
- Datos: Visit, Queue, QueueItem, VisitEvent, ServiceRequest.
- Usuarios: recepcion, enfermeria, supervisores, administracion.
- NO maneja diagnostico clinico ni resultados.

## Ingreso / Intake (diagnostico)
- Ruta: `/diagnostics/intake`
- Objetivo: registro administrativo de ordenes diagnosticas (creacion de orden y captura basica).
- No gestiona colas de recepcion ni estados de visita.
- Integra con diagnostico clinico y catalogo de estudios.

## Contrato entre modulos
- La integracion se hace por `ServiceRequest` y estados operativos de `Visit`.
- Recepcion crea solicitudes y encola; las areas toman y completan.
- Diagnostico no importa ni ejecuta logica de Recepcion.

## Legacy / rutas anteriores
- Alias legacy: `/admin/recepcion` ahora redirige a `/admin/reception`.
- UI legacy: `/diagnostics/reception` ahora redirige a `/admin/reception`.
- Intake oficial: `/diagnostics/intake`.
- API intake legacy: `/api/diagnostics/reception/*` redirige a `/api/diagnostics/intake/*`.

## Regla de oro
Recepcion es un modulo administrativo independiente y no convive dentro de Diagnostico Clinico.
