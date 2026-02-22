# StarMedical – Módulo RRHH (SaaS)

- Multi-razón-social, multi-sucursal y puestos con vigencia. Código interno secuencial `EMP-000001` y DPI como identificador legal.
- Empleado ≠ usuario: relación opcional. Campos de contacto separados (móvil/casa), notas internas y flag `isExternal` para honorarios.
- Documentos versionados con visibilidad (personal/empresa/restringido) y control de vistas por empleado. Alertas por vencimiento 30/15/7 días y colegiado.
- Esquema de pago por relación laboral (`MONTHLY/DAILY/PER_SERVICE/HOURLY`), licencias profesionales, asignaciones de sucursal (con código) y puestos.
- Estructuras base para turnos/asistencia (templates, relojes biométricos, logs, cómputo diario), vacaciones/permisos, disciplina y evaluaciones.
- Permisos del módulo alineados a `<MODULE>:<AREA>:<ACTION>` (ej. `HR:EMPLOYEES:READ`, `HR:PAYROLL:PUBLISH`, `INV:STOCK:APPROVE`) y roles seed ADMIN/STAFF.

## Cómo correr (dev/staging)
1) `npm install`
2) Configura `.env` con `DATABASE_URL` (y `DIRECT_URL` si usas pooler).
3) `npm run dev:setup`  
   - Ejecuta `prisma generate`, `prisma migrate deploy` y seeds idempotentes (RBAC + RRHH base + catálogos).
4) (Opcional) Demo seed: `SEED_MODE=demo npm run db:seed` (`DEMO_ONLY_IF_EMPTY=true` por defecto).
5) `npm run dev` y abre `/hr` o `/hr/employees`

Reset solo local: `npm run dev:reset` (bloqueado si `NODE_ENV=production`).
Runbook detallado: `RUNBOOK_DEV_SETUP.md`.

### Clientes (Vista rápida Personas)
- Para probar `Ver ficha` con una persona real: `npm run db:seed:clients`
- El seed es idempotente y en dev:
  - limpia personas demo marcadas (`@starmedical.test` o DPI `1000000000...`) archivándolas;
  - garantiza una persona real de prueba (`maria.real@starmedical.com`, DPI `1234567890101`);
  - imprime `realPersonId` para pruebas directas en `/admin/clientes/{id}`.

### Configuración Central (operativo mínimo)
- Seed idempotente para operación base: `npm run db:seed:central-config`
- Garantiza sin duplicar:
  - sucursal `PALIN` activa;
  - un horario vigente no vacío para Palín;
  - `TenantThemeConfig` global con base StarMedical;
  - establecimiento SAT `PALIN-001` en modo draft (`isActive=false`).
- Opcional FEL base: `SEED_CENTRAL_CONFIG_INCLUDE_FEL=1 npm run db:seed:central-config`.
- Rutina QA operativa (smoke + guardrails): `npm run qa:config-central`
  - Requiere autenticación admin en DEV via cookie:
    - `export STAR_ERP_SESSION="<jwt>"` o
    - `export STAR_ERP_COOKIE="star-erp-session=<jwt>"`
  - También acepta:
    - `export STAR_ERP_COOKIE="<jwt>"` (el script antepone `star-erp-session=` automáticamente).
  - Runner automático DEV (genera JWT temporal y ejecuta QA):
    - `npm run qa:config-central:dev`
    - Bloqueado en `NODE_ENV=production`.
  - Ejemplo DEV para generar sesión admin temporal:
    - `export STAR_ERP_SESSION="$(node --input-type=module -e "import jwt from 'jsonwebtoken'; const p={id:'dev-admin',email:'dev-admin@local',roles:['ADMIN'],permissions:['SYSTEM:ADMIN','CONFIG_BRANCH_READ','CONFIG_BRANCH_WRITE','CONFIG_SAT_READ','CONFIG_SAT_WRITE','CONFIG_THEME_READ','CONFIG_THEME_WRITE']}; console.log(jwt.sign(p, process.env.AUTH_SECRET || 'dev-star-secret', {expiresIn:'1h'}));")"`
  - Endpoint base opcional: `export CONFIG_CENTRAL_BASE_URL="http://localhost:3000"`
