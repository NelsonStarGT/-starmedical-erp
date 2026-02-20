# OPS Alerts (Transiciones + Umbrales)

## Tipos de alerta
- `health_transition`: transición de estado global (`ok|degraded|down`).
- `service_down`: servicio requerido cae a `down`.
- `recovery`: recuperación global o por servicio.
- `metrics_threshold`: umbral de CPU/RAM/BW excedido.

## Severidad
- `info`: recuperaciones.
- `warning`: degradaciones y umbrales altos.
- `critical`: caídas a `down` y umbrales críticos.

## Dedupe + cooldown
- `dedupeKey`: `{tenantId}:{type}:{serviceKey|global}:{toStatus}`.
- Si existe evento con cooldown activo para el mismo `dedupeKey`, no se crea alerta nueva.
- Cooldown default: 10 minutos (`OPS_ALERT_COOLDOWN_SECONDS=600`).

## Umbrales por defecto
- CPU warning: `85%` (`OPS_ALERT_CPU_WARN_PCT`)
- CPU critical: `95%` (`OPS_ALERT_CPU_CRITICAL_PCT`)
- RAM warning: `85%` (`OPS_ALERT_MEM_WARN_PCT`)
- RAM critical: `95%` (`OPS_ALERT_MEM_CRITICAL_PCT`)
- Bandwidth warning: `12 MB/s` (`OPS_ALERT_BANDWIDTH_WARN_BPS`)

## Notificaciones
- Email: obligatorio (cuando `channels.email=true`).
- WhatsApp: stub/interface (sin provider productivo).

## Persistencia
Tabla `OpsAlertEvent`:
- `tenantId`, `level`, `type`
- `fromStatus`, `toStatus`, `serviceKey`
- `summary`, `detailJson`
- `dedupeKey`, `cooldownUntil`
- `requestId`, `source`

## Auditoría
Cada ciclo del scheduler registra en `AuditLog`:
- `OPS_SCHEDULER_TICK`
- `OPS_SCHEDULER_SKIPPED`
- `OPS_SCHEDULER_FAILED`

Actor: `SYSTEM` con `requestId` y `tenantId` en metadata.
