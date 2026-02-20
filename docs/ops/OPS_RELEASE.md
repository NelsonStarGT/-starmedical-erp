# OPS Release · StarMedical ERP (Fases 1–3)

> Estado: **sellado/no-touch** para backlog actual. No agregar features OPS sin reabrir alcance formal.

## 1) Qué incluye OPS
- Health agregado interno y admin:
  - `GET /api/internal/ops/health`
  - `GET /api/admin/config/ops/health`
  - Historial en DB (`OpsHealthCheck`, `OpsHealthCheckService`).
- Métricas agregadas (Prometheus + cAdvisor):
  - `GET /api/internal/ops/metrics`
  - `GET /api/admin/config/ops/metrics`
  - Historial en DB (`OpsMetricsSnapshot`, `OpsMetricsSnapshotService`).
- Control operativo (ops-agent, sin docker.sock en ERP):
  - recursos CPU/RAM, restart, reset config.
- Reset destructivo con OTP:
  - OTP 6 dígitos, TTL 10 min, hash en DB, 5 intentos máx.
  - `SUPER_ADMIN` obligatorio.
- Scheduler tenant-aware:
  - snapshots automáticos de health+metrics.
  - lock distribuido por Redis.
- Alertas tenant-aware:
  - transición de estado + umbrales (CPU/RAM/BW), cooldown/dedupe.
  - notificación email; WhatsApp stub.
- Auditoría completa:
  - actor user/system, `requestId`, `ip`, `userAgent`, `tenantId`, `branchId`.

## 2) Endpoints OPS y RBAC

### Internos (service-to-service)
- `GET /api/internal/ops/health`
  - Auth: `OPS_HEALTH_TOKEN`.
  - Uso: health agregado y persistencia opcional (`persist=1`).
- `GET /api/internal/ops/metrics`
  - Auth: `OPS_HEALTH_TOKEN`.
  - Uso: métricas agregadas y persistencia opcional (`persist=1`).
- `POST /api/internal/ops/reset-data`
  - Auth: token interno + HMAC + nonce + timestamp.
  - Uso: ejecución de reset desde ops-agent.

### Admin (ERP)
- `GET /api/admin/config/ops/health` → `OPS|SUPER_ADMIN`
- `GET /api/admin/config/ops/health/history` → `OPS|SUPER_ADMIN`
- `GET /api/admin/config/ops/metrics` → `OPS|SUPER_ADMIN`
- `GET /api/admin/config/ops/metrics/history` → `OPS|SUPER_ADMIN`
- `GET /api/admin/config/ops/alerts` → `OPS|SUPER_ADMIN`
- `GET /api/admin/config/ops/audit` → `OPS|SUPER_ADMIN`
- `GET /api/admin/config/ops/resources` → `OPS|SUPER_ADMIN`
- `POST /api/admin/config/ops/resources/apply` → `OPS|SUPER_ADMIN`
- `POST /api/admin/config/ops/resources/reset` → `OPS|SUPER_ADMIN`
- `POST /api/admin/config/ops/services/restart` → `OPS|SUPER_ADMIN`
- `GET /api/admin/config/ops/scheduler-config` → `OPS|SUPER_ADMIN`
- `POST /api/admin/config/ops/scheduler-config` → `SUPER_ADMIN`
- `POST /api/admin/config/ops/scheduler/run-now` → `OPS|SUPER_ADMIN`
- `GET /api/admin/config/ops/actions/reset/modules` → `SUPER_ADMIN`
- `POST /api/admin/config/ops/actions/reset/request-otp` → `SUPER_ADMIN`
- `POST /api/admin/config/ops/actions/reset/confirm` → `SUPER_ADMIN`

## 3) Variables `.env` relevantes

### Seguridad interna
- `OPS_HEALTH_TOKEN=ops-health-local-token`
- `OPS_AGENT_TOKEN=ops-agent-local-token`
- `OPS_AGENT_HMAC_SECRET=ops-agent-local-hmac`
- `OPS_RESET_INTERNAL_TOKEN=ops-reset-local-token`
- `OPS_RESET_INTERNAL_HMAC_SECRET=ops-reset-local-hmac`

