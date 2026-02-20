# Observability Compose (StarMedical)

## Goal
Expose per-container CPU/RAM/network metrics in local/dev Compose without mounting `docker.sock` into ERP.

## Stack
- `cadvisor`: reads Docker container metrics.
- `prometheus`: scrapes `cadvisor`, `ops-agent`, optional `node-exporter`.
- `ops-agent`: only service with `docker.sock`; applies resources/restarts/resets.
- `app`: consumes internal metrics endpoint and renders OPS UI.
- `ops-health-scheduler`: calls internal health endpoint every X minutes and persists history.

## Compose notes
File: `docker-compose.local.yml`
- Added services: `cadvisor`, `prometheus`, `node-exporter` (profile `ops`), `ops-agent`, `ops-health-scheduler`.
- Removed fixed `container_name` values to avoid multi-stack name collisions.
- Host ports are env-parametrized:
  - `DB_PORT`, `APP_PORT`, `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `MAILPIT_UI_PORT`, `MAILPIT_SMTP_PORT`.
- `app` uses dedicated volume `app-node-modules-local` for `/workspace/node_modules` to avoid host/container Prisma engine mismatch.
- `app` startup installs dependencies only when node_modules volume is empty, then runs `prisma generate`.
- MinIO readiness is gated by `minio-init` (`mc` retry loop) without in-container `curl` healthcheck.
- `ops-agent` no longer mounts workspace as writable; repo mount is read-only + `docker/ops` writable.

## Internal endpoints
- `GET /api/internal/ops/metrics?range=5m|15m|1h`
- `GET /api/internal/ops/health`
- `GET /api/internal/ops/health?persist=1&source=compose_scheduler` (for scheduler persistence)

Auth:
- both health and metrics use the same service token (`OPS_HEALTH_TOKEN`) through `Authorization: Bearer ...` or `x-ops-service-token`.

Metrics payload per service includes:
- `cpuPercent` + `cpuPct`
- `memoryBytes` + `memBytes`
- `memoryPercent` + `memPct`
- `networkRxBytesPerSec` + `netRxBytes`
- `networkTxBytesPerSec` + `netTxBytes`
- `bandwidthBytesPerSec`
- `sampleWindow`, `status`, `checkedAt`

## Multi-tenant ready
- Compose project name: `starmedical-${TENANT_ID:-local}`.
- Metrics are filtered by compose project label.
- `ops-agent` applies overrides per tenant stack.
- Running multiple stacks is supported by changing:
  - `TENANT_ID`
  - host port envs (`APP_PORT`, `DB_PORT`, `MINIO_PORT`, etc.) when external exposure is required.

## Quick validation
1. `docker compose -f docker-compose.local.yml up -d`
2. `docker compose -f docker-compose.local.yml ps`
3. `curl -H "Authorization: Bearer ops-health-local-token" "http://localhost:3000/api/internal/ops/metrics?range=5m"`
4. Open `/admin/configuracion/operaciones/observabilidad`
