# Auditoría de módulos y navegación (Next.js App Router)

## 1) Sidebar actual
Fuente: `components/layout/Sidebar.tsx` (`navItems`).

| Label                | Href                 | Sección | Estado |
|----------------------|----------------------|---------|--------|
| Inicio               | /admin               | root    | activo |
| Usuarios             | /admin/usuarios      | root    | activo |
| Clientes             | /admin/clientes      | root    | activo |
| Membresías           | /admin/membresias    | root    | activo |
| CRM                  | /admin/crm           | root    | activo |
| Operaciones          | /ops/whatsapp        | root    | activo |
| Agenda               | /admin/agenda        | root    | activo |
| Marcaje              | /marcaje             | root    | activo |
| Inventario           | /admin/inventario    | root    | activo |
| Finanzas             | /admin/finanzas      | root    | activo |
| RRHH                 | /hr                  | root    | activo |
| Diagnóstico Clínico  | /diagnostics/orders  | root    | activo |
| Health checks        | /admin/health        | root    | activo |
| Facturación          | /admin/facturacion   | root    | **disabled** (sin página) |
| Configuración        | /admin/configuracion | root    | activo |

## 2) Inventario real de rutas UI (`app/**/page.tsx`)
Agrupado por prefijo.

- Raíz / autenticación: `/` → app/page.tsx (redirect); `/login` → app/login/page.tsx.
- Admin general: `/admin` → app/admin/page.tsx.
- Admin > Agenda: `/admin/agenda` (page), `/admin/agenda/citas`, `/admin/agenda/configuracion`.
- Admin > Clientes: `/admin/clientes` (page), `/admin/clientes/lista`, `/admin/clientes/configuracion`.
- Admin > Usuarios: `/admin/usuarios`, `/admin/usuarios/lista`, `/admin/usuarios/configuracion`, `/admin/usuarios/permisos`.
- Admin > Permisos: `/admin/permissions`.
- Admin > Membresías: `/admin/membresias`, `/admin/membresias/contratos`, `/admin/membresias/planes`, `/admin/membresias/impresion`, `/admin/membresias/configuracion`.
- Admin > CRM: `/admin/crm` más subrutas: `/actividades`, `/audit`, `/calendario`, `/configuracion`, `/config/pipeline`, `/contactos`, `/cuentas`, `/dashboard`, `/deal/[id]`, `/empresas`, `/inbox`, `/leads-empresas`, `/leads-pacientes`, `/list`, `/new`, `/pacientes`, `/pipeline`, `/settings`.
- Admin > Inventario: `/admin/inventario`, `/inventario/combos`, `/configuracion`, `/configuracion/precios-matriz`, `/explorar`, `/movimientos`, `/ordenes`, `/ordenes/[id]`, `/productos`, `/servicios`, `/solicitudes`, `/solicitudes/[id]`.
- Admin > Finanzas: `/admin/finanzas`.
- Admin > Health: `/admin/health`.
- Admin > Configuración: `/admin/configuracion`, `/admin/configuracion/marcaje`.
- HR: `/hr`, `/hr/attendance`, `/hr/attendance/logs`, `/hr/attendance/[id]`, `/hr/employees`, `/hr/employees/new`, `/hr/employees/[id]`, `/hr/employees/archived`, `/hr/employees/pending`, `/hr/payroll`, `/hr/payroll/[id]`, `/hr/settings`.
- Diagnóstico: `/diagnostics`, `/diagnostics/orders`, `/diagnostics/catalog`, `/diagnostics/integrations`, imaging worklists (`/diagnostics/imaging/worklist`, `/imaging/xray/worklist`, `/imaging/us/worklist`, `/imaging/studies/[id]`), laboratorio (`/diagnostics/lab/worklist`).
- Operaciones (OPS): `/ops`, `/ops/whatsapp`, `/ops/whatsapp/automations`, `/ops/whatsapp/automations/[id]`, `/ops/whatsapp/communications`, `/ops/whatsapp/contacts`, `/ops/whatsapp/flows`, `/ops/whatsapp/inbox`, `/ops/whatsapp/metrics`, `/ops/whatsapp/settings`.
- WhatsApp (legacy público): `/whatsapp`, `/whatsapp/automations`, `/whatsapp/contacts`, `/whatsapp/flows`, `/whatsapp/inbox`, `/whatsapp/metrics`.
- Marcaje público: `/marcaje`, `/marcaje/tokens`.
- Automations: `/automations`.
- Punch token: `/punch/[token]`.
- Dev util: `/dev/text-editor`.

## 3) Inventario de APIs (`app/api/**/route.ts`)
Métodos detectados por export explícito; “(sin declarar)” indica que el archivo define handler interno (revisar para confirmar).

- /api/admin:  
  - job-roles (GET)  
  - locations/departments (GET,POST,PATCH)  
  - locations/municipalities (GET,POST,PATCH)  
  - permissions/sync (POST)  
  - rbac/roles (GET)