### Scheduler/alertas (lockdown)
- `OPS_SCHEDULER_ENABLED=true`
- `OPS_SCHEDULER_TICK_SECONDS=30`
- `OPS_SCHEDULER_LOCK_TTL_SECONDS=110`
- `OPS_ALERTS_ENABLED=true`
- `OPS_ALERT_COOLDOWN_SECONDS=600`
- `OPS_ALERT_CPU_WARN_PCT=85`
- `OPS_ALERT_CPU_CRITICAL_PCT=95`
- `OPS_ALERT_MEM_WARN_PCT=85`
- `OPS_ALERT_MEM_CRITICAL_PCT=95`
- `OPS_ALERT_BANDWIDTH_WARN_BPS=12582912`

### Multi-tenant / compose
- `TENANT_ID=local`
- `OPS_PROJECT_PREFIX=starmedical`
- `APP_PORT=3000`
- `DB_PORT=5432`
- `MINIO_PORT=9000`
- `MINIO_CONSOLE_PORT=9001`
- `MAILPIT_UI_PORT=8025`
- `MAILPIT_SMTP_PORT=1025`

### Dependencias
- `REDIS_URL=redis://localhost:6379` (lock distribuido + rate limit)
- `PROMETHEUS_URL=http://prometheus:9090`
- `OPS_AGENT_URL=http://ops-agent:4700`

## 4) Matriz de servicios Compose (local/dev)

| Servicio | Rol OPS | Persistencia | Healthcheck | Exposición |
|---|---|---|---|---|
| `db` | estado + storage primario | volumen (`pgdata-local`) | `pg_isready` | host (`DB_PORT`) |
| `redis` | lock/rate-limit/colas runtime | no crítica (cache) | `redis-cli ping` | interno |
| `minio` | artefactos | volumen (`minio-data-local`) | gate por `minio-init` | host (`MINIO_*`) |
| `processing-service` | jobs/readyz/healthz | metadatos en DB + S3/MinIO | `/healthz` + `/readyz` | interno |
| `app` | ERP + endpoints OPS | DB externa | `/internal/healthz` | host (`APP_PORT`) |
| `prometheus` | consulta métricas | volumen (`prometheus-data-local`) | `/-/healthy` | interno |
| `cadvisor` | métricas contenedor | no | `/healthz` | interno |
| `ops-agent` | apply/restart/reset via docker.sock | overrides en `docker/ops` | `/healthz` | interno |
| `mailpit` | correo dev OTP/alertas | no | n/a | host (`MAILPIT_*`) |

## 5) Matriz multi-tenant (tenant-per-stack)

| Campo | Tenant A | Tenant B | Nota |
|---|---|---|---|
| `TENANT_ID` | `tenant_a` | `tenant_b` | separa project name Compose |
| Project | `starmedical-tenant_a` | `starmedical-tenant_b` | `name: starmedical-${TENANT_ID}` |
| `APP_PORT` | `3100` | `3200` | evitar colisión |
| `DB_PORT` | `55432` | `56432` | evitar colisión |
| `MINIO_PORT` | `9100` | `9200` | evitar colisión |
| `MINIO_CONSOLE_PORT` | `9101` | `9201` | evitar colisión |
| `MAILPIT_UI_PORT` | `8125` | `8225` | evitar colisión |
| `MAILPIT_SMTP_PORT` | `1125` | `1225` | evitar colisión |
| Overrides | `docker/ops/resources.tenant_a.json` | `docker/ops/resources.tenant_b.json` | recursos por tenant |
| Override compose | `docker/ops/docker-compose.override.tenant_a.yml` | `docker/ops/docker-compose.override.tenant_b.yml` | apply por ops-agent |

## 6) Checklist de aceptación final (E2E)

### Núcleo
- [x] Compose valida configuración (`docker compose config`).
- [x] Typecheck global pasa.
- [x] Suite de tests OPS pasa.
- [x] Endpoints internos de health/metrics protegidos por token.
- [x] Reset destructivo protegido por OTP + `SUPER_ADMIN`.
- [x] Scheduler y alertas apagables por env.
- [x] Scripts de verificación sin operaciones destructivas (`verify-ops`, `verify-tenant`).

