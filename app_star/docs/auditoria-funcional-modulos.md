# Auditoría funcional por módulo – StarMedical ERP (App Router / Prisma / Postgres)

> Fuente: rutas `app/**/page.tsx`, APIs `app/api/**/route.ts`, y nomenclatura Prisma. Solo lectura; no se modificó lógica.

---

## Comercial – Clientes
1) Propósito: gestionar clientes/personas/empresas y su configuración básica.
2) Roles/permisos: `CLIENTS:*` (inferido de módulos CRM), probable gate por `requireAuth` + rbac.
3) Flujos principales:
   - Alta/edición de clientes y configuración (`/admin/clientes`, `/admin/clientes/configuracion`).
   - Listado/segmentación (`/admin/clientes/lista`).
4) UI: `/admin/clientes`, `/admin/clientes/lista`, `/admin/clientes/configuracion`.
5) APIs: `/api/clientes/importar`, `/api/clientes/plantilla-excel`, CRM endpoints reutilizados para contactos/cuentas.
6) Prisma: `ClientProfile`, `Contact`, `Crm*` tablas asociadas.
7) Estado: ✅ usable (rutas y APIs presentes).
8) Deuda/duplicidad: ninguna evidente.
9) Recomendación: mantener; alinear naming de permisos a prefijo `CLIENTS`.

## Comercial – CRM
1) Propósito: pipeline de ventas B2B/B2C, actividades, cotizaciones, deals.
2) Roles/permisos: `CRM:*` (p. ej. `CRM:PIPELINES`, `CRM:DEALS`, `CRM:QUOTES`, `CRM:ACTIVITIES`), requiere auth.
3) Flujos principales:
   - Dashboards y métricas (`/admin/crm`, `/dashboard`).
   - Gestión de leads/deals/pipeline (`/admin/crm/deal/[id]`, `/pipeline`, `/list`, `/leads-*`).
   - Cotizaciones v1/v2 (`/admin/crm/*quotes*`), generación PDF, aprobaciones.
   - Actividades y calendario (`/admin/crm/actividades`, `/calendario`).
4) UI: `/admin/crm` + subrutas: `actividades`, `audit`, `calendario`, `configuracion`, `contactos`, `cuentas`, `dashboard`, `deal/[id]`, `empresas`, `inbox`, `leads-empresas`, `leads-pacientes`, `list`, `new`, `pacientes`, `pipeline`, `settings`.
5) APIs: `/api/crm/*` (accounts, activities, audit, calendar, contacts, dashboard-metrics, deals, leads, pipelines, quotes/quotes-v2, tasks, jobs/run, search-client).
6) Prisma: `CrmDeal`, `CrmPipeline`, `CrmQuote`, `CrmActivity`, `CrmTask`, `CrmPipelineStage`, etc.
7) Estado: ✅ usable (múltiples endpoints y UI completa).
8) Deuda: duplicidad quotes v1/v2; revisar convivencia. Inbox CRM y “inbox WhatsApp” son dominios distintos.
9) Recomendación: mantener; plan de retirar quotes v1 cuando v2 sea única.

## Comercial – Membresías
1) Propósito: venta/gestión de contratos de membresía y planes.
2) Roles/permisos: `MEMBERSHIPS:*` (`ADMIN/READ/WRITE/PLANS/CONTRACTS`), auth obligatoria.
3) Flujos principales:
   - Dashboard y alertas (`/admin/membresias`).
   - Gestión de contratos (`/admin/membresias/contratos`, imprimir, estado/pago).
   - Planes (`/admin/membresias/planes`), configuración (`/admin/membresias/configuracion`), impresión.
4) UI: `/admin/membresias`, `contratos`, `planes`, `impresion`, `configuracion`.
5) APIs: Canónico `/api/memberships/*` (clients, config, dashboard, contracts, plans); Legacy `/api/membresias/*` con `@deprecated` wrappers.
6) Prisma: `MembershipPlan`, `MembershipContract`, `MembershipBenefit`, `MembershipPayment` (nombres inferidos), `ClientProfile`.
7) Estado: ✅ usable; legacy APIs presentes como alias.
8) Deuda: doble dominio API (`/api/membresias/*`); mantener como alias hasta migración externa.
9) Recomendación: continuar usando canónico; plan de retiro de legacy endpoints.

## Comercial – Agenda
1) Propósito: agenda de citas.
2) Roles/permisos: `AGENDA:*` (inferido), auth.
3) Flujos principales:
   - Agenda general (`/admin/agenda`).
   - Citas (`/admin/agenda/citas`).
   - Configuración (`/admin/agenda/configuracion`).
4) UI: `/admin/agenda`, `/admin/agenda/citas`, `/admin/agenda/configuracion`.
5) APIs: `/api/agenda`, `/api/agenda/updates`.
6) Prisma: `Appointment`, `WorkSchedule`, `Room`, `AppointmentType`.
7) Estado: ✅ usable.
8) Deuda: mínima; validar permisos explícitos.
9) Recomendación: mantener; alinear nombres de permisos si falta.