- /api/agenda: `route.ts`, `updates/route.ts` (sin declarar) – feeds/actualizaciones agenda.
- /api/ai/parse-attendance (sin declarar) – parser IA de asistencia.
- /api/attendance: config (GET,POST), import/raw, process, raw/process (sin declarar), punch-config/[token] (GET), punch-tokens (GET,POST, DELETE por id), raw (POST).  
- /api/auth/whoami (sin declarar) – sesión actual.
- /api/automations (sin declarar) – motor de automatizaciones.
- /api/clientes: importar, plantilla-excel (sin declarar).
- /api/config: apis (/[key], test, list), app, identity, integrations attendance/lab (y test), invoice (y test), mail global/modules, rbac (todos sin declarar).
- /api/crm: accounts, activities, audit, calendar, contacts, dashboard-metrics, deals (+pipeline, inbox), jobs/run, leads (/convert), pipelines (+rules, stages), quotes (v1/v2 + actions approve/reject/send/pdf), requests, search-client, tasks (todos sin declarar explícito).
- /api/diagnostics: catalog, imaging reports (release/sign), imaging studies, lab results (validate/release), lab specimens, orders (+pay), patients (sin declarar).
- /api/files/[id] (sin declarar) – descarga/stream de archivos.
- /api/finanzas: accounts, attachments, categories, financial-accounts, journal-entries (post/reverse), legal-entities, parties, payables, payments, receivables, subcategories, summary, transactions (sin declarar).
- /api/hr attendance: assignments (GET,POST / PATCH,DELETE por id), day (GET), employee/[id]/daily (GET), employee/[id] (GET), event (POST / PATCH,DELETE por id), incidents (GET), logs/manual/mark-in/mark-out/process-day/today/route (varios sin declarar), processed (GET), raw (POST), shifts (GET,POST / PATCH per id / set-default POST), sites (GET), route (sin declarar).  
- /api/hr core: branches, dashboard, departments (sin declarar), employees (GET; quick-create POST; archived/pending GET; step-*; transfer; suspend/terminate/activate/archive; compensation; disciplinary; documents; warnings; draft DELETE) – varios sin declarar.  
- /api/hr payroll: / route (GET,POST), /[id] (GET,PATCH), approve/publish/recalculate (POST / recalc sin declarar), export (GET), export.csv (GET), employees subroutes (email POST, export.csv GET, payslip.pdf GET), line/[lineId] PATCH, preview GET.  
- /api/hr positions/settings (sin declarar).
- /api/integrations: hl7/oru, openai/test (sin declarar).
- /api/inventario: categorías (productos/servicios), subcategorías, productos/servicios (+bulk), combos (+bulk), solicitudes, ordenes, movimientos (export/send), QA, email-schedules, margin-policy, integrity, prices/matrix (export/import), reports (run/settings/test, cierre-sat export/pdf/xlsx), auditoria export, plantillas importar, reset (casi todos sin declarar).
- /api/login, /api/logout (sin declarar) – auth.
- /api/marcaje: raw (GET), status (GET).
- /api/me (sin declarar).
- /api/memberships (inglés): clients (GET), config (GET,POST), contracts (GET,POST; id GET; status/payment POST), dashboard GET, plans (GET; status POST).
- /api/membresias (espejo en español): clientes GET, config GET/POST, contratos (GET/POST; id GET; pago POST; estado sin declarar), dashboard GET, planes GET; planes/[id]/estado sin declarar.
- /api/text-docs: listado/export/upload/single (sin declarar).
- /api/upload: image, logo (sin declarar).
- /api/users: listado/crear (GET,POST), link-hr/unlink-hr (POST), hr-link (sin declarar).
- /api/whatsapp: send, threads (sin declarar).

## 4) Matriz de consistencia
- Sidebar sin ruta existente: **Facturación** (/admin/facturacion) está deshabilitado y no hay `app/admin/facturacion/page.tsx`.
- Rutas visibles en sidebar pero con solapamiento de semántica:  
  - **Operaciones → /ops/whatsapp** realmente es módulo de WhatsApp/comunicaciones.  
  - **Health checks** debería pertenecer a Diagnóstico.
- Rutas ocultas (no están en sidebar):  
  - Admin: `/admin/permissions`, `/admin/usuarios/permisos`, `/admin/configuracion/marcaje`, todas las subrutas de CRM, Agenda, Membresías, Inventario, etc.  
  - OPS root `/ops` y subrutas detalladas (automations, contacts, flows, inbox, metrics, settings).  
  - WhatsApp (mirror público): `/whatsapp/*`.  
  - Herramientas: `/automations`, `/dev/text-editor`, `/punch/[token]`, `/marcaje/tokens`.  
  - Diagnóstico adicionales: catalog, integrations, imaging/lab worklists.  
  - HR subrutas (employees/payroll/attendance detalles) no expuestas en nav principal.
- Duplicados/solapamientos:  
  - Doble dominios de membresías en APIs: `/api/memberships/*` (en) y `/api/membresias/*` (es) generan duplicidad conceptual.  
  - Dos árboles UI para WhatsApp: `/ops/whatsapp/*` y `/whatsapp/*` (aparentemente legacy).  
  - OPS “Operaciones” etiqueta genérica vs funcionalidad específica de WhatsApp.  
  - Health checks disperso en Admin en lugar de Diagnóstico Clínico.
- Elementos a reubicar (según pedido):  
  - “Health checks” mover bajo “Diagnóstico Clínico”.  
  - “Operaciones” (WhatsApp) agrupar en nueva sección “Comunicaciones”.

## 5) Propuesta de nueva estructura de navegación (solo sugerencia)
- Inicio (/admin)
- CRM (/admin/crm …)
- Clientes (/admin/clientes …)
- Membresías (/admin/membresias …)
- Agenda (/admin/agenda …)
- RRHH (/hr …)
- Inventario (/admin/inventario …)
- Finanzas (/admin/finanzas …)
- Diagnóstico Clínico  
  - Órdenes (/diagnostics/orders)  
  - Worklists (imaging/lab)  
  - Health checks (mover aquí desde /admin/health)
- Comunicaciones  
  - WhatsApp (usar árbol `/ops/whatsapp/*`; retirar duplicado `/whatsapp/*` o marcar legacy)
- Marcaje (público) (/marcaje)  
- Configuración (/admin/configuracion, permisos, identidad, integraciones)  
- Facturación (mantener oculto/disabled hasta existir `/admin/facturacion/page.tsx`)