### UI/RBAC
- [x] `/admin/configuracion/operaciones`
- [x] `/admin/configuracion/operaciones/health`
- [x] `/admin/configuracion/operaciones/observabilidad`
- [x] `/admin/configuracion/operaciones/recursos`
- [x] `/admin/configuracion/operaciones/acciones`
- [x] `/admin/configuracion/operaciones/alertas`

### Operación manual recomendada antes de prod
- [ ] Flujo OTP completo en Mailpit (request + email + confirm module reset).
- [ ] `Run now` y verificación en DB de snapshots/alertas.
- [ ] Confirmar eventos `AuditLog` (incluye actor `SYSTEM` en scheduler).

## 7) Migraciones Prisma requeridas (exactas)
- `prisma/migrations/20260219193000_ops_health_audit`
- `prisma/migrations/20260220120000_ops_reset_otp`
- `prisma/migrations/20260220201000_ops_scheduler_alerts`

Comando:
- `npx prisma migrate deploy`

Nota:
- En una DB vacía, además de las migraciones OPS, debe existir el baseline completo del proyecto para tablas base (`User`, `Role`, `AuditLog`, `Tenant`, etc.).

## 8) Scripts de verificación (one-liners)
- Verificación general OPS:
  - `bash scripts/ops/verify-ops.sh`
  - Internamente usa typecheck acotado OPS: `npx tsc --noEmit -p tsconfig.ops.json`.
- Verificación tenant-per-stack (sin levantar contenedores):
  - `bash scripts/ops/verify-tenant.sh`

## 9) Validación ejecutada en cierre
- `bash scripts/ops/verify-tenant.sh`:
  - resultado: OK
  - evidencia: `tenant_a ports: 1125,3100,8125,9100,9101,55432` y `tenant_b ports: 1225,3200,8225,9200,9201,56432` (sin colisiones).
- `APP_PORT=3100 OPS_HEALTH_TOKEN=ops-health-local-token bash scripts/ops/verify-ops.sh`:
  - resultado: OK
  - `internal health`: HTTP 200
  - `internal metrics`: HTTP 503 (esperable si faltan tablas/migraciones OPS en DB local).
- Validación de protección internos sin token:
  - `GET /api/internal/ops/health` => `401`
  - `GET /api/internal/ops/metrics` => `401`
  - `POST /api/internal/ops/reset-data` => `401`
- Validación HTTP de rutas UI OPS (sin sesión):
  - `/admin/configuracion/operaciones*` => `307` (redirect a login), rutas presentes y resolviendo.
- `docker logs starmedical-local-app-1`:
  - evidencia de arranque scheduler y guardrails por tablas faltantes (`P2021`) sin crash del servicio.
- Verificación DB local de cierre:
  - `to_regclass('OpsHealthCheck'|'OpsMetricsSnapshot'|'OpsAlertEvent'|'AuditLog')` vacío en stack levantado de prueba.
  - conclusión: para validación funcional completa (OTP/run-now/auditoría persistida) primero aplicar migraciones requeridas.

## 10) Producción vs dev
- Dev/local:
  - `MAIL_TRANSPORT=mailpit` recomendado.
  - `OPS_SCHEDULER_ENABLED=true`.
  - fallback lock en memoria permitido solo fuera de `production`.
- Producción:
  - Redis obligatorio para lock distribuido de scheduler.
  - no exponer endpoints internos (`/api/internal/ops/*`) fuera de red privada.
  - mantener tokens/hmac rotables por secret manager.

## 11) NO-TOUCH ZONE
- Módulos sensibles:
  - `lib/ops/scheduler.ts`
  - `lib/ops/alerts.ts`
  - `lib/ops/store.ts`
  - `app/api/internal/ops/*`
  - `app/api/admin/config/ops/*`
- Regla:
  - no modificar comportamiento sin runbook + checklist E2E + aprobación de seguridad/operaciones.