- Gate de readiness para CI:
  - `npm run qa:config-central:readiness`
  - Opcional smoke HTTP en CI:
    - `CONFIG_CENTRAL_SMOKE_URL="https://.../api/admin/config/smoke"`
    - `CONFIG_CENTRAL_SMOKE_COOKIE="star-erp-session=..."`

### Correo Sandbox (Mailpit, multi-tenant)
- Objetivo: aislar correos por tenant en DEV/QA sin exponer la UI nativa de Mailpit a usuarios finales.
- Levantar Mailpit local:
  - `docker run --rm -p 1025:1025 -p 8025:8025 axllent/mailpit:latest`
- Configurar en ERP (`/admin/configuracion` → `Avanzado` → `Correo` → `Sandbox Email (Mailpit)`):
  - `Habilitar sandbox Mailpit`
  - `Mailpit host` (ej. `127.0.0.1`)
  - `SMTP port` (default `1025`)
  - `API port` (default `8025`)
  - `Alias domain` (default `sandbox.starmedical.test`)
  - `Retención (días)` y `Bloquear PHI`
  - `modeDefault` por tenant: `inherit | override`
  - `tenantModes` JSON para overrides por tenant.
- Endpoints admin:
  - `GET/PUT /api/admin/config/email/sandbox/settings`
  - `GET /api/admin/config/email/sandbox/inbox?tenantId=<id>`
  - `GET /api/admin/config/email/sandbox/inbox/[id]?tenantId=<id>`
- Seguridad:
  - Requieren sesión (`requireAuth`) y RBAC:
    - `CONFIG_EMAIL_READ` / `CONFIG_EMAIL_WRITE` para settings
    - `CONFIG_EMAIL_SANDBOX_READ` para inbox
  - Contrato estándar de error (`403/422/503`).
- Envíos sandbox agregan headers:
  - `X-Tenant-Id`, `X-Env`, `X-Module`
  - Alias de destinatario por tenant: `${tenantSlug}+${type}@sandbox.starmedical.test`.

## Dev DB con Docker
- Arrancar Postgres local: `npm run db:up` (usa `docker-compose.yml`, Postgres 16 con volumen `pgdata`). PgAdmin opcional: `docker compose --profile pgadmin up -d pgadmin` (puerto 5050).
- Generar cliente y aplicar schema: `npm run db:generate && npm run db:migrate` (usa migrations de `prisma/migrations`; si fallan por drift, usar solo en dev `npx prisma db push` bajo tu propio riesgo).
- Seeds base/demo: `npm run db:seed` (`SEED_MODE=demo` para datos de ejemplo, idempotente). Studio: `npm run db:studio`.
- Parar/limpiar: `npm run db:down`; reset completo (borra datos y volumen): `npm run db:reset` (down -v, up, `prisma migrate dev`, seed).
- Puertos ocupados: cambia el mapeo `5432:5432` en `docker-compose.yml` o libera con `lsof -i :5432`.
- Shadow DB: `SHADOW_DATABASE_URL` apunta a `starmedical_shadow`; Prisma la crea/borrará automáticamente en migraciones.
- Usa `.env.local` (local Docker) para Prisma/Next; deja las credenciales de Supabase en `.env.supabase.example` para referencia.
- Migrations legacy archivadas por drift en `prisma/migrations__legacy/`; la nueva baseline es `prisma/migrations/20260126230520_baseline` y es la referencia para DEV hacia adelante.

## RRHH Asistencia – variables y comandos útiles
- Env requeridos:  
  - `DATABASE_URL` (y `DIRECT_URL` si usas pooler).  
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (solo si habilitas correos de marcaje).  
  - `APP_ENCRYPTION_KEY` (32 bytes base64/hex/utf8) para guardar `openaiApiKeyEnc`.  
  - `OPENAI_API_KEY` (opcional; fallback si no hay clave cifrada).
