# OPS Handoff (Cierre definitivo)

## Estado actual
OPS quedó implementado y sellado para no tocar en corto plazo:
- Fase 1: health agregado + auditoría + historial.
- Fase 2: observabilidad compose + ops-agent + reset OTP tenant-safe.
- Fase 3: scheduler tenant-aware + métricas históricas + alertas + UI Historial & Alertas.

Documentación maestra:
- `docs/ops/OPS_RELEASE.md`

## Qué NO tocar

### NO-TOUCH ZONE
- `lib/ops/scheduler.ts`
- `lib/ops/alerts.ts`
- `lib/ops/store.ts`
- `app/api/internal/ops/*`
- `app/api/admin/config/ops/*`
- `docker-compose.local.yml` (bloques OPS, observabilidad, ops-agent)

### Razón
Son rutas y servicios que mezclan seguridad (tokens/HMAC), acciones críticas (reset), scheduler y multi-tenant. Cambios parciales sin validación completa pueden producir:
- notificaciones duplicadas,
- resets inseguros,
- degradación por lock mal configurado,
- exposición de endpoints internos.

## Cómo retomar en futuro
1. Scheduler dedicado:
   - mover scheduler in-process a worker dedicado (BullMQ/cron worker) para despliegues distribuidos.
2. WhatsApp real:
   - reemplazar stub por provider con retries/backoff y trazabilidad por message-id.
3. Observabilidad externa:
   - integrar alertas/events a Grafana/Loki/Alertmanager.
4. Hardening adicional:
   - rotación automática de tokens internos.
   - allowlist de red más estricta por entorno.

## Riesgos residuales conocidos
- Scheduler in-process depende de runtime Node persistente (en serverless no aplica sin worker).
- Sin Redis en producción el scheduler se desactiva por seguridad (evita duplicados, pero no ejecuta).
- WhatsApp aún es stub (solo email productivo).
- Validaciones E2E completas de OTP/mail requieren stack levantado + usuarios seed.
- Hay deuda natural de observabilidad (no hay stack logs centralizado Loki/Grafana aún).

## Reglas para reabrir OPS
- Abrir ticket/epic específico OPS.
- Ejecutar checklist de `docs/ops/OPS_RELEASE.md` completo.
- Correr scripts:
  - `bash scripts/ops/verify-ops.sh`
  - `bash scripts/ops/verify-tenant.sh`
- Adjuntar evidencia (requestId/audit rows/capturas Mailpit cuando aplique).

## Nota de coordinacion (Config/Security recovery)
- La recuperacion de configuracion/seguridad (tema, patentes, billing-series, processing-service, security-policy) NO modifica el alcance OPS.
- Hay una migracion nueva requerida para esos modulos:
  - `prisma/migrations/20260630130000_config_security_recovery`
- Si en ambientes viejos aparecen warnings de auditoria (`AuditLog.createdAt`), aplicar migraciones pendientes antes de continuar con pruebas de seguridad.