---

## Administración – Usuarios
1) Propósito: gestión de usuarios y roles.
2) Roles/permisos: `USERS:*`, `RBAC:*`, `SYSTEM:ADMIN`.
3) Flujos principales:
   - Listado/creación/edición (`/admin/usuarios`, `/admin/usuarios/lista`).
   - Configuración y permisos (`/admin/usuarios/configuracion`, `/admin/usuarios/permisos`, `/admin/permissions`).
4) UI: `/admin/usuarios`, `lista`, `configuracion`, `permisos`.
5) APIs: `/api/users`, `/api/users/[id]/link-hr`, `/unlink-hr`, `hr-link`; `/api/admin/rbac/roles`, `/api/admin/permissions/sync`.
6) Prisma: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `UserPermission`.
7) Estado: ✅ usable.
8) Deuda: asegurar un solo flujo de permisos (roles vs user overrides).
9) Recomendación: mantener; documentar tokens de bootstrap ya existentes.

## Administración – RRHH
1) Propósito: empleados, asistencia, nómina.
2) Roles/permisos: `HR:*`, `HR:ATTENDANCE:*`, `HR:PAYROLL:*`, `HR:EMPLOYEES:*`.
3) Flujos principales:
   - Gestión de empleados (alta, onboarding, archivos, disciplina, transfer, archive).
   - Asistencia: marcajes, incidencias, cierres diarios, logs.
   - Nómina: corridas, publicación, export, payslip.
   - Settings y dashboard.
4) UI: `/hr`, `/hr/employees`, `/hr/employees/*`, `/hr/attendance`, `/hr/attendance/logs`, `/hr/payroll`, `/hr/settings`.
5) APIs: `/api/hr/*` (employees, attendance, payroll, branches, departments, positions, settings, dashboard).
6) Prisma: `HrEmployee`, `HrDepartment`, `HrPosition`, `Attendance*`, `Payroll*`, `Leave*`, `DisciplinaryAction`, `ProfessionalLicense`.
7) Estado: ✅ usable; amplio set de endpoints y seeds.
8) Deuda: gran cantidad de rutas; consolidar ONBOARDING vs step routes; revisar FakeTx en rawpipeline (deuda técnica conocida).
9) Recomendación: mantener; plan de refactor incremental en engine de asistencia.

## Administración – Inventario
1) Propósito: productos/servicios, movimientos, órdenes/solicitudes, reportes.
2) Roles/permisos: `INV:*`, `INVENTORY:*`.
3) Flujos principales:
   - Catálogos (categorías/subcategorías productos/servicios).
   - Stock y Kárdex, movimientos y reportes programados.
   - Órdenes de compra, solicitudes, integridad y QA.
4) UI: `/admin/inventario`, `/explorar`, `/movimientos`, `/ordenes`, `/solicitudes`, `/productos`, `/servicios`, `/combos`, `/configuracion`, `/configuracion/precios-matriz`.
5) APIs: `/api/inventario/*` (productos/servicios, combos, movimientos/export, QA, reports/run, email-schedules, margin-policy, integrity, import/export plantillas).
6) Prisma: `Product`, `Service`, `InventoryMovement`, `InventoryArea`, `InventoryReportLog`, `PurchaseOrder`, `PurchaseRequest`, `Combo*`, `PriceMatrix`.
7) Estado: ✅ usable.
8) Deuda: endpoints de QA/test múltiples; revisar duplicidad de reportes.
9) Recomendación: mantener; priorizar hardening de import/export.

## Administración – Finanzas
1) Propósito: cuentas, transacciones, pagos/cobros, contabilidad ligera.
2) Roles/permisos: `FIN:*`, `FINANCE:*`, `ACCOUNTING:*`.
3) Flujos principales:
   - Cuentas financieras y categorías.
   - Journal entries (post/reverse), payables/receivables, payments.
   - Resúmenes y adjuntos.
4) UI: `/admin/finanzas`.
5) APIs: `/api/finanzas/*` (accounts, categories, transactions, journal-entries, payables, receivables, payments, summary, attachments, legal-entities, parties).
6) Prisma: `FinancialAccount`, `Transaction`, `JournalEntry`, `Payable`, `Receivable`, `Payment`, `FinanceCategory/Subcategory`, `LegalEntity`, `Party`.
7) Estado: 🟡 incompleto (UI única, muchos endpoints → probable WIP).
8) Deuda: validar coverage UI vs endpoints; falta navegación interna.
9) Recomendación: añadir vistas internas o esconder hasta completar.

## Administración – Configuración
1) Propósito: identidad, integraciones, invoice/mail configs, RBAC bridge.
2) Roles/permisos: `SYSTEM:ADMIN`, `CONFIG:*`.
3) Flujos principales:
   - Identidad (`/api/config/identity`), integraciones (attendance/lab), invoice/mail modules, APIs config.
   - UI en `/admin/configuracion`.
