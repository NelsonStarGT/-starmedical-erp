# Reset de Datos con OTP (Seguridad OPS)

## Objetivo
Permitir reset de datos operativos con control fuerte:
- Solo `SUPER_ADMIN`
- OTP de 6 dígitos por email
- TTL 10 minutos
- Hash en DB
- Máximo 5 intentos
- Auditoría completa con `requestId`, `ip`, `userAgent`, `tenant`

## Flujo
1. `SUPER_ADMIN` solicita OTP (`POST /api/admin/config/ops/actions/reset/request-otp`).
2. Se genera solicitud OTP en `OpsResetRequest`.
3. El OTP se envía al email de Admin General (resuelto por rol `SUPER_ADMIN`/`ADMIN`).
4. `SUPER_ADMIN` confirma OTP (`POST /api/admin/config/ops/actions/reset/confirm`).
5. ERP llama a `ops-agent` (`/internal/ops/data/reset/confirm`).
6. `ops-agent` reenvía a endpoint interno firmado (`/api/internal/ops/reset-data`).
7. Se ejecuta reset por módulo o global y se audita el resultado.

## Modelo de datos
Tabla: `OpsResetRequest`
- `requestedByUserId`, `confirmedByUserId`, `recipientEmail`
- `status`, `scope`, `moduleKey`, `reason`
- `otpHash`, `otpExpiresAt`, `consumedAt`
- `attempts`, `maxAttempts`
- `requestId`, `tenantId`, `branchId`, `ip`, `userAgent`

## Protección service-to-service
Endpoint interno: `POST /api/internal/ops/reset-data`
- Token interno (`OPS_RESET_INTERNAL_TOKEN`)
- Firma HMAC (`X-Timestamp`, `X-Nonce`, `X-Signature`)
- Anti-replay por nonce
- Skew temporal máximo 5 min
- Rate limit

## Guardrails de reset
Reset implementado solo para runtime:
- `inventory_runtime`
- `ops_health`
- `processing_jobs`
- `portal_runtime`

No borra usuarios admin ni tablas base de configuración.

Comportamiento tenant-safe:
- Módulos tenant-aware (`ops_health`, `processing_jobs`):
  - en `scope=module` requieren `tenantId`
  - aplican `deleteMany` filtrado por `tenantId`.
- Módulos sin `tenantId` directo (`inventory_runtime`, `portal_runtime`):
  - si llega `scope=module` con `tenantId`, se **saltan** y se registra `summary.skipped_no_tenant`.
  - en `scope=global`, se permite ejecución global (solo con OTP + SUPER_ADMIN).

## Eventos de auditoría clave
- `OPS_DATA_RESET_OTP_REQUESTED`
- `OPS_DATA_RESET_OTP_INVALID`
- `OPS_DATA_RESET_EXECUTED`
- `OPS_DATA_RESET_FAILED`
- `OPS_DATA_RESET_INTERNAL_EXECUTED`
- `OPS_DATA_RESET_INTERNAL_FAILED`

## Variables relevantes
- `OPS_RESET_INTERNAL_TOKEN`
- `OPS_RESET_INTERNAL_HMAC_SECRET`
- `OPS_AGENT_URL`
- `OPS_AGENT_TOKEN`
- `OPS_AGENT_HMAC_SECRET`
