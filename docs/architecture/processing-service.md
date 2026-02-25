# Processing Service Architecture

## Objetivo
Aislar cargas pesadas (Excel/PDF/Images/DOCX) fuera del ERP principal para reducir blast radius de CPU/DoS y limpiar superficie de vulnerabilidades runtime.

## Flujo
1. ERP valida RBAC/permisos y límites de entrada.
2. ERP crea job interno firmado (token + HMAC) hacia processing-service.
3. processing-service encola en Redis/BullMQ.
4. Worker ejecuta job por tipo (`excel_export`, `excel_import`, `pdf_render`, `image_transform`, `docx_render`).
5. Artefactos se guardan en storage S3-compatible (MinIO/GCS).
6. ERP consulta estado y descarga artefactos por URL firmada.

## Seguridad
- Autenticación interna: `Authorization: Bearer` + HMAC (`x-timestamp`, `x-nonce`, `x-signature`).
- Antireplay por nonce/timestamp en Redis.
- Límites por job:
  - tamaño máximo archivo
  - máximo filas/columnas
  - timeout
  - rate-limit por `tenantId + actorId + jobType`
- Logs estructurados sin PII.

## Convención de Storage
- Prefijo de salida:
  - `tenants/{tenantId}/processing/{jobType}/YYYY/MM/DD/{jobId}/output/{file}`
- Logs por job:
  - `tenants/{tenantId}/processing/{jobType}/YYYY/MM/DD/{jobId}/logs/manifest.json`

## Manifest por job
`manifest.json` incluye:
- `jobId`, `tenantId`, `jobType`, `requestedByUserId`
- `limitsApplied`
- `inputs` resumidos (incluye hash SHA-256 para base64/input binario)
- `outputs` (key, mime, size, checksum)
- `resultSummary`

## Multi-tenant
- Cada job y path incluye `tenantId` normalizado.
- El ERP define `tenantId` y `actorId` al encolar.
- Los endpoints internos de consulta/artefactos (`/jobs`, `/jobs/:id`, retry/cancel) exigen `tenantId` y rechazan scope cruzado.

## Panel Admin ERP
- Ruta UI: `/admin/configuracion/procesamiento`.
- Tabs: actividad, artefactos, plantillas, politicas/limites, almacenamiento, salud/metricas y auditoria.
- BFF interno (RBAC + tenant derivado de sesion):
  - `GET /api/admin/processing/jobs`
  - `GET /api/admin/processing/jobs/:id`
  - `POST /api/admin/processing/jobs/:id/retry`
  - `POST /api/admin/processing/jobs/:id/cancel`
  - `GET /api/admin/processing/artifacts`
  - `GET /api/admin/processing/health`
  - `GET|PUT /api/admin/processing/config` (TenantProcessingConfig)

## Configuracion por tenant
- Modelo: `TenantProcessingConfig`.
- Campos principales:
  - `enabled`, `storageProvider`, `bucket`, `prefix`
  - `retentionDaysByJobType`, `maxUploadMB`, `maxRowsExcel`, `maxPagesPdf`
  - `timeoutMs`, `maxConcurrency`, `allowedJobTypes`, `notifyOnFailure`
- Solo editable con capacidades `CONFIG_SERVICES_WRITE`.

## Runtime y despliegue
- Local: Redis + MinIO + processing-service por red interna Docker.
- Cloud target: Cloud Run + Cloud Tasks/PubSub + GCS + Secret Manager.
