# StarMedical – Módulo RRHH (SaaS)

- Multi-razón-social, multi-sucursal y puestos con vigencia. Código interno secuencial `EMP-000001` y DPI como identificador legal.
- Empleado ≠ usuario: relación opcional. Campos de contacto separados (móvil/casa), notas internas y flag `isExternal` para honorarios.
- Documentos versionados con visibilidad (personal/empresa/restringido) y control de vistas por empleado. Alertas por vencimiento 30/15/7 días y colegiado.
- Esquema de pago por relación laboral (`MONTHLY/DAILY/PER_SERVICE/HOURLY`), licencias profesionales, asignaciones de sucursal (con código) y puestos.
- Estructuras base para turnos/asistencia (templates, relojes biométricos, logs, cómputo diario), vacaciones/permisos, disciplina y evaluaciones.
- Permisos del módulo alineados a `<MODULE>:<AREA>:<ACTION>` (ej. `HR:EMPLOYEES:READ`, `HR:PAYROLL:PUBLISH`, `INV:STOCK:APPROVE`) y roles seed ADMIN/STAFF.

## Cómo correr
1) `npm install`
2) `npx prisma generate`
3) `npx prisma migrate dev --name hr_rrhh_module` (usa `DATABASE_URL` en `.env`)  
4) Seeds RRHH:
   - Seguro (default): `npx prisma db seed` → solo catálogos, conceptos y permisos (idempotente).
   - Demo: `SEED_MODE=demo npx prisma db seed` → crea empleados/demo `DEMO-*` si la BD está vacía (`DEMO_ONLY_IF_EMPTY=true` default).
   - Forzar demo aun con datos reales: `SEED_MODE=demo DEMO_ONLY_IF_EMPTY=false npx prisma db seed`
5) `npm run dev` y abre `/hr/employees`

## Tests (baseline vs legacy)
- Baseline local/CI: `npm test` (o `npm run test:baseline`)
  - Ejecuta suites unitarias/smoke estables de `tests/**/*.test.ts` y `src/tests/**/*.test.ts`.
- Legacy/integration: `npm run test:legacy`
  - Hoy incluye `tests/memberships.db.test.ts`, aislado por dependencia de esquema/runtime legacy (sale `SKIP` con razón).
  - Para ejecutar realmente la suite legacy: `npm run test:legacy:run`.
  - Ticket de reactivación: `TEST-LEGACY-001`.
- CI (`.github/workflows/ci.yml`) corre: `lint` + `typecheck` + `test:baseline`.
- CI no corre `test:legacy` por diseño hasta cerrar el ticket de migración.

## Seguridad / RBAC
- Catálogo único en `lib/security/permissionCatalog.ts` con la convención `<MODULE>:<AREA>:<ACTION>` (acciones estándar: READ, WRITE, EDIT, DELETE, APPROVE, PUBLISH, ADMIN). Marca `critical: true` para nómina/finanzas/inventario.
- Roles seed: ADMIN (todo, isSystem=true) y STAFF (mínimo: ver asistencia/perfil, agenda, inventario read). Seed idempotente los actualiza junto con `RolePermission`.
- Overrides por usuario (`UserPermission` con efecto `GRANT | DENY`) y cálculo efectivo en `computeUserPermissionProfile` / `buildEffectivePermissionSet`. `hasPermission` respeta DENY incluso si eres ADMIN.
- API auditada `/api/security/permissions` + UI `/admin/permissions` para asignar por rol o usuario (incluye confirmación extra para permisos críticos y bloqueo del último ADMIN).
- Para agregar un permiso nuevo: agrega la entrada al catálogo, corre `npx prisma db seed` (safe actualiza/crea), y luego asígnalo desde la matriz visual. No edites permisos directamente en DB.

## Rutas UI
- `/hr/employees` (listado con alertas de documentos/licencias)
- `/hr/employees/new` (wizard 3 pasos)
- `/hr/employees/[id]` (tabs: general, relación, asignaciones, documentos, colegiado)

## Seeds / catálogos
- Safe (default): LegalEntity (`StarMedical`, `AllenMKT`), Branch (`PAL`, `ESC`), HrDepartment/HrPosition (por nombre), ShiftTemplate base (Diurno 8x5, Sábado 5h, Nocturno), PayrollConcept por `code`, permisos/roles (catálogo completo). No crea empleados ni asistencia.
- Demo (opt-in): `SEED_MODE=demo npx prisma db seed` agrega empleados `DEMO-*`, asignaciones, engagement, turnos, relojes, logs, un AttendanceDay aprobado, leave aprobado, acción disciplinaria y evaluación. Se omite si hay empleados reales cuando `DEMO_ONLY_IF_EMPTY=true` (default); forzar con `DEMO_ONLY_IF_EMPTY=false`.

## Cierre diario de asistencia
- Procesa y cierra por día en `/hr/attendance/close`.
- API:
  - `POST /api/hr/attendance/close/process-day` → recalcula y detecta issues.
  - `GET /api/hr/attendance/close/status?date=` → lista por empleado con issues.
  - `POST /api/hr/attendance/close/resolve` → añadir OUT manual / nota / vincular leave.
  - `POST /api/hr/attendance/close/close-day` → cierra si no hay bloqueos.
- Bloqueos: `MISSING_OUT`, `NO_LEAVE_FOR_ABSENCE`, `OVERTIME_PENDING`, `DUPLICATE_LOGS` (requiere revisión). `closeStatus` queda `READY_TO_CLOSE` solo sin issues críticos.

## Alertas y seguridad
- Documentos y licencias generan severidad según vencimiento (<=7 días crítica, <=15 warning, <=30 info).
- Edición de documentos exige permiso `HR:DOCS:EDIT`; escritura general requiere `HR:WRITE` o rol ADMIN/HR_ADMIN; lectura permite `HR:READ`.

---

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
