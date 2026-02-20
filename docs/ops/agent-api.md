# OPS Agent API

> Documento canónico actualizado: `docs/ops/ops-agent.md`

Base URL (red interna): `http://ops-agent:4700`

## Seguridad
Todas las rutas operativas (`/v1/*` y `/internal/ops/*`) requieren:
- `Authorization: Bearer <OPS_AGENT_TOKEN>`
- HMAC SHA-256 sobre `${timestamp}.${nonce}.${body}`
- Headers: `X-Timestamp`, `X-Nonce`, `X-Signature`
- Allowlist red interna / IP privada
- Rate limit por IP
- La firma se valida sobre **raw body** exacto recibido (no sobre `JSON.stringify(req.body)`), evitando falsos 401 por orden de keys.

## Health
### `GET /healthz`
Sin auth fuerte. Responde estado básico del agente.

## Prometheus scrape
### `GET /metrics`
Métricas del propio `ops-agent` para Prometheus.

## Recursos
### `GET /v1/resources/current`
Query opcional:
- `tenantId`

Respuesta:
- `tenantId`, `projectName`
- `services` (cpus/memory)
- `updatedAt`, `overrideFile`
- `recommendations`

### `POST /v1/resources/apply`
Body:
- `tenantId?`
- `services[]`: `{ service, cpus, memoryMb }`

Acción:
- genera/actualiza override tenant
- ejecuta `docker compose up -d ...`

### `POST /v1/resources/reset`
Body:
- `tenantId?`
- `services?` (si vacío, limpia override completo)

### `POST /v1/services/restart`
Body:
- `tenantId?`
- `service`

Alias: `POST /internal/ops/service/restart`

## Reset de datos
### `POST /v1/data-reset`
Body:
- `tenantId?`
- `scope`: `module|global`
- `module?`
- `requestId?`
- `actorUserId?`, `actorRole?`
- `challengeId?`, `reason?`

Acción:
- reenvía solicitud firmada a `app` (`/api/internal/ops/reset-data`)
- no expone `docker.sock` al ERP

Alias: `POST /internal/ops/data/reset/confirm`

## Archivos de estado/override
Directorio: `docker/ops`
- `resources.<tenant>.json`
- `docker-compose.override.<tenant>.yml`

## Montajes mínimos del agente
- Compose workspace en modo read-only.
- Escritura solo en `docker/ops` para overrides.
- `docker.sock` montado únicamente en `ops-agent`.

## Multi-tenant
- Project name: `${OPS_PROJECT_PREFIX}-${tenantId}`
- Cada tenant puede tener override de recursos independiente