4) UI: `/admin/configuracion`, `/admin/configuracion/marcaje`.
5) APIs: `/api/config/*` (apis, app, identity, integrations attendance/lab, invoice, mail modules/global, rbac).
6) Prisma: `IdentityConfig`, `IntegrationConfig`, `InvoiceConfig`, `MailModuleAccount`, `ApiIntegrationConfig` (nombres inferidos de endpoints).
7) Estado: ✅ usable básico.
8) Deuda: organizar settings en tabs; marcar dependencias externas.
9) Recomendación: mantener; priorizar UX de configuración.

---

## Clínica – Diagnóstico Clínico
1) Propósito: órdenes diagnósticas, worklists de imagen/lab, reportes y health checks.
2) Roles/permisos: `DIAGNOSTICS:*`, `LAB:*`, `IMAGING:*`.
3) Flujos principales:
   - Órdenes (`/diagnostics/orders`, pagar `/api/diagnostics/orders/[id]/pay`).
   - Catálogo diagnóstico (`/diagnostics/catalog`).
   - Worklists: imaging (`/imaging/worklist`, `xray`, `us`, `studies/[id]`), lab (`/lab/worklist`).
   - Reportes (sign/release) y resultados (lab release/validate).
   - Health checks (/diagnostics/health-checks).
4) UI: `/diagnostics`, `/diagnostics/orders`, `/diagnostics/catalog`, `/diagnostics/integrations`, imaging subrutas, lab worklist, health-checks.
5) APIs: `/api/diagnostics/*` (orders, patients, catalog, imaging reports/sign/release, imaging studies, lab results/validate/release, lab specimens).
6) Prisma: `DiagnosticOrder`, `DiagnosticItem`, `LabSpecimen`, `LabResult`, `ImagingReport`, `ImagingStudy`.
7) Estado: ✅ usable; health checks reubicado.
8) Deuda: validar consistencia de múltiples worklists; integrar health-checks dashboard en menú clínico.
9) Recomendación: mantener; consolidar views de imaging vs lab.

---

## Comunicaciones – WhatsApp
1) Propósito: bandeja, contactos, flujos, métricas y automatizaciones específicas de WhatsApp.
2) Roles/permisos: `WHATSAPP:*` (inferido), auth.
3) Flujos principales:
   - Inbox, contacts, flows, communications programadas, metrics, settings.
   - Automatizaciones WhatsApp (`/ops/whatsapp/automations` y subrutas).
4) UI oficial: `/ops/whatsapp` (+ inbox, contacts, flows, communications, metrics, settings, automations, automations/[id]).
5) APIs: `/api/whatsapp/send`, `/api/whatsapp/threads`; gateway en `service/whatsappGateway.ts`.
6) Prisma: probable `WhatsAppThread`, `WhatsAppMessage`, `WhatsAppContact` (nombres inferidos; revisar schema para confirmación).
7) Estado: ✅ usable; legacy `/whatsapp/*` ya redirige.
8) Deuda: revisar duplicidad “Automatización Clínica” naming en `OpsShell`; alinear permisos.
9) Recomendación: mantener; completar suite de APIs (threads/messages CRUD si falta).

---

## Sistema – Automatizaciones (global)
1) Propósito: motor general de automatizaciones del ERP.
2) Roles/permisos: `AUTOMATIONS:*` (inferido), auth.
3) Flujos principales:
   - Listado y creación de borradores (`/automations`).
   - Uso de plantillas por módulo (RRHH, Diagnóstico, Marketing, Finanzas).
4) UI: `/automations`.
5) APIs: `/api/automations` (list/create).
6) Prisma: probable `Automation`, `AutomationTemplate`, `AutomationTrigger` (nombres inferidos).
7) Estado: 🟡 incompleto (UI demo con fetch/create; motor real por completar).
8) Deuda: consolidar con automatizaciones WhatsApp y definir modelo definitivo.
9) Recomendación: mantener visible; priorizar diseño de motor canónico.

---

## Transversal – Marcaje
1) Propósito: marcaje de asistencia y gestión de tokens/punch.
2) Roles/permisos: público para marcar (tokens), administrativo para gestión; permisos `HR:ATTENDANCE:*`.
3) Flujos principales:
   - Marcaje público `/marcaje` y tokens `/marcaje/tokens`.
   - Punch con token `/punch/[token]`.
   - Configuración admin `/admin/configuracion/marcaje`.
4) UI: `/marcaje`, `/marcaje/tokens`, `/punch/[token]`; admin config en `/admin/configuracion/marcaje`.
5) APIs: `/api/marcaje/raw`, `/api/marcaje/status`, attendance APIs (punch-config, punch-tokens CRUD).
6) Prisma: `AttendancePunchToken`, `AttendanceRecord`, `AttendanceDay`, `HrEmployee`.
7) Estado: ✅ usable.
8) Deuda: separar claramente UI pública vs interna; considerar subitem “Tokens” (no top-level).
9) Recomendación: mantener; añadir subnavegación interna si se requiere gestión frecuente.
