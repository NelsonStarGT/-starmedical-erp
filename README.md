# Inventario – Solicitudes, Órdenes y Reportes automáticos

## Flujos nuevos
- **Solicitudes de productos** (`/admin/inventario/solicitudes`): operador crea/enviar, admin aprueba/rechaza y genera orden de compra. Códigos automáticos `PR-000001`.
- **Órdenes de compra** (`/admin/inventario/ordenes`): admin crea (desde solicitud aprobada o directa), envía, cancela y registra recepción. Cada recepción genera movimiento `ENTRY` en Kárdex y actualiza costo promedio/stock. Códigos `PO-000001`.
- Recepción exige referencia de factura/guía y no permite recibir más de lo pendiente.
- **Movimientos** (`/admin/inventario/movimientos`): pestaña de reporte filtrable (fechas, sucursal, tipo, producto, usuario) con resumen, paginación, PDF oficial y envío a correos configurados.
- **Reportes automáticos de inventario**: configuración en `/admin/inventario/configuracion` y endpoint `POST /api/inventario/reports/run` que envía XLSX de Kárdex o PDF de Movimientos según `reportType` (exceljs/pdf-lib + Nodemailer SMTP).
  - Deduplica períodos usando `InventoryReportLog` y `lastSentAt` para evitar doble envío.

## Variables de entorno
- `INVENTORY_API_ADMIN_TOKEN`, `INVENTORY_API_OPERATOR_TOKEN`, `INVENTORY_API_RECEPCION_TOKEN`: tokens Bearer/`x-inventory-token` para roles (auth server-side).
- `INVENTORY_REPORT_CRON_TOKEN`: token secreto para `/api/inventario/reports/run` (header `x-cron-token`).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`: credenciales SMTP para envíos automáticos.
- `NEXT_PUBLIC_INVENTORY_TOKEN`: token que el frontend usa en headers `x-inventory-token` para consumir las APIs protegidas.

## Scheduler externo
Invoca `POST /api/inventario/reports/run` con header `x-cron-token: $INVENTORY_REPORT_CRON_TOKEN`.

Ejemplos (ajusta host/token):
```bash
# Diario 23:55
curl -X POST https://tu-host/api/inventario/reports/run \
  -H "x-cron-token: $INVENTORY_REPORT_CRON_TOKEN"

# Semanal (domingo 23:55)
# Programa el cron para ejecutar el curl anterior semanalmente.

# Quincenal (15 y 30)
# Programa 0 23 15,30 * * /ruta/al/curl…

# Mensual (último día)
# Programa 0 23 L * * /ruta/al/curl…  (según sintaxis de tu cron runner)
```

Frecuencias:
- **DAILY**: hoy 00:00–23:59
- **WEEKLY**: últimos 7 días
- **BIWEEKLY**: últimos 15 días
- **MONTHLY**: mes en curso

## Endpoints principales
- Solicitudes: `GET/POST /api/inventario/solicitudes`, `GET/PATCH /api/inventario/solicitudes/[id]`
- Órdenes: `GET/POST /api/inventario/ordenes`, `GET/PATCH /api/inventario/ordenes/[id]`
- Reportes: `GET/POST /api/inventario/reports/settings`, `POST /api/inventario/reports/run`
- Movimientos: `GET /api/inventario/movimientos/export/pdf`, `POST /api/inventario/movimientos/send`

Todas las acciones sensibles validan token y rol via `lib/api/auth.ts` (server-side).