- Migraciones: `npx prisma validate` → `npx prisma migrate status` → `npx prisma migrate dev --name <cambio>` (usa DB local; no aplicar dev a prod).  
- Tests rápidos: `npm test` (incluye reglas de asistencia/mark-in/out).  
- Lint/typecheck: `npm run lint && npm run typecheck`.

## Seguridad / RBAC
- Catálogo único en `lib/security/permissionCatalog.ts` con la convención `<MODULE>:<AREA>:<ACTION>`. RRHH usa:  
  - `HR:DASHBOARD:READ`
  - `HR:EMPLOYEES:{READ,WRITE,STATUS}`  
  - `HR:DOCS:{READ,UPLOAD,RESTRICTED}`  
  - `HR:ATTENDANCE:{READ,WRITE,CLOSE}`  
  - `HR:PAYROLL:{READ,WRITE,APPROVE,PUBLISH}`  
  - `HR:SETTINGS:{READ,WRITE}`
- Roles seed (matriz base, solo permisos explícitos):  
  - **ADMIN**: todos los permisos.  
  - **HR_ADMIN**: todos los HR:* incluidos DOCS:RESTRICTED, ATTENDANCE:CLOSE y PAYROLL:PUBLISH.  
  - **HR_USER**: HR:EMPLOYEES:{READ,WRITE}, HR:DOCS:{READ,UPLOAD}, HR:ATTENDANCE:{READ,WRITE}, HR:PAYROLL:READ.  
  - **STAFF**: HR:EMPLOYEES:READ, HR:DOCS:READ, HR:ATTENDANCE:READ (backend restringe a su propio perfil/doc personal).  
  - **VIEWER**: HR:EMPLOYEES:READ.
- Overrides por usuario (`UserPermission` con efecto `GRANT | DENY`) y cálculo efectivo en `computeUserPermissionProfile` / `buildEffectivePermissionSet`. `hasPermission` respeta DENY.
- Para agregar un permiso nuevo: decláralo en el catálogo, corre `npx prisma db seed` para sincronizar la DB y asigna desde la matriz de roles/usuarios. No uses strings sueltos.

### SUPER_ADMIN (propietario)
- Define `SUPER_ADMIN_EMAIL` (dueño del ERP) y `SUPER_ADMIN_PASSWORD` en el shell/CI (password solo requerido la primera vez; usa `SUPER_ADMIN_FORCE_PASSWORD=true` para rotarlo).
- Ejecuta `node --loader ts-node/esm scripts/bootstrap-super-admin.ts` (o `npm run bootstrap:superadmin`) para crear/activar el usuario Nelson Lopez, asignar rol SUPER_ADMIN y perfil RRHH interno.
- SUPER_ADMIN bypass de permisos; no deshabilita seguridad para otros roles.

## Flujo RRHH → Nómina
- Onboarding: step1 (identidad), step2 (relación + compensación) crea `EmployeeCompensation` activa, step3 (documentos/acceso) solo queda ACTIVE si hay engagement + compensación vigente.
- Asistencia: `AttendanceDay.closeStatus` es fuente de verdad; nómina se bloquea si hay días OPEN/NEEDS_REVIEW en el período.
- Nómina:
  - Elegibles: empleados ACTIVE sin termination, con engagement primario en la razón social y `EmployeeCompensation` vigente (dependencia).
  - Corrida (`PayrollRun`) se crea en DRAFT con snapshot de compensación/bonos/horas extra aprobadas; cambios posteriores no mutan la corrida.
  - APPROVE requiere asistencia cerrada; PUBLISH genera `PayrollFinanceRecord` (no ejecuta pagos).
  - Estados: DRAFT → APPROVED → PUBLISHED (sin recalcular después de aprobado).

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
- Documentos: subir/actualizar requiere `HR:DOCS:UPLOAD` y visibilidad restringida requiere además `HR:DOCS:RESTRICTED`; lectura general `HR:DOCS:READ`.

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
