# OPS Scheduler (Health + Metrics Snapshots)

## Objetivo
Ejecutar snapshots automáticos de `health` y `metrics` por tenant, con persistencia en DB, lock distribuido y auditoría completa.

## Inicio automático
- El scheduler se inicializa en runtime Node desde `GET /internal/healthz`.
- Se usa `ensureOpsSchedulerStarted()` (`/Users/nelsonsebastianlopez/Documents/STARMEDICAL/app_star/lib/ops/scheduler.ts`).
- El ciclo base corre cada `OPS_SCHEDULER_TICK_SECONDS` (default: 30s).

## Frecuencia efectiva por tenant
- Configurable en `OpsSchedulerConfig.frequencySeconds`.
- Default: `120s`.
- Aunque el tick base sea 30s, cada tenant solo ejecuta cuando está vencido su intervalo.

## Lock distribuido
- Lock Redis por tenant: `ops:scheduler:lock:{tenantId}`.
- Mecanismo: `SET key value NX PX <ttl>` + `eval` para liberar solo si el token coincide.
- Fallback local en memoria si Redis no está disponible (solo dev).

## Pipeline por ejecución
1. Lee configuración tenant (`OpsSchedulerConfig`).
2. Verifica due-time (último snapshot scheduler).
3. Toma health snapshot (`collectOpsHealthSnapshot`).
4. Toma metrics snapshot (`collectOpsMetricsSnapshot(range=5m)`).
5. Persiste:
   - `OpsHealthCheck` + `OpsHealthCheckService` (source=`scheduler`)
   - `OpsMetricsSnapshot` + `OpsMetricsSnapshotService` (source=`scheduler`)
6. Evalúa reglas de alerta y aplica cooldown/dedupe.
7. Emite notificaciones por canales habilitados.
8. Audita en `AuditLog` con actor `SYSTEM` + `requestId`.

## Endpoints admin
- `GET /api/admin/config/ops/scheduler-config`
- `POST /api/admin/config/ops/scheduler-config` (solo `SUPER_ADMIN`)
- `POST /api/admin/config/ops/scheduler/run-now`

## Variables relevantes
- `OPS_SCHEDULER_ENABLED` (`true|false`, default `true`)
- `OPS_SCHEDULER_TICK_SECONDS` (default `30`)
- `OPS_SCHEDULER_LOCK_TTL_SECONDS` (default `110`)
- `OPS_ALERT_COOLDOWN_SECONDS` (default `600`)
- `OPS_ALERTS_ENABLED` (`true|false`, default `true`)

## Lockdown
- En `production`, si no hay `REDIS_URL`, el scheduler queda deshabilitado por seguridad.
- El fallback de lock en memoria se permite solo en no-producción.

## Multi-tenant
- Tenant discovery:
  - tabla `Tenant` activa (si existe)
  - fallback `TENANT_ID` env
- Persistencia siempre con `tenantId` por snapshot/alerta.
