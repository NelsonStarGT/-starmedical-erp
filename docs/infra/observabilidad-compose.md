# Observabilidad Compose (StarMedical)

## Objetivo
Exponer consumo por contenedor (CPU/RAM/red) en Docker Compose local/dev sin montar `docker.sock` en ERP.

## Arquitectura
- `cadvisor`: recolecta métricas de contenedores Docker.
- `prometheus`: scrape de `cadvisor`, `ops-agent` y `node-exporter` (opcional).
- `ops-agent`: único servicio con acceso a `docker.sock`; aplica recursos y acciones operativas.
- `app`: consume métricas agregadas vía endpoint admin (`/api/admin/config/ops/metrics`).
- `ops-health-scheduler`: ejecuta health agregado y persiste histórico automáticamente.
- `ops-health-scheduler`: persiste health agregado cada X minutos.

## Servicios nuevos en Compose local
Archivo: `docker-compose.local.yml`
- `cadvisor` (healthcheck `/healthz`)
- `prometheus` (healthcheck `/-/healthy`)
- `node-exporter` (profile `ops`, opcional)
- `ops-agent` (healthcheck `/healthz`, token + HMAC + rate limit)
- `ops-health-scheduler` (job periódico para `persist=1`)

Cambios de estabilidad:
- Eliminados `container_name` fijos para evitar colisiones entre stacks.
- Puertos expuestos parametrizados por env:
  - `DB_PORT`, `APP_PORT`, `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `MAILPIT_UI_PORT`, `MAILPIT_SMTP_PORT`.
- `minio` sin healthcheck con `curl` embebido; el gating queda en `minio-init` (`mc` + retries).
- `app` usa volumen `app-node-modules-local` y comando de arranque estable (instala deps solo si volumen vacío + `prisma generate`).
- `ops-agent` monta workspace `read-only` y solo `docker/ops` en write.
- `ops-health-scheduler` (llamadas internas periódicas a `/api/internal/ops/health?persist=1`)

## Prometheus
- Config: `docker/prometheus/prometheus.yml`
- Reglas: `docker/prometheus/rules/containers.yml`

Consultas usadas por el agregador (`lib/ops/metricsAggregator.ts`):
- CPU: `rate(container_cpu_usage_seconds_total[window])`
- RAM: `container_memory_working_set_bytes`
- RAM limit: `container_spec_memory_limit_bytes`
- Red RX/TX: `rate(container_network_receive_bytes_total[window])`, `rate(container_network_transmit_bytes_total[window])`
- Presencia: `container_last_seen`

## Endpoints
- Interno tokenizado: `GET /api/internal/ops/metrics?range=5m|15m|1h`
- Admin RBAC: `GET /api/admin/config/ops/metrics?range=5m|15m|1h`

Respuesta:
- `status`: `ok|degraded|down`
- `timestamp`, `durationMs`, `range`, `projectName`
- `services[]`: `cpuPercent/cpuPct`, `memoryBytes/memBytes`, `memoryPercent/memPct`, `networkRxBytesPerSec/netRxBytes`, `networkTxBytesPerSec/netTxBytes`, `bandwidthBytesPerSec`, `status`

## Multi-tenant ready
- Compose project parametrizado: `name: starmedical-${TENANT_ID:-local}`
- Agregador métrico filtra por label de proyecto compose.
- `ops-agent` soporta `tenantId` para overrides por stack.
- Tenant-per-stack:
  - levantar con distinto `TENANT_ID`
  - ajustar puertos por env si se expondrán múltiples stacks en el mismo host.

## Validación rápida
1. `docker compose -f docker-compose.local.yml up -d`
2. `docker compose -f docker-compose.local.yml ps`
3. `curl -H "Authorization: Bearer ops-health-local-token" "http://localhost:3000/api/internal/ops/metrics?range=5m"`
4. UI: `/admin/configuracion/operaciones/observabilidad`
