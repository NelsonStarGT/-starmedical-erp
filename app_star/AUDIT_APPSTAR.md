# AUDIT_APPSTAR.md

Fecha de auditoría: 2026-02-10  
Repositorio: `app_star`

## Índice
- [A) INVENTARIO DEL REPO (arquitectura real)](#a-inventario-del-repo-arquitectura-real)
- [B) MAPA FUNCIONAL POR MÓDULOS (qué hace el sistema hoy)](#b-mapa-funcional-por-módulos-qué-hace-el-sistema-hoy)
- [C) AUDITORÍA DE APIs (superficie de backend)](#c-auditoría-de-apis-superficie-de-backend)
- [D) BASE DE DATOS (Prisma/SQL)](#d-base-de-datos-prismasql)
- [E) SEGURIDAD Y ACCESO](#e-seguridad-y-acceso)
- [F) OBSERVABILIDAD / DEBUGGING](#f-observabilidad--debugging)
- [G) PLAN DE PULIDO POR PRIORIDAD (de arriba hacia abajo)](#g-plan-de-pulido-por-prioridad-de-arriba-hacia-abajo)
- [H) QUICK WIN: SIDEBAR COLLAPSE/EXPAND MANUAL (sin romper navegación)](#h-quick-win-sidebar-collapseexpand-manual-sin-romper-navegación)
- [Lista de preguntas abiertas](#lista-de-preguntas-abiertas)

---

## A) INVENTARIO DEL REPO (arquitectura real)

### A.1 Árbol resumido (real)

Top-level detectado:
- `README.md`, `RUNBOOK_DEV_SETUP.md`, `RUNBOOK_SUPABASE_MIGRATIONS.md`
- `app`, `components`, `lib`, `hooks`, `modules`, `config`, `src`, `service`, `tests`, `prisma`, `public`, `docker`, `docs`

Carpetas clave:
- `app`: App Router (admin, hr, modulo-medico, diagnostics, labtest, api)
- `components`: layout/UI compartida y componentes por módulo (`clients`, `reception`, `facturacion`, `medical`, etc.)
- `lib`: reglas de negocio y acceso a datos por dominio (`clients`, `companies`, `reception`, `medical`, `hr`, `billing`, `security`, etc.)
- `prisma`: `schema.prisma`, migraciones, seeds
- `public`: assets estáticos
- `modules`: módulo editor de texto reutilizable

Archivo: `app`
Evidencia:
```text
app/admin
app/api
app/hr
app/diagnostics
app/labtest
app/modulo-medico
```

Archivo: `config/modules`
Evidencia:
```text
diagnostics.tabs.ts
hr.tabs.ts
```

### A.2 Framework, router y estructura

- Framework: Next.js 16 + React 18 + TypeScript + Tailwind + Prisma.
- Router: App Router (`/app`); no se detectó carpeta `/pages`.
- Shell admin server/client dividido (`AdminShellServer` + `AdminShellClient`).
- Convención híbrida:
  - Server Actions en `app/**/actions.ts`.
  - Route Handlers en `app/api/**/route.ts`.
  - Servicios de dominio en `lib/**` y `src/lib/**`.
  - Hooks en `hooks/**`.

Archivo: `package.json`
Evidencia:
```json
"dependencies": {
  "next": "16.1.6",
  "react": "^18.2.0",
  "@prisma/client": "^5.22.0",
  "tailwindcss": "^3.4.3",
  "zod": "^3.23.8"
}
```

Archivo: `app/layout.tsx`
Evidencia:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="es" className={font.variable} suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
```

Archivo: `app/admin/layout.tsx`
Evidencia:
```tsx
export default function AdminLayout({ children }: { children: React.ReactNode; }) {
  const appEnv = String(process.env.APP_ENV || "").toLowerCase();
  const showDevBanner = process.env.NODE_ENV !== "production" || ["dev", "development", "staging"].includes(appEnv);
  return <AdminShellServer showDevBanner={showDevBanner}>{children}</AdminShellServer>;
}
```

Archivo: `components/layout/AdminShellServer.tsx`
Evidencia:
```tsx
const user = await getSessionUserFromCookies(cookies());
const canAccessReception = Boolean(resolveReceptionRole(user?.roles ?? []));
return (
  <AdminShellClient
    canAccessReception={canAccessReception}
    canAccessMedicalCommissions={canAccessMedicalCommissions}
```

Estado `/pages`:
- `pages/`: **NO ENCONTRADO**.

### A.3 Convenciones detectadas (actions/services/repositories/hooks/UI/routes)

- Actions:
  - `app/admin/clientes/actions.ts`
  - `app/admin/reception/actions.ts`
- Services / repositories:
  - `lib/clients/*.service.ts`
  - `lib/companies/services/company.service.ts`
  - `lib/companies/repositories/company.repo.ts`
  - `src/lib/memberships/service.ts`
  - `src/lib/users/service.ts`
- Hooks:
  - `hooks/useAgendaUpdates.ts`
  - `hooks/usePermissions.ts`
- UI components:
  - `components/ui/*`
  - `components/layout/*`
- Route handlers:
  - `app/api/**/route.ts` (309 handlers detectados)

Archivo: `app/admin/clientes/actions.ts`
Evidencia:
```tsx
"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
```

Archivo: `lib/companies/services/company.service.ts`
Evidencia:
```ts
import { getCompanyDetailRepo, listCompaniesRepo } from "@/lib/companies/repositories/company.repo";

export async function listCompanies(input: CompanyListQuery) {
  return listCompaniesRepo(input);
}
```

Archivo: `hooks/useAgendaUpdates.ts`
Evidencia:
```ts
const es = new EventSource("/api/agenda/updates");
const types = ["appointment_created", "appointment_updated", "appointment_deleted"];
```

### A.4 Zonas críticas identificadas

Autenticación/sesión:
- JWT en cookie (`AUTH_COOKIE_NAME`) con helpers `requireAuth/getSessionUser`.
- Riesgo: secret por defecto en código.

Archivo: `lib/auth.ts`
Evidencia:
```ts
const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

export function requireAuth(req: NextRequest) {
  const user = getSessionUser(req);
```

Permisos/RBAC:
- Catálogo central + cálculo de permisos efectivos por rol + overrides GRANT/DENY.

Archivo: `lib/security/permissionCatalog.ts`
Evidencia:
```ts
export const ALL_PERMISSION_KEYS: string[] = [
  ...CRM_PERMISSIONS,
  ...MEMBERSHIP_PERMISSIONS,
  ...DIAGNOSTIC_PERMISSIONS,
  ...LABTEST_PERMISSIONS,
```

Archivo: `lib/security/permissionService.ts`
Evidencia:
```ts
const { allowed, denied, inherited, isAdmin } = buildEffectivePermissionSet({
  roleNames,
  rolePermissionSets,
  userGrants,
  userDenies
});
```

Guardas de ruta y migración de URLs legacy:
- `proxy.ts` protege `/admin`, `/hr`, `/diagnostics`, `/labtest`.
- `proxy.ts` redirige `/medical/*` a `/modulo-medico/*`.

Archivo: `proxy.ts`
Evidencia:
```ts
if ((isAdminRoute || isHrRoute || isDiagnosticsRoute || isLabTestRoute) && !authenticated) {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}
```

Multi-sucursal:
- Restricción por `branchId` en agenda y recepción.
- Recepción usa cookie de sede activa `sm_reception_active_branch`.

Archivo: `lib/agenda/access.ts`
Evidencia:
```ts
if (requestedBranchId && requestedBranchId !== userBranchId) {
  return {
    allowed: false,
    reason: "No autorizado para operar sobre otra sede.",
```

Archivo: `app/admin/reception/actions.ts`
Evidencia:
```ts
const cookieBranchId = cookieStore.get(RECEPTION_ACTIVE_BRANCH_COOKIE_NAME)?.value ?? null;
const effective = resolveReceptionBranchId(user, {
  requestedBranchId: siteId,
  cookieBranchId
});
```

Facturación/recepción/clínica:
- Facturación mezcla dashboard mock con endpoint operativo de quick actions.
- Recepción V2 está fuertemente orientada a server actions.
- Módulo médico usa encounter store real con fallback para tablas faltantes.

Archivo: `lib/billing/service.ts`
Evidencia:
```ts
import { billingCasesMock } from "@/lib/billing/mock";

export function listBillingCases() {
  return billingCasesMock;
}
```

Archivo: `app/api/facturacion/expedientes/[id]/quick-action/route.ts`
Evidencia:
```ts
import { applyBillingQuickAction, getBillingCaseById } from "@/lib/billing/service";
import { prisma } from "@/lib/prisma";
```

Archivo: `lib/medical/encounterRealStore.ts`
Evidencia:
```ts
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
```

### A.5 Dependencias clave y uso

- `next` / `react` / `react-dom`: framework UI SSR/CSR.
- `@prisma/client` + `prisma`: ORM/migraciones.
- `tailwindcss`: estilos utilitarios.
- `zod`: validación de payloads en APIs.
- `@tanstack/react-query`: estado asíncrono en frontend (HR, marcaje, etc.).
- `jsonwebtoken` + `bcryptjs`: sesión JWT + password hashing.
- `@supabase/supabase-js`: storage/files.
- `nodemailer`: correo OTP/notificaciones.

Archivo: `package.json`
Evidencia:
```json
"@tanstack/react-query": "^5.62.8",
"jsonwebtoken": "^9.0.3",
"bcryptjs": "^2.4.3",
"@supabase/supabase-js": "^2.89.0",
"nodemailer": "^7.0.12"
```

---

## B) MAPA FUNCIONAL POR MÓDULOS (qué hace el sistema hoy)

### 1) Clientes
- Rutas reales: `/admin/clientes`, `/admin/clientes/personas`, `/admin/clientes/empresas`, `/admin/clientes/instituciones`, `/admin/clientes/aseguradoras`, `/admin/clientes/configuracion`.
- Pantallas/layout: dashboard + tabs de account master.
- Componentes principales: `components/clients/*`, `lib/clients/list/ClientListEngine.tsx`.
- Lógica negocio: `lib/clients/dashboard.service.ts`, `lib/clients/list.service.ts`, `app/admin/clientes/actions.ts`.
- Estado/flujos: altas por tipo, completitud documental, archivado (`deletedAt`), auditoría.
- Riesgos: archivo action muy grande (`app/admin/clientes/actions.ts`), posible sobrecarga de responsabilidades.
- Calidad UX: buena separación por tipo; fricción baja para create-first.

Archivo: `app/admin/clientes/layout.tsx`
Evidencia:
```tsx
const clientsTabs: ModuleTab[] = resolveModuleTabs("clientes", {
  hrefs: {
    dashboard: "/admin/clientes",
    personas: "/admin/clientes/personas",
    empresas: "/admin/clientes/empresas",
```

Archivo: `lib/clients/dashboard.service.ts`
Evidencia:
```ts
export async function getClientsHomeKpis(): Promise<ClientsHomeKpis> {
  const [
    totalClients,
    incompleteClients,
    documentsExpired,
```

### 2) Empresas
- Rutas reales: `/admin/empresas`, `/admin/empresas/instituciones`, `/admin/empresas/aseguradoras`, `/admin/empresas/[id]`.
- Pantallas/layout: listado por tipo + detalle.
- Componentes principales: `lib/companies/list/CompanyListEngine.tsx`, `components/ui/DataTable.tsx`.
- Lógica negocio: `lib/companies/services/company.service.ts`, `lib/companies/repositories/company.repo.ts`.
- Estado/flujos: lectura B2B core con fallback a empty state si faltan tablas.
- Riesgos: dependencia directa a migración `companies_module_core` para operar.
- Calidad UX: filtros claros, paginación básica.

Archivo: `lib/companies/list/CompanyListEngine.tsx`
Evidencia:
```tsx
if (missingCompanyTables) {
  return (
    <EmptyState
      title="Módulo de empresas pendiente de migración"
```

Archivo: `lib/companies/services/company.service.ts`
Evidencia:
```ts
export async function listCompanies(input: CompanyListQuery) {
  return listCompaniesRepo(input);
}
```

### 3) CRM
- Rutas reales: `/admin/crm/inbox`, `/admin/crm/pipeline`, `/admin/crm/list`, `/admin/crm/calendario`, `/admin/crm/settings`.
- Pantallas/layout: `CrmLayoutClient` + submódulos.
- Componentes principales: `app/admin/crm/inbox/InboxClient.tsx`, `app/admin/crm/pipeline/PipelineClient.tsx`.
- Lógica negocio: APIs `app/api/crm/*`, motor de permisos CRM vía RBAC.
- Estado/flujos: leads → deals → quotes, pipeline por tipo B2B/B2C.
- Riesgos: rutas de tabs parcialmente deshabilitadas (dashboard/reportes inexistentes).
- Calidad UX: potente pero densa; alta carga cognitiva en bandeja/pipeline.

Archivo: `app/admin/crm/page.tsx`
Evidencia:
```tsx
export default function CrmIndexPage() {
  redirect("/admin/crm/inbox?type=b2b");
}
```

Archivo: `app/admin/crm/CrmLayoutClient.tsx`
Evidencia:
```tsx
// TODO(nav): No existe un "Dashboard" dedicado en CRM
// TODO(nav): No existe ruta para "Reportes" en CRM
```

Archivo: `app/api/crm/leads/route.ts`
Evidencia:
```ts
const auth = ensureCrmAccess(req, PERMISSIONS.LEAD_READ);
if (auth.errorResponse) return auth.errorResponse;
```

### 4) Membresías
- Rutas reales: `/admin/membresias`, `/admin/membresias/contratos`, `/admin/membresias/planes`, `/admin/membresias/configuracion`, `/admin/membresias/impresion`.
- Pantallas/layout: dashboard + contratos + planes + config.
- Componentes principales: pantallas cliente-heavy en `app/admin/membresias/*`.
- Lógica negocio: `src/lib/memberships/service.ts` + APIs nuevas `/api/memberships/*` y alias legacy `/api/membresias/*`.
- Estado/flujos: plan → contrato → pago → status/renovación.
- Riesgos: duplicación de superficie API por alias legacy.
- Calidad UX: cobertura funcional buena; tabs con renovaciones/cobranza todavía sin ruta.

Archivo: `app/admin/membresias/layout.tsx`
Evidencia:
```tsx
// TODO(nav): No existe ruta para "Renovaciones" en Membresías
// TODO(nav): No existe ruta para "Cobranza" en Membresías
```

Archivo: `app/api/membresias/planes/route.ts`
Evidencia:
```ts
// @deprecated Legacy alias. Usa /api/memberships/plans
```

Archivo: `src/lib/memberships/service.ts`
Evidencia:
```ts
export const contractCreateSchema = z.object({
  ownerType: z.nativeEnum(MembershipOwnerType),
  ownerId: z.string().trim(),
```

### 5) Agenda
- Rutas reales: `/admin/agenda`, `/admin/agenda/citas`, `/admin/agenda/configuracion`.
- Pantallas/layout: calendario principal en cliente.
- Componentes principales: `components/agenda/*`, `hooks/useAgendaUpdates.ts`.
- Lógica negocio: `app/api/agenda/route.ts`, `app/api/agenda/updates/route.ts`, `lib/agenda/access.ts`.
- Estado/flujos: CRUD citas + SSE updates + filtros por vista.
- Riesgos: fallback a mock en frontend cuando falla API.
- Calidad UX: potente visualmente; posible inconsistencia al mezclar data real/mock.

Archivo: `app/admin/agenda/page.tsx`
Evidencia:
```tsx
import { citasMock } from "@/lib/mock/citas";
...
const res = await fetch(`/api/agenda?${params.toString()}`);
if (!res.ok) {
  setCitas(citasMock);
}
```

Archivo: `app/api/agenda/updates/route.ts`
Evidencia:
```ts
const stream = new ReadableStream({
  start(controller) {
    const send = (event: AgendaEvent) => {
      controller.enqueue(encoder.encode(`event: ${event.type}\n`));
```

### 6) Usuarios
- Rutas reales: `/admin/usuarios`, `/admin/usuarios/lista`, `/admin/usuarios/permisos`, `/admin/usuarios/configuracion`.
- Pantallas/layout: dashboard + lista + permisos.
- Componentes principales: `components/users/UserProvider.tsx`.
- Lógica negocio: `app/api/users/*`, `src/lib/users/service.ts`.
- Estado/flujos: gestión usuario, roles, vínculo opcional con empleado HR.
- Riesgos: módulo “sucursales” tab sin ruta.
- Calidad UX: métricas útiles; configuración de permisos requiere contexto técnico.

Archivo: `app/admin/usuarios/layout.tsx`
Evidencia:
```tsx
// TODO(nav): No existe ruta para "Sucursales" en este módulo
```

Archivo: `app/api/users/route.ts`
Evidencia:
```ts
const perm = requirePermission(auth.user, "USERS:ADMIN");
if (perm.errorResponse) return perm.errorResponse;
```

### 7) Recepción
- Rutas reales: `/admin/reception`, `/admin/reception/dashboard`, `/admin/reception/worklist`, `/admin/reception/appointments`, `/admin/reception/settings`, etc.
- Pantallas/layout: layout con selector de sede y capacidades por rol.
- Componentes principales: `components/reception/*`, `app/admin/reception/ReceptionLayoutClient.tsx`.
- Lógica negocio: server actions extensivas en `app/admin/reception/actions.ts`; API de service requests en `app/api/reception/service-requests/*`.
- Estado/flujos: admisión, cola, transición de visita, SLA, service requests.
- Riesgos: action file muy grande y centralizado.
- Calidad UX: sólido para operación; depende de sede activa (si no hay, bloquea flujo).

Archivo: `app/admin/reception/page.tsx`
Evidencia:
```tsx
const snapshot = await actionGetReceptionWorklist({ siteId });
return <WorklistTable key={siteId} siteId={siteId} initialItems={snapshot.items} ... />;
```

Archivo: `app/admin/reception/actions.ts`
Evidencia:
```ts
/**
 * @deprecated Legacy entrypoint. Use `actionCreateAdmission` instead.
 * This is intentionally disabled to avoid multiple admission paths.
 */
```

Archivo: `app/api/reception/service-requests/route.ts`
Evidencia:
```ts
if (auth.user?.branchId && auth.user.branchId !== siteId) {
  return NextResponse.json({ error: "No autorizado para esta sede" }, { status: 403 });
}
```

### 8) RRHH
- Rutas reales: `/hr`, `/hr/employees`, `/hr/attendance`, `/hr/payroll`, `/hr/settings`.
- Pantallas/layout: tabs de módulo + páginas muy completas en cliente.
- Componentes principales: `app/hr/employees/page.tsx`, `app/hr/payroll/page.tsx`.
- Lógica negocio: APIs `app/api/hr/*`, validación en `lib/api/hr.ts`, serializadores y schemas HR.
- Estado/flujos: onboarding, expedientes, asistencia, nómina.
- Riesgos: `app/hr/employees/page.tsx` (3142 líneas) como God component.
- Calidad UX: funcional pero con densidad alta (muchas acciones en una sola vista).

Archivo: `config/modules/hr.tabs.ts`
Evidencia:
```ts
export const hrTabs: ModuleTab[] = resolveModuleTabs("rrhh", {
  hrefs: {
    dashboard: "/hr",
    empleados: "/hr/employees",
```

Archivo: `app/api/hr/employees/route.ts`
Evidencia:
```ts
const auth = requireHrPermission(req, "HR:EMPLOYEES:READ");
if (auth.errorResponse) return auth.errorResponse;
```

Archivo: `app/hr/employees/page.tsx`
Evidencia:
```ts
const res = await fetch(`/api/hr/disciplinary-actions/${actionId}/submit`, { method: "POST" });
const res2 = await fetch(`/api/hr/disciplinary-actions/${actionId}/approve`, { method: "POST" });
```

### 9) Inventario
- Rutas reales: `/admin/inventario`, `/admin/inventario/productos`, `/admin/inventario/servicios`, `/admin/inventario/combos`, `/admin/inventario/movimientos`, `/admin/inventario/solicitudes`, `/admin/inventario/configuracion`.
- Pantallas/layout: dashboard + tabs.
- Componentes principales: `components/inventario/*`.
- Lógica negocio: APIs `app/api/inventario/*`, auth por token/header en `lib/api/auth.ts`.
- Estado/flujos: catálogo, movimientos, órdenes/solicitudes, reportes.
- Riesgos: mezcla de auth por header y fallback a mocks en endpoints.
- Calidad UX: amplio coverage; riesgo de discrepancia entre mock y DB real.

Archivo: `app/admin/inventario/layout.tsx`
Evidencia:
```tsx
// TODO(nav): No existe ruta para "Reportes" en Inventario; queda deshabilitado.
```

Archivo: `app/api/inventario/productos/route.ts`
Evidencia:
```ts
const role = roleFromRequest(req);
if (!role) return NextResponse.json({ error: "Rol no proporcionado" }, { status: 401 });
```

Archivo: `app/api/inventario/productos/route.ts`
Evidencia:
```ts
catch (err) {
  const data = productosMock.map((p) => ({ ...p }));
  return NextResponse.json({ data, warning: "Usando datos mock" }, { status: 200 });
}
```

### 10) Finanzas
- Rutas reales: `/admin/finanzas`, `/admin/finanzas/journal`, `/admin/finanzas/receivables`, `/admin/finanzas/reportes`.
- Pantallas/layout: página integral de operación financiera.
- Componentes principales: `app/admin/finanzas/page.tsx`.
- Lógica negocio: APIs `app/api/finanzas/*`, control de acceso en `lib/api/finance.ts`.
- Estado/flujos: AR/AP, asientos, transacciones, resumen.
- Riesgos: auth basada en `x-role`/token en varios endpoints (no solo sesión).
- Calidad UX: muy completa, pero extensa y con alta fricción para onboarding.

Archivo: `lib/api/finance.ts`
Evidencia:
```ts
const roleHeader = roleFromRequest(req);
if (hasRole(roleHeader, allowed)) return { role: roleHeader as FinanceRole, errorResponse: null };
```

Archivo: `app/api/finanzas/summary/route.ts`
Evidencia:
```ts
const auth = ensureFinanceAccess(req);
if (auth.errorResponse) return auth.errorResponse;
```

### 11) Facturación
- Rutas reales: `/admin/facturacion`, `/admin/facturacion/bandeja/*`, `/admin/facturacion/documentos`, `/admin/facturacion/caja`.
- Pantallas/layout: dashboard operativo + bandejas.
- Componentes principales: `components/facturacion/*`.
- Lógica negocio: quick actions en API + servicio core de dashboard basado en mock.
- Estado/flujos: expediente → bandeja → acción rápida de cobro/abono/crédito/documento.
- Riesgos: mezcla mock/real en la misma capa.
- Calidad UX: estructura clara por bandejas; buen enfoque operativo.

Archivo: `app/admin/facturacion/page.tsx`
Evidencia:
```tsx
import { listBillingCases, listBillingDashboardSummary, listBillingStatsByTray } from "@/lib/billing/service";
```

Archivo: `lib/billing/service.ts`
Evidencia:
```ts
import { billingCasesMock } from "@/lib/billing/mock";

export function listBillingDashboardSummary(filters?: BillingCaseFilters) {
  const filtered = filterBillingCases(billingCasesMock, filters);
```

### 12) Configuración
- Rutas reales: `/admin/configuracion` y subpáginas (`/admin/configuracion/marcaje`, etc.).
- Pantallas/layout: panel central de empresa, correo, RBAC, integraciones.
- Componentes principales: formularios y UploadField.
- Lógica negocio: APIs `app/api/config/*` y `app/api/admin/config/*`.
- Estado/flujos: persistencia de settings globales + pruebas de integración.
- Riesgos: en frontend se usa `x-role: Administrador`; backend admin permite fallback por header.
- Calidad UX: completo, pero con muchas secciones en una sola pantalla.

Archivo: `app/admin/configuracion/page.tsx`
Evidencia:
```ts
const adminHeaders = { "x-role": "Administrador" };
```

Archivo: `lib/api/admin.ts`
Evidencia:
```ts
const role = roleFromRequest(req);
if (role === "Administrador") {
  return { role, errorResponse: null };
}
```

### 13) Módulo Médico
- Rutas reales: `/modulo-medico/dashboard`, `/modulo-medico/agenda`, `/modulo-medico/diagnostico`, `/modulo-medico/consultaM/[encounterId]`, etc.
- Pantallas/layout: suite médica con layout propio y consulta detallada.
- Componentes principales: `components/medical/*`.
- Lógica negocio: `app/api/medical/*`, `lib/medical/*`.
- Estado/flujos: worklist por modalidad + encounter editor + snapshot/documentos.
- Riesgos: store de encounter muy grande y compleja.
- Calidad UX: muy rica; probable curva de aprendizaje alta.

Archivo: `app/modulo-medico/(suite)/layout.tsx`
Evidencia:
```tsx
const user = await getSessionUserFromCookies(cookies());
if (!user) redirect("/login");
```

Archivo: `app/modulo-medico/consultaM/[encounterId]/page.tsx`
Evidencia:
```tsx
import { useEncounterEditor } from "@/hooks/useEncounterEditor";
import OrdersPanel from "@/components/medical/encounter/OrdersPanel";
import SuppliesPanel from "@/components/medical/encounter/SuppliesPanel";
```

Archivo: `lib/medical/encounterRealStore.ts`
Evidencia:
```ts
export type EncounterRecord = {
  id: string;
  patientId: string;
  status: string;
```

### 14) Diagnóstico Clínico
- Rutas reales: `/diagnostics/orders`, `/diagnostics/catalog`, `/diagnostics/lab/*`, `/diagnostics/imaging/*`, `/diagnostics/health-checks`.
- Pantallas/layout: órdenes y subflujos de ejecución diagnóstica.
- Componentes principales: `app/diagnostics/orders/OrdersClient.tsx`.
- Lógica negocio: `app/api/diagnostics/*`, `lib/server/diagnostics.service.ts`, `lib/diagnostics/service.ts`.
- Estado/flujos: orden diagnóstica + items + specimen/result/report + adminStatus.
- Riesgos: superficie API amplia; necesidad de pruebas integrales de estados.
- Calidad UX: orientada a operación real, pero muchos estados pueden confundir sin entrenamiento.

Archivo: `app/diagnostics/orders/page.tsx`
Evidencia:
```tsx
const initialOrders = await listOrders();
const initialCatalog = await listCatalogItems(false);
return <OrdersClient initialOrders={initialOrders} initialCatalog={initialCatalog} />;
```

Archivo: `app/api/diagnostics/orders/route.ts`
Evidencia:
```ts
const auth = requireDiagnosticsPermission(req, "DIAG:READ");
if (auth.errorResponse) return auth.errorResponse;
```

### 15) LabTest
- Rutas reales: `/labtest`, `/labtest/orders`, `/labtest/workbench`, `/labtest/results`, `/labtest/settings`, etc.
- Pantallas/layout: layout propio fuera del sidebar global.
- Componentes principales: `app/labtest/workbench/page.tsx`, `app/labtest/*`.
- Lógica negocio: `app/api/labtest/*`, control OTP + idle timeout en proxy.
- Estado/flujos: orden lab → muestra → resultado → validación/liberación/envío.
- Riesgos: módulo operativo sensible; requiere hardening continuo de OTP y rate limits.
- Calidad UX: clara para laboratorio (manual-first).

Archivo: `app/labtest/layout.tsx`
Evidencia:
```tsx
const role = await getLabRoleForUser(user.id, user.branchId);
if (!role && !isGlobalAdmin) forbidden();
```

Archivo: `app/api/labtest/auth/send-otp/route.ts`
Evidencia:
```ts
const OTP_RATE_WINDOW_MS = 10 * 60_000;
const OTP_RATE_LIMIT_MAX = 5;
```

### 16) Marcaje
- Rutas reales: `/marcaje`, `/marcaje/tokens`, `/punch/[token]`.
- Pantallas/layout: monitor de estado, eventos raw y tokens.
- Componentes principales: `app/marcaje/page.tsx`, `app/marcaje/tokens/page.tsx`.
- Lógica negocio: `app/api/marcaje/*`, `app/api/attendance/*`.
- Estado/flujos: ingest de eventos, estado de integración, tokens de punch.
- Riesgos: endpoints de ingest/configuración requieren revisión de auth consistente.
- Calidad UX: buena trazabilidad operativa.

Archivo: `app/marcaje/page.tsx`
Evidencia:
```tsx
const res = await fetch(`/api/marcaje/status${qs}`, { cache: "no-store" });
```

Archivo: `app/api/marcaje/status/route.ts`
Evidencia:
```ts
const ok = hasPermission(user, "USERS:ADMIN") || hasPermission(user, "HR:ATTENDANCE:READ");
```

### 17) WhatsApp / Comunicaciones / Automatizaciones
- Rutas reales: `/ops/whatsapp/*`, `/whatsapp/*`, `/automations`.
- Pantallas/layout: inbox/flows/automations.
- Componentes principales: `app/ops/whatsapp/*`, `app/automations/page.tsx`.
- Lógica negocio: `app/api/whatsapp/*`, `app/api/automations/route.ts`, `service/whatsappGateway.ts`.
- Estado/flujos: WhatsApp actualmente stub/mock para gateway.
- Riesgos: endpoints WhatsApp públicos (sin auth explícita) y backend stub.
- Calidad UX: buena base, pero aún no productizada end-to-end.

Archivo: `app/api/whatsapp/send/route.ts`
Evidencia:
```ts
const payload = await req.json();
await sendMessage(payload);
return NextResponse.json({ ok: true, message: "Stub - integración con gateway pendiente" });
```

Archivo: `service/whatsappGateway.ts`
Evidencia:
```ts
// Stub: en el futuro se reemplazará por integración real con el gateway.
export async function sendMessage(payload: SendMessagePayload): Promise<{ ok: boolean }> {
  return { ok: true };
}
```

---

## C) AUDITORÍA DE APIs (superficie de backend)

### C.1 Resumen
- Endpoint handlers detectados: `309` (`app/api/**/route.ts`).
- Distribución auth detectada:
  - `session-cookie`: 219
  - `header-or-token`: 71
  - `public-or-unknown`: 19
- Endpoints potencialmente huérfanos (análisis estático de fetch): 157.
- Llamadas UI no resueltas (análisis estático): 9.

Archivo: `.audit_api_catalog.json`
Evidencia:
```json
[
  {
    "rel": "app/api/admin/clientes/[id]/preview/route.ts",
    "routePath": "/api/admin/clientes/[id]/preview",
    "moduleOwner": "admin/clientes",
```

Archivo: `.audit_api_usage.json`
Evidencia:
```json
{
  "unresolved": [
    {
      "rel": "app/hr/employees/page.tsx",
      "url": "/api/hr/disciplinary-actions/${actionId}/submit"
```

### C.2 Hallazgos de contratos/auth

- Patrón principal correcto: `requireAuth` + `requirePermission` en muchos módulos.
- Patrón alterno presente: auth por header/token en `config`, `inventario`, `finanzas`.
- Riesgo de drift entre UI y API:
  - UI llama `/api/hr/disciplinary-actions/:id/submit|approve|reject`.
  - API existente expone `/api/hr/employees/[id]/disciplinary-actions` (GET/POST), no rutas submit/approve/reject.

Archivo: `app/hr/employees/page.tsx`
Evidencia:
```ts
fetch(`/api/hr/disciplinary-actions/${actionId}/submit`, { method: "POST" });
fetch(`/api/hr/disciplinary-actions/${actionId}/approve`, { method: "POST" });
fetch(`/api/hr/disciplinary-actions/${actionId}/reject`, { method: "POST" });
```

Archivo: `app/api/hr/employees/[id]/disciplinary-actions/route.ts`
Evidencia:
```ts
export async function GET(req: NextRequest, { params }: ... ) {
...
export async function POST(req: NextRequest, { params }: ... ) {
```

### C.3 Catálogo completo de endpoints (método/ruta/propósito/módulo/auth/validaciones/roles/contrato)

| Método(s) | Ruta | Módulo dueño | Propósito | Auth | Validaciones | Roles/Permisos | Contrato req/res (aprox) | Archivo |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/admin/clientes/[id]/preview` | admin/clientes | Utilidades/CSV/preview de clientes | session-cookie | — | — | req:path-params / res:{ ok, ... } | `app/api/admin/clientes/[id]/preview/route.ts` |
| GET | `/api/admin/clientes/export/csv` | admin/clientes | Utilidades/CSV/preview de clientes | session-cookie | — | — | req:query / res:{ error, ... } | `app/api/admin/clientes/export/csv/route.ts` |
| POST | `/api/admin/clientes/import/csv` | admin/clientes | Utilidades/CSV/preview de clientes | session-cookie | safeParse | — | req:form-data, path-params / res:{ ok, ... }, { error, ... } | `app/api/admin/clientes/import/csv/route.ts` |
| GET | `/api/admin/clientes/import/template` | admin/clientes | Utilidades/CSV/preview de clientes | session-cookie | — | — | req:query / res:{ error, ... } | `app/api/admin/clientes/import/template/route.ts` |
| GET | `/api/admin/companies` | admin/companies | Módulo Empresas B2B | session-cookie | zod, safeParse | — | req:query / res:{ ok, ... } | `app/api/admin/companies/route.ts` |
| GET | `/api/admin/companies/[id]` | admin/companies | Módulo Empresas B2B | session-cookie | zod, safeParse | — | req:query, path-params / res:{ ok, ... } | `app/api/admin/companies/[id]/route.ts` |
| GET, POST | `/api/admin/config/email/global` | admin/config | Operación de API del ERP | session-cookie | — | — | req:json-body / res:{ ok, ... } | `app/api/admin/config/email/global/route.ts` |
| POST | `/api/admin/config/email/test` | admin/config | Operación de API del ERP | session-cookie | — | — | req:json-body / res:{ ok, ... } | `app/api/admin/config/email/test/route.ts` |
| GET | `/api/admin/health/db` | admin/health | Health check de sistema/DB | session-cookie | — | — | req:— / res:{ error, ... } | `app/api/admin/health/db/route.ts` |
| GET | `/api/admin/job-roles` | admin/job-roles | Operación de API del ERP | session-cookie | withApiErrorHandling | perms:USERS:ADMIN | req:— / res:{ data, ... }, wrapped-handler-json | `app/api/admin/job-roles/route.ts` |
| GET, POST, PATCH | `/api/admin/locations/departments` | admin/locations | Operación de API del ERP | session-cookie | zod, safeParse, z.object, withApiErrorHandling | perms:USERS:ADMIN | req:json-body / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/admin/locations/departments/route.ts` |
| GET, POST, PATCH | `/api/admin/locations/municipalities` | admin/locations | Operación de API del ERP | session-cookie | zod, safeParse, z.object, withApiErrorHandling | perms:USERS:ADMIN | req:query, json-body / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/admin/locations/municipalities/route.ts` |
| POST | `/api/admin/permissions/sync` | admin/permissions | Operación de API del ERP | session-cookie | withApiErrorHandling | perms:USERS:ADMIN | req:— / res:{ ok, ... }, wrapped-handler-json | `app/api/admin/permissions/sync/route.ts` |
| GET | `/api/admin/rbac/roles` | admin/rbac | Operación de API del ERP | session-cookie | withApiErrorHandling | perms:USERS:ADMIN | req:— / res:{ data, ... }, wrapped-handler-json | `app/api/admin/rbac/roles/route.ts` |
| GET, POST, PUT, PATCH, DELETE | `/api/agenda` | agenda | Gestión de citas/agenda | session-cookie | — | — | req:query, json-body / res:{ ok, ... }, { data, ... }, { error, ... } | `app/api/agenda/route.ts` |
| GET | `/api/agenda/updates` | agenda | Gestión de citas/agenda | session-cookie | — | — | req:query / res:{ error, ... } | `app/api/agenda/updates/route.ts` |
| POST | `/api/ai/parse-attendance` | ai | Operación de API del ERP | session-cookie | safeParse, schema-parse | — | req:json-body / res:{ ok, ... } | `app/api/ai/parse-attendance/route.ts` |
| GET, POST | `/api/attendance/config` | attendance | Operación de API del ERP | session-cookie | withApiErrorHandling | perms:HR:ATTENDANCE:WRITE, USERS:ADMIN | req:query, json-body / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/attendance/config/route.ts` |
| GET, POST | `/api/attendance/import/raw` | attendance | Operación de API del ERP | session-cookie | — | perms:HR:ATTENDANCE:WRITE, USERS:ADMIN | req:form-data / res:{ ok, ... } | `app/api/attendance/import/raw/route.ts` |
| GET, POST | `/api/attendance/process` | attendance | Operación de API del ERP | session-cookie | — | perms:HR:ATTENDANCE:WRITE, USERS:ADMIN | req:query / res:{ ok, ... } | `app/api/attendance/process/route.ts` |
| GET | `/api/attendance/punch-config/[token]` | attendance | Operación de API del ERP | public-or-unknown | withApiErrorHandling | — | req:path-params / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/attendance/punch-config/[token]/route.ts` |
| GET, POST | `/api/attendance/punch-tokens` | attendance | Operación de API del ERP | session-cookie | withApiErrorHandling | perms:USERS:ADMIN | req:query, json-body / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/attendance/punch-tokens/route.ts` |
| DELETE | `/api/attendance/punch-tokens/[id]` | attendance | Operación de API del ERP | session-cookie | withApiErrorHandling | perms:USERS:ADMIN | req:path-params / res:{ ok, ... }, { error, ... }, wrapped-handler-json | `app/api/attendance/punch-tokens/[id]/route.ts` |
| POST | `/api/attendance/raw/process` | attendance | Operación de API del ERP | session-cookie | — | perms:HR:ATTENDANCE:WRITE, USERS:ADMIN | req:query / res:{ ok, ... } | `app/api/attendance/raw/process/route.ts` |
| GET | `/api/auth/whoami` | auth | Retorna identidad de sesión actual | session-cookie | — | — | req:— / res:— | `app/api/auth/whoami/route.ts` |
| GET, POST | `/api/automations` | automations | Operación de API del ERP | session-cookie | safeParse | — | req:json-body / res:{ ok, ... } | `app/api/automations/route.ts` |
| POST | `/api/clientes/importar` | clientes | Operación de API del ERP | public-or-unknown | — | — | req:form-data / res:{ error, ... } | `app/api/clientes/importar/route.ts` |
| GET | `/api/clientes/plantilla-excel` | clientes | Operación de API del ERP | public-or-unknown | — | — | req:— / res:— | `app/api/clientes/plantilla-excel/route.ts` |
| GET, POST | `/api/config/apis` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/config/apis/route.ts` |
| PATCH | `/api/config/apis/[key]` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/config/apis/[key]/route.ts` |
| POST | `/api/config/apis/[key]/test` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:path-params / res:{ ok, ... }, { error, ... } | `app/api/config/apis/[key]/test/route.ts` |
| GET, POST | `/api/config/app` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/config/app/route.ts` |
| GET, POST | `/api/config/home-dashboard` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body / res:{ error, ... } | `app/api/config/home-dashboard/route.ts` |
| GET, PATCH | `/api/config/identity` | config | Configuración del sistema e integraciones | session-cookie | — | perms:HR:SETTINGS:WRITE | req:json-body / res:{ ok, ... } | `app/api/config/identity/route.ts` |
| GET, POST | `/api/config/integrations/attendance` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/config/integrations/attendance/route.ts` |
| POST | `/api/config/integrations/attendance/test` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:— / res:{ ok, ... }, { error, ... } | `app/api/config/integrations/attendance/test/route.ts` |
| GET, POST | `/api/config/integrations/lab` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/config/integrations/lab/route.ts` |
| POST | `/api/config/integrations/lab/test` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:— / res:{ ok, ... }, { error, ... } | `app/api/config/integrations/lab/test/route.ts` |
| GET, POST | `/api/config/invoice` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/config/invoice/route.ts` |
| POST | `/api/config/invoice/test` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:— / res:{ error, ... } | `app/api/config/invoice/test/route.ts` |
| GET, POST | `/api/config/mail/global` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/config/mail/global/route.ts` |
| GET, POST | `/api/config/mail/modules` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/config/mail/modules/route.ts` |
| PATCH | `/api/config/mail/modules/[moduleKey]` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/config/mail/modules/[moduleKey]/route.ts` |
| POST | `/api/config/mail/modules/[moduleKey]/test` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body, path-params / res:{ error, ... } | `app/api/config/mail/modules/[moduleKey]/test/route.ts` |
| GET, POST | `/api/config/rbac` | config | Configuración del sistema e integraciones | header-or-token | — | — | req:json-body / res:{ error, ... } | `app/api/config/rbac/route.ts` |
| GET, POST, PATCH | `/api/crm/accounts` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/crm/accounts/route.ts` |
| GET, POST, PATCH | `/api/crm/activities` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/crm/activities/route.ts` |
| GET | `/api/crm/audit` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query / res:{ data, ... }, { error, ... } | `app/api/crm/audit/route.ts` |
| GET, POST, PATCH, DELETE | `/api/crm/calendar` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, json-body / res:{ ok, ... }, { data, ... }, { error, ... } | `app/api/crm/calendar/route.ts` |
| GET, POST, PATCH | `/api/crm/contacts` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/crm/contacts/route.ts` |
| GET | `/api/crm/dashboard-metrics` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query / res:{ data, ... }, { error, ... } | `app/api/crm/dashboard-metrics/route.ts` |
| GET, POST, PATCH | `/api/crm/deals` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/crm/deals/route.ts` |
| GET | `/api/crm/deals/[id]` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, path-params / res:{ data, ... }, { error, ... } | `app/api/crm/deals/[id]/route.ts` |
| GET | `/api/crm/deals/[id]/pipeline` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:path-params / res:{ data, ... }, { error, ... } | `app/api/crm/deals/[id]/pipeline/route.ts` |
| GET | `/api/crm/deals/inbox` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query / res:{ data, ... }, { error, ... } | `app/api/crm/deals/inbox/route.ts` |
| POST | `/api/crm/jobs/run` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | header-or-token | — | roles:Administrador | req:— / res:{ error, ... } | `app/api/crm/jobs/run/route.ts` |
| GET, POST, PATCH | `/api/crm/leads` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/crm/leads/route.ts` |
| POST | `/api/crm/leads/[id]/convert` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/crm/leads/[id]/convert/route.ts` |
| GET, POST | `/api/crm/pipelines` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/crm/pipelines/route.ts` |
| POST | `/api/crm/pipelines/rules` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/crm/pipelines/rules/route.ts` |
| POST, PATCH | `/api/crm/pipelines/stages` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/crm/pipelines/stages/route.ts` |
| GET, POST, PATCH | `/api/crm/quotes` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/crm/quotes/route.ts` |
| GET, POST | `/api/crm/quotes-v2` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/crm/quotes-v2/route.ts` |
| GET, PATCH | `/api/crm/quotes-v2/[id]` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/crm/quotes-v2/[id]/route.ts` |
| POST | `/api/crm/quotes-v2/[id]/approve` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:path-params / res:{ data, ... }, { error, ... } | `app/api/crm/quotes-v2/[id]/approve/route.ts` |
| GET | `/api/crm/quotes-v2/[id]/deliveries` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:path-params / res:{ data, ... }, { error, ... } | `app/api/crm/quotes-v2/[id]/deliveries/route.ts` |
| POST | `/api/crm/quotes-v2/[id]/generate-pdf` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, path-params / res:{ data, ... }, { error, ... } | `app/api/crm/quotes-v2/[id]/generate-pdf/route.ts` |
| POST | `/api/crm/quotes-v2/[id]/reject` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/crm/quotes-v2/[id]/reject/route.ts` |
| POST | `/api/crm/quotes-v2/[id]/request-approval` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:path-params / res:{ data, ... }, { error, ... } | `app/api/crm/quotes-v2/[id]/request-approval/route.ts` |
| POST | `/api/crm/quotes-v2/[id]/send` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/crm/quotes-v2/[id]/send/route.ts` |
| GET | `/api/crm/quotes-v2/items` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query / res:{ data, ... }, { error, ... } | `app/api/crm/quotes-v2/items/route.ts` |
| POST | `/api/crm/quotes-v2/upload` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:form-data / res:{ data, ... }, { error, ... } | `app/api/crm/quotes-v2/upload/route.ts` |
| POST | `/api/crm/quotes/[id]/generate-pdf` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:path-params / res:{ data, ... }, { error, ... } | `app/api/crm/quotes/[id]/generate-pdf/route.ts` |
| GET, POST, PATCH | `/api/crm/requests` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/crm/requests/route.ts` |
| GET | `/api/crm/search-client` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query / res:{ data, ... }, { error, ... } | `app/api/crm/search-client/route.ts` |
| GET, POST, PATCH | `/api/crm/tasks` | crm | Operaciones CRM (leads/deals/quotes/pipeline) | session-cookie | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/crm/tasks/route.ts` |
| GET, POST, PATCH | `/api/diagnostics/catalog` | diagnostics | Operaciones diagnóstico clínico | session-cookie | — | perms:DIAG:READ, DIAG:WRITE | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/diagnostics/catalog/route.ts` |
| POST | `/api/diagnostics/imaging/reports` | diagnostics | Operaciones diagnóstico clínico | session-cookie | safeParse | perms:DIAG:RADIOLOGY | req:json-body / res:{ data, ... }, { error, ... } | `app/api/diagnostics/imaging/reports/route.ts` |
| POST | `/api/diagnostics/imaging/reports/[id]/release` | diagnostics | Operaciones diagnóstico clínico | session-cookie | — | perms:DIAG:RELEASE | req:path-params / res:{ data, ... }, { error, ... } | `app/api/diagnostics/imaging/reports/[id]/release/route.ts` |
| POST | `/api/diagnostics/imaging/reports/[id]/sign` | diagnostics | Operaciones diagnóstico clínico | session-cookie | — | perms:DIAG:RADIOLOGY | req:path-params / res:{ data, ... }, { error, ... } | `app/api/diagnostics/imaging/reports/[id]/sign/route.ts` |
| POST | `/api/diagnostics/imaging/studies` | diagnostics | Operaciones diagnóstico clínico | session-cookie | safeParse | perms:DIAG:WRITE | req:json-body / res:{ data, ... }, { error, ... } | `app/api/diagnostics/imaging/studies/route.ts` |
| POST | `/api/diagnostics/intake/create-order` | diagnostics | Operaciones diagnóstico clínico | session-cookie | zod, safeParse, z.object, z.enum | roles:ADMIN, SUPER_ADMIN | req:json-body / res:{ data, ... }, { error, ... } | `app/api/diagnostics/intake/create-order/route.ts` |
| POST | `/api/diagnostics/intake/create-patient` | diagnostics | Operaciones diagnóstico clínico | session-cookie | zod, safeParse, z.object | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/diagnostics/intake/create-patient/route.ts` |
| GET | `/api/diagnostics/intake/search-patient` | diagnostics | Operaciones diagnóstico clínico | session-cookie | — | — | req:query / res:{ data, ... } | `app/api/diagnostics/intake/search-patient/route.ts` |
| POST | `/api/diagnostics/lab/results` | diagnostics | Operaciones diagnóstico clínico | session-cookie | safeParse | perms:DIAG:WRITE | req:json-body / res:{ data, ... }, { error, ... } | `app/api/diagnostics/lab/results/route.ts` |
| POST | `/api/diagnostics/lab/results/[id]/release` | diagnostics | Operaciones diagnóstico clínico | session-cookie | — | perms:DIAG:RELEASE | req:path-params / res:{ data, ... }, { error, ... } | `app/api/diagnostics/lab/results/[id]/release/route.ts` |
| POST | `/api/diagnostics/lab/results/[id]/validate` | diagnostics | Operaciones diagnóstico clínico | session-cookie | — | perms:DIAG:VALIDATE | req:path-params / res:{ data, ... }, { error, ... } | `app/api/diagnostics/lab/results/[id]/validate/route.ts` |
| POST | `/api/diagnostics/lab/specimens` | diagnostics | Operaciones diagnóstico clínico | session-cookie | safeParse | perms:DIAG:WRITE | req:json-body / res:{ data, ... }, { error, ... } | `app/api/diagnostics/lab/specimens/route.ts` |
| GET, POST | `/api/diagnostics/orders` | diagnostics | Operaciones diagnóstico clínico | session-cookie | safeParse | perms:DIAG:READ, DIAG:WRITE | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/diagnostics/orders/route.ts` |
| POST | `/api/diagnostics/orders/[id]/admin-status` | diagnostics | Operaciones diagnóstico clínico | session-cookie | safeParse | perms:DIAG:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/diagnostics/orders/[id]/admin-status/route.ts` |
| POST | `/api/diagnostics/orders/[id]/pay` | diagnostics | Operaciones diagnóstico clínico | session-cookie | zod, safeParse, z.object | perms:DIAG:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/diagnostics/orders/[id]/pay/route.ts` |
| POST | `/api/diagnostics/orders/[id]/send-to-execution` | diagnostics | Operaciones diagnóstico clínico | session-cookie | — | perms:DIAG:WRITE | req:path-params / res:{ data, ... }, { error, ... } | `app/api/diagnostics/orders/[id]/send-to-execution/route.ts` |
| GET, POST | `/api/diagnostics/patients` | diagnostics | Operaciones diagnóstico clínico | session-cookie | — | perms:DIAG:READ, DIAG:WRITE | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/diagnostics/patients/route.ts` |
| POST | `/api/facturacion/expedientes/[id]/quick-action` | facturacion | Facturación operativa | session-cookie | zod, safeParse, z.object, z.enum | roles:Operador | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/facturacion/expedientes/[id]/quick-action/route.ts` |
| GET | `/api/files/[id]` | files | Descarga de archivos almacenados | session-cookie | — | — | req:path-params / res:{ error, ... } | `app/api/files/[id]/route.ts` |
| GET, POST, PATCH | `/api/finanzas/accounts` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/finanzas/accounts/route.ts` |
| POST | `/api/finanzas/attachments` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | roles:finance | req:form-data / res:{ data, ... }, { error, ... } | `app/api/finanzas/attachments/route.ts` |
| GET, POST, PATCH | `/api/finanzas/categories` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/finanzas/categories/route.ts` |
| GET, POST, PATCH | `/api/finanzas/financial-accounts` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/finanzas/financial-accounts/route.ts` |
| GET, POST | `/api/finanzas/journal-entries` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | roles:admin | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/finanzas/journal-entries/route.ts` |
| GET, PATCH | `/api/finanzas/journal-entries/[id]` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | — | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/finanzas/journal-entries/[id]/route.ts` |
| POST | `/api/finanzas/journal-entries/[id]/post` | finanzas | Finanzas (AR/AP/journal/caja) | public-or-unknown | — | — | req:path-params / res:{ data, ... }, { error, ... } | `app/api/finanzas/journal-entries/[id]/post/route.ts` |
| POST | `/api/finanzas/journal-entries/[id]/reverse` | finanzas | Finanzas (AR/AP/journal/caja) | public-or-unknown | — | roles:admin | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/finanzas/journal-entries/[id]/reverse/route.ts` |
| GET, POST, PATCH | `/api/finanzas/legal-entities` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | — | req:json-body / res:{ data, ... }, { error, ... } | `app/api/finanzas/legal-entities/route.ts` |
| GET, POST, PATCH | `/api/finanzas/parties` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/finanzas/parties/route.ts` |
| GET, POST, PATCH | `/api/finanzas/payables` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/finanzas/payables/route.ts` |
| POST | `/api/finanzas/payments` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | roles:admin | req:json-body / res:{ data, ... }, { error, ... } | `app/api/finanzas/payments/route.ts` |
| GET, POST, PATCH | `/api/finanzas/receivables` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/finanzas/receivables/route.ts` |
| GET, POST, PATCH | `/api/finanzas/subcategories` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/finanzas/subcategories/route.ts` |
| GET | `/api/finanzas/summary` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | — | req:query / res:{ data, ... }, { error, ... } | `app/api/finanzas/summary/route.ts` |
| GET, POST | `/api/finanzas/transactions` | finanzas | Finanzas (AR/AP/journal/caja) | header-or-token | — | roles:admin | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/finanzas/transactions/route.ts` |
| GET | `/api/health` | health | Health check de sistema/DB | public-or-unknown | — | — | req:— / res:{ ok, ... } | `app/api/health/route.ts` |
| GET | `/api/hr/attendance` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse | perms:HR:ATTENDANCE:READ | req:query / res:{ ok, ... } | `app/api/hr/attendance/route.ts` |
| GET, POST | `/api/hr/attendance/assignments` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:ATTENDANCE:WRITE | req:query, json-body / res:{ data, ... }, wrapped-handler-json | `app/api/hr/attendance/assignments/route.ts` |
| PATCH, DELETE | `/api/hr/attendance/assignments/[id]` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:ATTENDANCE:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/hr/attendance/assignments/[id]/route.ts` |
| GET | `/api/hr/attendance/day` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:ATTENDANCE:READ, T00:00:00Z | req:query / res:wrapped-handler-json | `app/api/hr/attendance/day/route.ts` |
| GET | `/api/hr/attendance/employee/[id]` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | roles:STAFF ; perms:HR:ATTENDANCE:READ, T00:00:00Z | req:query, path-params / res:{ data, ... }, wrapped-handler-json | `app/api/hr/attendance/employee/[id]/route.ts` |
| GET | `/api/hr/attendance/employee/[id]/daily` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | roles:STAFF ; perms:HR:ATTENDANCE:READ | req:query, path-params / res:{ data, ... }, wrapped-handler-json | `app/api/hr/attendance/employee/[id]/daily/route.ts` |
| POST | `/api/hr/attendance/event` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:ATTENDANCE:WRITE | req:json-body / res:{ data, ... }, wrapped-handler-json | `app/api/hr/attendance/event/route.ts` |
| PATCH, DELETE | `/api/hr/attendance/event/[id]` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:ATTENDANCE:WRITE | req:json-body, path-params / res:{ ok, ... }, { data, ... }, wrapped-handler-json | `app/api/hr/attendance/event/[id]/route.ts` |
| GET | `/api/hr/attendance/incidents` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:ATTENDANCE:READ | req:query / res:{ data, ... }, wrapped-handler-json | `app/api/hr/attendance/incidents/route.ts` |
| GET, POST | `/api/hr/attendance/logs` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse | perms:HR:ATTENDANCE:READ, HR:ATTENDANCE:WRITE | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/hr/attendance/logs/route.ts` |
| POST | `/api/hr/attendance/manual` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse | perms:HR:ATTENDANCE:WRITE | req:json-body / res:{ ok, ... } | `app/api/hr/attendance/manual/route.ts` |
| POST | `/api/hr/attendance/mark-in` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse | — | req:json-body / res:{ ok, ... } | `app/api/hr/attendance/mark-in/route.ts` |
| POST | `/api/hr/attendance/mark-out` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse | — | req:json-body / res:{ ok, ... } | `app/api/hr/attendance/mark-out/route.ts` |
| POST | `/api/hr/attendance/process-day` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:ATTENDANCE:WRITE | req:query / res:{ ok, ... }, wrapped-handler-json | `app/api/hr/attendance/process-day/route.ts` |
| GET | `/api/hr/attendance/processed` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:ATTENDANCE:READ | req:query / res:{ data, ... }, wrapped-handler-json | `app/api/hr/attendance/processed/route.ts` |
| POST | `/api/hr/attendance/raw` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:ATTENDANCE:WRITE | req:json-body / res:{ ok, ... }, wrapped-handler-json | `app/api/hr/attendance/raw/route.ts` |
| GET, POST | `/api/hr/attendance/shifts` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:ATTENDANCE:WRITE | req:query, json-body / res:{ data, ... }, wrapped-handler-json | `app/api/hr/attendance/shifts/route.ts` |
| PATCH | `/api/hr/attendance/shifts/[id]` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:ATTENDANCE:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/hr/attendance/shifts/[id]/route.ts` |
| POST | `/api/hr/attendance/shifts/[id]/set-default` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:ATTENDANCE:WRITE | req:path-params / res:{ ok, ... }, { error, ... }, wrapped-handler-json | `app/api/hr/attendance/shifts/[id]/set-default/route.ts` |
| GET | `/api/hr/attendance/sites` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:ATTENDANCE:READ, USERS:ADMIN | req:— / res:{ error, ... }, wrapped-handler-json | `app/api/hr/attendance/sites/route.ts` |
| GET | `/api/hr/attendance/today` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse | perms:HR:ATTENDANCE:READ | req:query / res:{ ok, ... } | `app/api/hr/attendance/today/route.ts` |
| GET, POST | `/api/hr/branches` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse | perms:HR:SETTINGS:READ, HR:SETTINGS:WRITE | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/hr/branches/route.ts` |
| PATCH | `/api/hr/branches/[id]` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse | perms:HR:SETTINGS:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/hr/branches/[id]/route.ts` |
| GET | `/api/hr/dashboard` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | — | perms:HR:DASHBOARD:READ, HR:EMPLOYEES:READ | req:— / res:{ error, ... } | `app/api/hr/dashboard/route.ts` |
| GET, POST, PATCH | `/api/hr/departments` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | — | perms:HR:SETTINGS:READ, HR:SETTINGS:WRITE | req:json-body / res:{ data, ... }, { error, ... } | `app/api/hr/departments/route.ts` |
| GET, POST | `/api/hr/employees` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling, schema-parse | perms:HR:EMPLOYEES:READ, HR:EMPLOYEES:WRITE, USERS:ADMIN | req:query, json-body / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/hr/employees/route.ts` |
| GET, PATCH | `/api/hr/employees/[id]` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | schema-parse | perms:HR:EMPLOYEES:READ, HR:EMPLOYEES:WRITE, USERS:ADMIN | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/hr/employees/[id]/route.ts` |
| POST | `/api/hr/employees/[id]/activate` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | roles:STAFF ; perms:HR:EMPLOYEES:STATUS | req:path-params / res:{ data, ... }, wrapped-handler-json | `app/api/hr/employees/[id]/activate/route.ts` |
| POST | `/api/hr/employees/[id]/archive` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling, schema-parse | perms:HR:EMPLOYEES:STATUS | req:json-body, path-params / res:{ data, ... }, wrapped-handler-json | `app/api/hr/employees/[id]/archive/route.ts` |
| GET | `/api/hr/employees/[id]/compensation` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | — | perms:HR:PAYROLL:READ | req:path-params / res:{ data, ... } | `app/api/hr/employees/[id]/compensation/route.ts` |
| GET | `/api/hr/employees/[id]/compensation/history` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | — | perms:HR:PAYROLL:READ | req:query, path-params / res:{ data, ... } | `app/api/hr/employees/[id]/compensation/history/route.ts` |
| POST | `/api/hr/employees/[id]/compensation/update` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse | perms:HR:PAYROLL:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/hr/employees/[id]/compensation/update/route.ts` |
| POST | `/api/hr/employees/[id]/complete` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | zod, safeParse, z.object, withApiErrorHandling, schema-parse | roles:STAFF ; perms:HR:EMPLOYEES:WRITE | req:json-body, path-params / res:{ data, ... }, wrapped-handler-json | `app/api/hr/employees/[id]/complete/route.ts` |
| GET, POST | `/api/hr/employees/[id]/disciplinary-actions` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, schema-parse | perms:HR:EMPLOYEES:READ, HR:EMPLOYEES:WRITE | req:query, json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/hr/employees/[id]/disciplinary-actions/route.ts` |
| GET, POST | `/api/hr/employees/[id]/documents` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | — | roles:ADMIN, HR_ADMIN, STAFF, VIEWER ; perms:HR:DOCS:READ, HR:DOCS:RESTRICTED, HR:DOCS:UPLOAD | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/hr/employees/[id]/documents/route.ts` |
| DELETE | `/api/hr/employees/[id]/documents/[docId]` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | — | perms:HR:DOCS:RESTRICTED, HR:DOCS:UPLOAD | req:path-params / res:{ ok, ... }, { error, ... } | `app/api/hr/employees/[id]/documents/[docId]/route.ts` |
| DELETE | `/api/hr/employees/[id]/draft` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:EMPLOYEES:DELETE, HR:EMPLOYEES:WRITE, USERS:ADMIN | req:— / res:{ ok, ... }, wrapped-handler-json | `app/api/hr/employees/[id]/draft/route.ts` |
| PATCH | `/api/hr/employees/[id]/step-1` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, schema-parse | perms:HR:EMPLOYEES:WRITE, USERS:ADMIN | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/hr/employees/[id]/step-1/route.ts` |
| PATCH | `/api/hr/employees/[id]/step-2` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, schema-parse | perms:HR:EMPLOYEES:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/hr/employees/[id]/step-2/route.ts` |
| PATCH | `/api/hr/employees/[id]/step-3` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, schema-parse | perms:HR:EMPLOYEES:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/hr/employees/[id]/step-3/route.ts` |
| POST | `/api/hr/employees/[id]/suspend` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling, schema-parse | perms:HR:EMPLOYEES:STATUS | req:json-body, path-params / res:{ data, ... }, wrapped-handler-json | `app/api/hr/employees/[id]/suspend/route.ts` |
| POST | `/api/hr/employees/[id]/terminate` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling, schema-parse | perms:HR:EMPLOYEES:STATUS | req:json-body, path-params / res:{ data, ... }, wrapped-handler-json | `app/api/hr/employees/[id]/terminate/route.ts` |
| POST | `/api/hr/employees/[id]/transfer` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, schema-parse | perms:HR:EMPLOYEES:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/hr/employees/[id]/transfer/route.ts` |
| GET, POST | `/api/hr/employees/[id]/warnings` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, schema-parse | perms:HR:EMPLOYEES:READ, HR:EMPLOYEES:WRITE | req:query, json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/hr/employees/[id]/warnings/route.ts` |
| GET | `/api/hr/employees/archived` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse, withApiErrorHandling | perms:HR:EMPLOYEES:READ | req:query / res:{ data, ... }, wrapped-handler-json | `app/api/hr/employees/archived/route.ts` |
| GET | `/api/hr/employees/options` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | — | perms:HR:EMPLOYEES:READ | req:query / res:{ ok, ... } | `app/api/hr/employees/options/route.ts` |
| GET | `/api/hr/employees/pending` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:EMPLOYEES:READ | req:query / res:{ data, ... }, wrapped-handler-json | `app/api/hr/employees/pending/route.ts` |
| POST | `/api/hr/employees/quick-create` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | zod, safeParse, z.object, z.enum, withApiErrorHandling | perms:HR:EMPLOYEES:WRITE | req:json-body / res:{ data, ... }, wrapped-handler-json | `app/api/hr/employees/quick-create/route.ts` |
| GET, POST | `/api/hr/payroll` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | zod, safeParse, z.object, withApiErrorHandling | perms:HR:PAYROLL:READ, HR:PAYROLL:WRITE | req:query, json-body / res:{ ok, ... }, wrapped-handler-json | `app/api/hr/payroll/route.ts` |
| GET, PATCH | `/api/hr/payroll/[id]` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:PAYROLL:READ, HR:PAYROLL:WRITE | req:json-body, path-params / res:{ ok, ... }, wrapped-handler-json | `app/api/hr/payroll/[id]/route.ts` |
| POST | `/api/hr/payroll/[id]/approve` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:PAYROLL:APPROVE | req:path-params / res:{ ok, ... }, wrapped-handler-json | `app/api/hr/payroll/[id]/approve/route.ts` |
| POST | `/api/hr/payroll/[id]/employees/[employeeId]/email` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:PAYROLL:READ | req:json-body, path-params / res:{ ok, ... }, wrapped-handler-json | `app/api/hr/payroll/[id]/employees/[employeeId]/email/route.ts` |
| GET | `/api/hr/payroll/[id]/employees/[employeeId]/export.csv` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:PAYROLL:READ | req:path-params / res:wrapped-handler-json | `app/api/hr/payroll/[id]/employees/[employeeId]/export.csv/route.ts` |
| GET | `/api/hr/payroll/[id]/employees/[employeeId]/payslip.pdf` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:PAYROLL:READ | req:path-params / res:wrapped-handler-json | `app/api/hr/payroll/[id]/employees/[employeeId]/payslip.pdf/route.ts` |
| GET | `/api/hr/payroll/[id]/export` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:PAYROLL:READ | req:path-params / res:wrapped-handler-json | `app/api/hr/payroll/[id]/export/route.ts` |
| GET | `/api/hr/payroll/[id]/export.csv` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:PAYROLL:READ | req:query, path-params / res:wrapped-handler-json | `app/api/hr/payroll/[id]/export.csv/route.ts` |
| PATCH | `/api/hr/payroll/[id]/line/[lineId]` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:PAYROLL:WRITE | req:json-body, path-params / res:{ data, ... }, wrapped-handler-json | `app/api/hr/payroll/[id]/line/[lineId]/route.ts` |
| POST | `/api/hr/payroll/[id]/publish` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:PAYROLL:PUBLISH | req:path-params / res:{ ok, ... }, wrapped-handler-json | `app/api/hr/payroll/[id]/publish/route.ts` |
| POST | `/api/hr/payroll/[id]/recalculate` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | — | perms:HR:PAYROLL:WRITE | req:path-params / res:{ data, ... }, { error, ... } | `app/api/hr/payroll/[id]/recalculate/route.ts` |
| GET | `/api/hr/payroll/preview` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | withApiErrorHandling | perms:HR:PAYROLL:READ | req:query / res:{ ok, ... }, wrapped-handler-json | `app/api/hr/payroll/preview/route.ts` |
| GET, POST, PATCH | `/api/hr/positions` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | — | perms:HR:SETTINGS:READ, HR:SETTINGS:WRITE | req:json-body / res:{ data, ... }, { error, ... } | `app/api/hr/positions/route.ts` |
| GET, PATCH | `/api/hr/settings` | hr | Operaciones RRHH (empleados/asistencia/nómina) | session-cookie | safeParse | perms:HR:SETTINGS:READ, HR:SETTINGS:WRITE | req:json-body / res:{ ok, ... } | `app/api/hr/settings/route.ts` |
| POST | `/api/integrations/hl7/oru` | integrations | Operación de API del ERP | session-cookie | safeParse | perms:DIAG:WRITE | req:json-body / res:{ ok, ... }, { error, ... } | `app/api/integrations/hl7/oru/route.ts` |
| POST | `/api/integrations/openai/test` | integrations | Operación de API del ERP | header-or-token | — | — | req:— / res:{ ok, ... } | `app/api/integrations/openai/test/route.ts` |
| GET | `/api/inventario/auditoria/export/xlsx` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:— / res:{ error, ... } | `app/api/inventario/auditoria/export/xlsx/route.ts` |
| GET, POST | `/api/inventario/categorias/productos` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body / res:{ data, ... }, { error, ... } | `app/api/inventario/categorias/productos/route.ts` |
| GET, PATCH, DELETE | `/api/inventario/categorias/productos/[id]` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body, path-params / res:{ ok, ... }, { data, ... }, { error, ... } | `app/api/inventario/categorias/productos/[id]/route.ts` |
| GET, POST | `/api/inventario/categorias/servicios` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body / res:{ data, ... }, { error, ... } | `app/api/inventario/categorias/servicios/route.ts` |
| GET, PATCH, DELETE | `/api/inventario/categorias/servicios/[id]` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body, path-params / res:{ ok, ... }, { data, ... }, { error, ... } | `app/api/inventario/categorias/servicios/[id]/route.ts` |
| GET, POST | `/api/inventario/combos` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/inventario/combos/route.ts` |
| GET, PATCH, DELETE | `/api/inventario/combos/[id]` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body, path-params / res:{ ok, ... }, { data, ... }, { error, ... } | `app/api/inventario/combos/[id]/route.ts` |
| POST | `/api/inventario/combos/bulk` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body / res:{ error, ... } | `app/api/inventario/combos/bulk/route.ts` |
| GET, POST | `/api/inventario/email-schedules` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body / res:{ data, ... }, { error, ... } | `app/api/inventario/email-schedules/route.ts` |
| PATCH, DELETE | `/api/inventario/email-schedules/[id]` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/inventario/email-schedules/[id]/route.ts` |
| POST | `/api/inventario/email-schedules/[id]/run` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:path-params / res:{ error, ... } | `app/api/inventario/email-schedules/[id]/run/route.ts` |
| POST | `/api/inventario/importar/[kind]` | inventario | Inventario productos/servicios/movimientos | public-or-unknown | — | roles:admin | req:query, form-data, path-params / res:{ error, ... } | `app/api/inventario/importar/[kind]/route.ts` |
| GET | `/api/inventario/integrity` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:— / res:{ error, ... } | `app/api/inventario/integrity/route.ts` |
| GET, POST | `/api/inventario/margin-policy` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body / res:{ data, ... }, { error, ... } | `app/api/inventario/margin-policy/route.ts` |
| GET, POST | `/api/inventario/movimientos` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador, Operador, Recepcion | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/inventario/movimientos/route.ts` |
| GET | `/api/inventario/movimientos/export` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador, Operador, Recepcion | req:query / res:— | `app/api/inventario/movimientos/export/route.ts` |
| GET | `/api/inventario/movimientos/export/pdf` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador, Operador, Recepcion | req:query / res:{ error, ... } | `app/api/inventario/movimientos/export/pdf/route.ts` |
| POST | `/api/inventario/movimientos/send` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body / res:{ error, ... } | `app/api/inventario/movimientos/send/route.ts` |
| GET, POST | `/api/inventario/ordenes` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/inventario/ordenes/route.ts` |
| GET, PATCH | `/api/inventario/ordenes/[id]` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/inventario/ordenes/[id]/route.ts` |
| GET | `/api/inventario/plantillas/[kind]` | inventario | Inventario productos/servicios/movimientos | public-or-unknown | — | — | req:path-params / res:— | `app/api/inventario/plantillas/[kind]/route.ts` |
| GET, PATCH | `/api/inventario/prices/matrix` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:query, json-body / res:{ error, ... } | `app/api/inventario/prices/matrix/route.ts` |
| GET | `/api/inventario/prices/matrix/export/xlsx` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:query / res:{ error, ... } | `app/api/inventario/prices/matrix/export/xlsx/route.ts` |
| POST | `/api/inventario/prices/matrix/import/xlsx` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:form-data / res:{ error, ... } | `app/api/inventario/prices/matrix/import/xlsx/route.ts` |
| GET | `/api/inventario/productos` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | — | req:query / res:{ error, ... } | `app/api/inventario/productos/route.ts` |
| POST | `/api/inventario/productos/bulk` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | — | req:json-body / res:{ error, ... } | `app/api/inventario/productos/bulk/route.ts` |
| GET | `/api/inventario/qa/export/xlsx` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:— / res:{ error, ... } | `app/api/inventario/qa/export/xlsx/route.ts` |
| GET | `/api/inventario/qa/run` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:— / res:{ error, ... } | `app/api/inventario/qa/run/route.ts` |
| GET | `/api/inventario/reports/cierre-sat` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:query / res:{ data, ... }, { error, ... } | `app/api/inventario/reports/cierre-sat/route.ts` |
| GET | `/api/inventario/reports/cierre-sat/export/pdf` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:query / res:{ error, ... } | `app/api/inventario/reports/cierre-sat/export/pdf/route.ts` |
| GET | `/api/inventario/reports/cierre-sat/export/xlsx` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:query / res:{ error, ... } | `app/api/inventario/reports/cierre-sat/export/xlsx/route.ts` |
| POST | `/api/inventario/reports/run` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:path-params / res:{ error, ... } | `app/api/inventario/reports/run/route.ts` |
| GET, POST | `/api/inventario/reports/settings` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body / res:{ data, ... }, { error, ... } | `app/api/inventario/reports/settings/route.ts` |
| POST | `/api/inventario/reports/test` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body, path-params / res:{ error, ... } | `app/api/inventario/reports/test/route.ts` |
| POST | `/api/inventario/reset` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body / res:{ error, ... } | `app/api/inventario/reset/route.ts` |
| GET | `/api/inventario/servicios` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | — | req:query / res:{ error, ... } | `app/api/inventario/servicios/route.ts` |
| POST | `/api/inventario/servicios/bulk` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | — | req:json-body / res:{ error, ... } | `app/api/inventario/servicios/bulk/route.ts` |
| GET, POST | `/api/inventario/solicitudes` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador, Operador | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/inventario/solicitudes/route.ts` |
| GET, PATCH | `/api/inventario/solicitudes/[id]` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador, Operador | req:json-body, path-params / res:{ data, ... }, { error, ... } | `app/api/inventario/solicitudes/[id]/route.ts` |
| GET, POST | `/api/inventario/subcategorias/productos` | inventario | Inventario productos/servicios/movimientos | public-or-unknown | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/inventario/subcategorias/productos/route.ts` |
| PATCH, DELETE | `/api/inventario/subcategorias/productos/[id]` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body, path-params / res:{ ok, ... }, { data, ... }, { error, ... } | `app/api/inventario/subcategorias/productos/[id]/route.ts` |
| GET, POST | `/api/inventario/subcategorias/servicios` | inventario | Inventario productos/servicios/movimientos | public-or-unknown | — | — | req:query, json-body / res:{ data, ... }, { error, ... } | `app/api/inventario/subcategorias/servicios/route.ts` |
| PATCH, DELETE | `/api/inventario/subcategorias/servicios/[id]` | inventario | Inventario productos/servicios/movimientos | header-or-token | — | roles:Administrador | req:json-body, path-params / res:{ ok, ... }, { data, ... }, { error, ... } | `app/api/inventario/subcategorias/servicios/[id]/route.ts` |
| GET, POST | `/api/labtest/access` | labtest | Operación LabTest | session-cookie | — | perms:LABTEST:ADMIN | req:json-body / res:{ ok, ... } | `app/api/labtest/access/route.ts` |
| POST | `/api/labtest/auth/send-otp` | labtest | Operación LabTest | session-cookie | — | roles:SUPER_ADMIN | req:— / res:{ ok, ... } | `app/api/labtest/auth/send-otp/route.ts` |
| POST | `/api/labtest/auth/verify-otp` | labtest | Operación LabTest | session-cookie | — | roles:SUPER_ADMIN | req:json-body / res:{ ok, ... } | `app/api/labtest/auth/verify-otp/route.ts` |
| GET, POST | `/api/labtest/catalog/categories` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:ADMIN, LABTEST:READ | req:json-body / res:— | `app/api/labtest/catalog/categories/route.ts` |
| GET, POST | `/api/labtest/catalog/subcategories` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:ADMIN, LABTEST:READ | req:json-body / res:— | `app/api/labtest/catalog/subcategories/route.ts` |
| GET, POST | `/api/labtest/catalog/tests` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:ADMIN, LABTEST:READ | req:json-body / res:— | `app/api/labtest/catalog/tests/route.ts` |
| POST | `/api/labtest/contact` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:WORK | req:json-body / res:— | `app/api/labtest/contact/route.ts` |
| GET, POST | `/api/labtest/instruments` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:ADMIN, LABTEST:READ, LABTEST:WRITE | req:json-body / res:— | `app/api/labtest/instruments/route.ts` |
| POST | `/api/labtest/items/status` | labtest | Operación LabTest | session-cookie | — | roles:SUPER_ADMIN, ADMIN ; perms:LABTEST:WORK | req:json-body / res:— | `app/api/labtest/items/status/route.ts` |
| GET | `/api/labtest/logs/results` | labtest | Operación LabTest | session-cookie | — | perms:LABTEST:READ | req:query / res:— | `app/api/labtest/logs/results/route.ts` |
| GET | `/api/labtest/logs/specimens` | labtest | Operación LabTest | session-cookie | — | perms:LABTEST:READ | req:query / res:— | `app/api/labtest/logs/specimens/route.ts` |
| POST | `/api/labtest/orders` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:WRITE | req:json-body / res:— | `app/api/labtest/orders/route.ts` |
| GET | `/api/labtest/orders/[id]/document-preview` | labtest | Operación LabTest | session-cookie | — | perms:LABTEST:READ | req:path-params / res:— | `app/api/labtest/orders/[id]/document-preview/route.ts` |
| POST | `/api/labtest/release` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:WORK | req:json-body / res:— | `app/api/labtest/release/route.ts` |
| GET | `/api/labtest/reports/summary` | labtest | Operación LabTest | session-cookie | — | perms:LABTEST:READ | req:query / res:— | `app/api/labtest/reports/summary/route.ts` |
| GET | `/api/labtest/requirements` | labtest | Operación LabTest | session-cookie | — | perms:LABTEST:READ | req:query / res:— | `app/api/labtest/requirements/route.ts` |
| GET, POST | `/api/labtest/results` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:READ, LABTEST:WRITE | req:json-body / res:— | `app/api/labtest/results/route.ts` |
| POST | `/api/labtest/samples` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:WRITE | req:json-body / res:— | `app/api/labtest/samples/route.ts` |
| POST | `/api/labtest/send` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:WORK | req:json-body / res:— | `app/api/labtest/send/route.ts` |
| GET, POST | `/api/labtest/settings` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:ADMIN, LABTEST:READ | req:json-body / res:— | `app/api/labtest/settings/route.ts` |
| GET, POST | `/api/labtest/templates` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:ADMIN, LABTEST:READ | req:query, json-body / res:— | `app/api/labtest/templates/route.ts` |
| GET, POST | `/api/labtest/templates/v2` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:ADMIN, LABTEST:READ | req:json-body / res:— | `app/api/labtest/templates/v2/route.ts` |
| POST | `/api/labtest/validate` | labtest | Operación LabTest | session-cookie | safeParse | perms:LABTEST:VALIDATE | req:json-body / res:— | `app/api/labtest/validate/route.ts` |
| GET | `/api/labtest/workbench/[area]` | labtest | Operación LabTest | session-cookie | — | perms:LABTEST:READ | req:path-params / res:— | `app/api/labtest/workbench/[area]/route.ts` |
| POST | `/api/login` | login | Autentica usuario y crea cookie de sesión | public-or-unknown | — | — | req:json-body / res:{ error, ... } | `app/api/login/route.ts` |
| POST | `/api/logout` | logout | Cierra sesión y limpia cookie | public-or-unknown | — | — | req:— / res:— | `app/api/logout/route.ts` |
| GET | `/api/marcaje/raw` | marcaje | Operación de API del ERP | session-cookie | withApiErrorHandling | perms:HR:ATTENDANCE:READ, USERS:ADMIN | req:query / res:{ ok, ... }, { error, ... }, wrapped-handler-json | `app/api/marcaje/raw/route.ts` |
| GET | `/api/marcaje/status` | marcaje | Operación de API del ERP | session-cookie | withApiErrorHandling | perms:HR:ATTENDANCE:READ, USERS:ADMIN | req:query / res:{ ok, ... }, { error, ... }, wrapped-handler-json | `app/api/marcaje/status/route.ts` |
| GET | `/api/me` | me | Operación de API del ERP | session-cookie | — | — | req:— / res:— | `app/api/me/route.ts` |
| GET, POST | `/api/medical/cie10` | medical | Encounter clínico y worklists médicas | session-cookie | safeParse | — | req:query, json-body / res:{ ok, ... } | `app/api/medical/cie10/route.ts` |
| GET, PATCH | `/api/medical/cie10/[id]` | medical | Encounter clínico y worklists médicas | session-cookie | safeParse | — | req:json-body, path-params / res:{ ok, ... } | `app/api/medical/cie10/[id]/route.ts` |
| POST | `/api/medical/cie10/[id]/toggle-active` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:path-params / res:{ ok, ... } | `app/api/medical/cie10/[id]/toggle-active/route.ts` |
| GET, POST | `/api/medical/document-branding` | medical | Encounter clínico y worklists médicas | session-cookie | safeParse | — | req:query, json-body / res:{ ok, ... } | `app/api/medical/document-branding/route.ts` |
| GET, DELETE | `/api/medical/document-branding/[id]` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:path-params / res:{ ok, ... } | `app/api/medical/document-branding/[id]/route.ts` |
| GET, POST | `/api/medical/document-settings` | medical | Encounter clínico y worklists médicas | session-cookie | safeParse | — | req:json-body / res:{ ok, ... } | `app/api/medical/document-settings/route.ts` |
| GET | `/api/medical/encounters/[encounterId]` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/route.ts` |
| POST | `/api/medical/encounters/[encounterId]/close` | medical | Encounter clínico y worklists médicas | session-cookie | safeParse | — | req:json-body, path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/close/route.ts` |
| PATCH | `/api/medical/encounters/[encounterId]/draft` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:json-body, path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/draft/route.ts` |
| GET, POST | `/api/medical/encounters/[encounterId]/orders` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:json-body, path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/orders/route.ts` |
| PATCH, DELETE | `/api/medical/encounters/[encounterId]/orders/[orderId]` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:json-body, path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/orders/[orderId]/route.ts` |
| GET | `/api/medical/encounters/[encounterId]/pdf` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/pdf/route.ts` |
| GET | `/api/medical/encounters/[encounterId]/pdf-binary` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/pdf-binary/route.ts` |
| GET, POST | `/api/medical/encounters/[encounterId]/reconsultations` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:json-body, path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/reconsultations/route.ts` |
| GET | `/api/medical/encounters/[encounterId]/results` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/results/route.ts` |
| GET, POST | `/api/medical/encounters/[encounterId]/snapshot` | medical | Encounter clínico y worklists médicas | session-cookie | safeParse | — | req:json-body, path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/snapshot/route.ts` |
| GET, POST | `/api/medical/encounters/[encounterId]/supplies` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:json-body, path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/supplies/route.ts` |
| DELETE | `/api/medical/encounters/[encounterId]/supplies/[supplyId]` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:path-params / res:{ ok, ... } | `app/api/medical/encounters/[encounterId]/supplies/[supplyId]/route.ts` |
| GET | `/api/medical/inventory/search` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:query / res:{ ok, ... } | `app/api/medical/inventory/search/route.ts` |
| POST | `/api/medical/orders/[orderId]/result` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:json-body, path-params / res:{ ok, ... } | `app/api/medical/orders/[orderId]/result/route.ts` |
| PATCH | `/api/medical/orders/[orderId]/status` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:json-body, path-params / res:{ ok, ... } | `app/api/medical/orders/[orderId]/status/route.ts` |
| GET | `/api/medical/services/search` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:query / res:{ ok, ... } | `app/api/medical/services/search/route.ts` |
| GET, POST | `/api/medical/templates` | medical | Encounter clínico y worklists médicas | session-cookie | safeParse | — | req:json-body / res:{ ok, ... } | `app/api/medical/templates/route.ts` |
| GET, DELETE | `/api/medical/templates/[id]` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:path-params / res:{ ok, ... } | `app/api/medical/templates/[id]/route.ts` |
| GET, POST | `/api/medical/vitals-templates` | medical | Encounter clínico y worklists médicas | session-cookie | safeParse | — | req:json-body / res:{ ok, ... } | `app/api/medical/vitals-templates/route.ts` |
| GET, DELETE | `/api/medical/vitals-templates/[id]` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:path-params / res:{ ok, ... } | `app/api/medical/vitals-templates/[id]/route.ts` |
| GET | `/api/medical/worklist` | medical | Encounter clínico y worklists médicas | session-cookie | — | — | req:query / res:{ ok, ... } | `app/api/medical/worklist/route.ts` |
| GET | `/api/memberships/clients` | memberships | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:CONTRACTS:WRITE, MEMBERSHIPS:WRITE | req:query / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/memberships/clients/route.ts` |
| GET, POST | `/api/memberships/config` | memberships | Operaciones de membresías | session-cookie | zod, safeParse, z.object, withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:CONFIG:READ, MEMBERSHIPS:CONFIG:WRITE, MEMBERSHIPS:DASHBOARD, MEMBERSHIPS:READ, MEMBERSHIPS:WRITE | req:json-body / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/memberships/config/route.ts` |
| GET, POST | `/api/memberships/contracts` | memberships | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:CONTRACTS:READ, MEMBERSHIPS:CONTRACTS:WRITE, MEMBERSHIPS:READ, MEMBERSHIPS:WRITE | req:query, json-body / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/memberships/contracts/route.ts` |
| GET | `/api/memberships/contracts/[id]` | memberships | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:CONTRACTS:READ, MEMBERSHIPS:READ | req:path-params / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/memberships/contracts/[id]/route.ts` |
| POST | `/api/memberships/contracts/[id]/payment` | memberships | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:PAYMENTS:WRITE, MEMBERSHIPS:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/memberships/contracts/[id]/payment/route.ts` |
| POST | `/api/memberships/contracts/[id]/status` | memberships | Operaciones de membresías | session-cookie | zod, safeParse, z.object, withApiErrorHandling, schema-parse | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:CONTRACTS:WRITE, MEMBERSHIPS:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/memberships/contracts/[id]/status/route.ts` |
| GET | `/api/memberships/dashboard` | memberships | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:DASHBOARD, MEMBERSHIPS:READ | req:— / res:{ error, ... }, wrapped-handler-json | `app/api/memberships/dashboard/route.ts` |
| GET | `/api/memberships/plans` | memberships | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:PLANS:READ, MEMBERSHIPS:READ | req:— / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/memberships/plans/route.ts` |
| POST | `/api/memberships/plans/[id]/status` | memberships | Operaciones de membresías | session-cookie | zod, safeParse, z.object, withApiErrorHandling, schema-parse | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:PLANS:WRITE, MEMBERSHIPS:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/memberships/plans/[id]/status/route.ts` |
| GET | `/api/membresias/clientes` | membresias | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:CONTRACTS:WRITE, MEMBERSHIPS:WRITE | req:query / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/membresias/clientes/route.ts` |
| GET, POST | `/api/membresias/config` | membresias | Operaciones de membresías | session-cookie | zod, safeParse, z.object, withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:CONFIG:READ, MEMBERSHIPS:CONFIG:WRITE, MEMBERSHIPS:DASHBOARD, MEMBERSHIPS:READ, MEMBERSHIPS:WRITE | req:json-body / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/membresias/config/route.ts` |
| GET, POST | `/api/membresias/contratos` | membresias | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:CONTRACTS:READ, MEMBERSHIPS:CONTRACTS:WRITE, MEMBERSHIPS:READ, MEMBERSHIPS:WRITE | req:query, json-body / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/membresias/contratos/route.ts` |
| GET | `/api/membresias/contratos/[id]` | membresias | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:CONTRACTS:READ, MEMBERSHIPS:READ | req:path-params / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/membresias/contratos/[id]/route.ts` |
| POST | `/api/membresias/contratos/[id]/estado` | membresias | Operaciones de membresías | public-or-unknown | — | — | req:path-params / res:— | `app/api/membresias/contratos/[id]/estado/route.ts` |
| POST | `/api/membresias/contratos/[id]/pago` | membresias | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:PAYMENTS:WRITE, MEMBERSHIPS:WRITE | req:json-body, path-params / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/membresias/contratos/[id]/pago/route.ts` |
| GET | `/api/membresias/dashboard` | membresias | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:DASHBOARD, MEMBERSHIPS:READ | req:— / res:{ error, ... }, wrapped-handler-json | `app/api/membresias/dashboard/route.ts` |
| GET | `/api/membresias/planes` | membresias | Operaciones de membresías | session-cookie | withApiErrorHandling | perms:MEMBERSHIPS:ADMIN, MEMBERSHIPS:PLANS:READ, MEMBERSHIPS:READ | req:— / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/membresias/planes/route.ts` |
| POST | `/api/membresias/planes/[id]/estado` | membresias | Operaciones de membresías | public-or-unknown | — | — | req:path-params / res:— | `app/api/membresias/planes/[id]/estado/route.ts` |
| GET | `/api/public/turnos` | public | API pública de turnos en pantalla | public-or-unknown | — | — | req:query / res:{ error, ... } | `app/api/public/turnos/route.ts` |
| GET, POST | `/api/reception/service-requests` | reception | Operación de recepción | session-cookie | withApiErrorHandling | — | req:query, json-body / res:{ ok, ... }, { error, ... }, wrapped-handler-json | `app/api/reception/service-requests/route.ts` |
| GET, PATCH | `/api/reception/service-requests/[id]` | reception | Operación de recepción | session-cookie | withApiErrorHandling | — | req:json-body, path-params / res:{ ok, ... }, { error, ... }, wrapped-handler-json | `app/api/reception/service-requests/[id]/route.ts` |
| GET | `/api/terminology/icd10/search` | terminology | Operación de API del ERP | session-cookie | withApiErrorHandling | — | req:query / res:wrapped-handler-json | `app/api/terminology/icd10/search/route.ts` |
| GET, POST | `/api/text-docs` | text-docs | Operación de API del ERP | session-cookie | zod, safeParse, z.object, z.enum | — | req:json-body / res:{ ok, ... } | `app/api/text-docs/route.ts` |
| GET, PUT | `/api/text-docs/[id]` | text-docs | Operación de API del ERP | session-cookie | zod, safeParse, z.object | — | req:json-body, path-params / res:{ ok, ... } | `app/api/text-docs/[id]/route.ts` |
| POST | `/api/text-docs/export` | text-docs | Operación de API del ERP | session-cookie | zod, safeParse, z.object | — | req:json-body / res:{ ok, ... } | `app/api/text-docs/export/route.ts` |
| POST | `/api/text-docs/upload` | text-docs | Operación de API del ERP | session-cookie | — | — | req:form-data / res:{ ok, ... } | `app/api/text-docs/upload/route.ts` |
| POST | `/api/upload/image` | upload | Carga de archivos/imagenes | public-or-unknown | — | — | req:form-data / res:{ ok, ... } | `app/api/upload/image/route.ts` |
| GET, POST | `/api/upload/logo` | upload | Carga de archivos/imagenes | public-or-unknown | — | — | req:— / res:{ ok, ... } | `app/api/upload/logo/route.ts` |
| GET, POST | `/api/users` | users | Gestión de usuarios y vínculo RRHH | session-cookie | withApiErrorHandling | perms:USERS:ADMIN | req:query, json-body / res:{ data, ... }, { error, ... }, wrapped-handler-json | `app/api/users/route.ts` |
| GET | `/api/users/[id]/hr-link` | users | Gestión de usuarios y vínculo RRHH | session-cookie | — | perms:USERS:ADMIN | req:path-params / res:— | `app/api/users/[id]/hr-link/route.ts` |
| POST | `/api/users/[id]/link-hr` | users | Gestión de usuarios y vínculo RRHH | session-cookie | zod, safeParse, z.object, withApiErrorHandling | perms:USERS:ADMIN | req:json-body, path-params / res:{ data, ... }, wrapped-handler-json | `app/api/users/[id]/link-hr/route.ts` |
| POST | `/api/users/[id]/unlink-hr` | users | Gestión de usuarios y vínculo RRHH | session-cookie | withApiErrorHandling | perms:USERS:ADMIN | req:path-params / res:{ data, ... }, wrapped-handler-json | `app/api/users/[id]/unlink-hr/route.ts` |
| POST | `/api/whatsapp/send` | whatsapp | Mensajería WhatsApp (stub/integración) | public-or-unknown | — | — | req:json-body / res:{ ok, ... } | `app/api/whatsapp/send/route.ts` |
| GET | `/api/whatsapp/threads` | whatsapp | Mensajería WhatsApp (stub/integración) | public-or-unknown | — | — | req:query / res:{ error, ... } | `app/api/whatsapp/threads/route.ts` |

### C.4 Endpoints huérfanos y llamadas UI no resueltas (análisis estático)

### UI→API no resueltas (parser estático)
| UI archivo | llamada detectada | normalizada |
|---|---|---|
| `app/admin/configuracion/marcaje/page.tsx` | `/api/attendance/punch-tokens${params}` | `/api/attendance/punch-tokens__DYN__` |
| `app/hr/attendance/page.tsx` | `/api/hr/employees/options${qs}` | `/api/hr/employees/options__DYN__` |
| `app/hr/employees/page.tsx` | `/api/hr/disciplinary-actions/${actionId}/submit` | `/api/hr/disciplinary-actions/__DYN__/submit` |
| `app/hr/employees/page.tsx` | `/api/hr/disciplinary-actions/${actionId}/approve` | `/api/hr/disciplinary-actions/__DYN__/approve` |
| `app/hr/employees/page.tsx` | `/api/hr/disciplinary-actions/${actionId}/reject` | `/api/hr/disciplinary-actions/__DYN__/reject` |
| `app/hr/payroll/page.tsx` | `/api/hr/payroll/preview${qs ? ` | `/api/hr/payroll/preview${qs` |
| `app/hr/payroll/page.tsx` | `/api/hr/payroll${qs ? ` | `/api/hr/payroll${qs` |
| `app/marcaje/page.tsx` | `/api/marcaje/status${qs}` | `/api/marcaje/status__DYN__` |
| `app/marcaje/tokens/page.tsx` | `/api/attendance/punch-tokens${qs}` | `/api/attendance/punch-tokens__DYN__` |

### Endpoints potencialmente huérfanos (sin referencia directa en fetch estático)
Total: 157
| Ruta | Métodos | Auth | Archivo |
|---|---|---|---|
| `/api/admin/clientes/export/csv` | GET | session-cookie | `app/api/admin/clientes/export/csv/route.ts` |
| `/api/admin/clientes/import/template` | GET | session-cookie | `app/api/admin/clientes/import/template/route.ts` |
| `/api/admin/companies` | GET | session-cookie | `app/api/admin/companies/route.ts` |
| `/api/admin/companies/[id]` | GET | session-cookie | `app/api/admin/companies/[id]/route.ts` |
| `/api/admin/health/db` | GET | session-cookie | `app/api/admin/health/db/route.ts` |
| `/api/admin/locations/departments` | GET, POST, PATCH | session-cookie | `app/api/admin/locations/departments/route.ts` |
| `/api/admin/locations/municipalities` | GET, POST, PATCH | session-cookie | `app/api/admin/locations/municipalities/route.ts` |
| `/api/agenda/updates` | GET | session-cookie | `app/api/agenda/updates/route.ts` |
| `/api/ai/parse-attendance` | POST | session-cookie | `app/api/ai/parse-attendance/route.ts` |
| `/api/attendance/raw/process` | POST | session-cookie | `app/api/attendance/raw/process/route.ts` |
| `/api/clientes/plantilla-excel` | GET | public-or-unknown | `app/api/clientes/plantilla-excel/route.ts` |
| `/api/config/apis/[key]` | PATCH | header-or-token | `app/api/config/apis/[key]/route.ts` |
| `/api/config/integrations/attendance/test` | POST | header-or-token | `app/api/config/integrations/attendance/test/route.ts` |
| `/api/config/integrations/lab/test` | POST | header-or-token | `app/api/config/integrations/lab/test/route.ts` |
| `/api/config/mail/global` | GET, POST | header-or-token | `app/api/config/mail/global/route.ts` |
| `/api/config/mail/modules/[moduleKey]` | PATCH | header-or-token | `app/api/config/mail/modules/[moduleKey]/route.ts` |
| `/api/config/mail/modules/[moduleKey]/test` | POST | header-or-token | `app/api/config/mail/modules/[moduleKey]/test/route.ts` |
| `/api/crm/accounts` | GET, POST, PATCH | session-cookie | `app/api/crm/accounts/route.ts` |
| `/api/crm/activities` | GET, POST, PATCH | session-cookie | `app/api/crm/activities/route.ts` |
| `/api/crm/calendar` | GET, POST, PATCH, DELETE | session-cookie | `app/api/crm/calendar/route.ts` |
| `/api/crm/contacts` | GET, POST, PATCH | session-cookie | `app/api/crm/contacts/route.ts` |
| `/api/crm/dashboard-metrics` | GET | session-cookie | `app/api/crm/dashboard-metrics/route.ts` |
| `/api/crm/deals` | GET, POST, PATCH | session-cookie | `app/api/crm/deals/route.ts` |
| `/api/crm/deals/[id]` | GET | session-cookie | `app/api/crm/deals/[id]/route.ts` |
| `/api/crm/deals/[id]/pipeline` | GET | session-cookie | `app/api/crm/deals/[id]/pipeline/route.ts` |
| `/api/crm/deals/inbox` | GET | session-cookie | `app/api/crm/deals/inbox/route.ts` |
| `/api/crm/jobs/run` | POST | header-or-token | `app/api/crm/jobs/run/route.ts` |
| `/api/crm/leads` | GET, POST, PATCH | session-cookie | `app/api/crm/leads/route.ts` |
| `/api/crm/leads/[id]/convert` | POST | session-cookie | `app/api/crm/leads/[id]/convert/route.ts` |
| `/api/crm/quotes` | GET, POST, PATCH | session-cookie | `app/api/crm/quotes/route.ts` |
| `/api/crm/quotes-v2` | GET, POST | session-cookie | `app/api/crm/quotes-v2/route.ts` |
| `/api/crm/quotes-v2/[id]` | GET, PATCH | session-cookie | `app/api/crm/quotes-v2/[id]/route.ts` |
| `/api/crm/quotes-v2/[id]/approve` | POST | session-cookie | `app/api/crm/quotes-v2/[id]/approve/route.ts` |
| `/api/crm/quotes-v2/[id]/deliveries` | GET | session-cookie | `app/api/crm/quotes-v2/[id]/deliveries/route.ts` |
| `/api/crm/quotes-v2/[id]/generate-pdf` | POST | session-cookie | `app/api/crm/quotes-v2/[id]/generate-pdf/route.ts` |
| `/api/crm/quotes-v2/[id]/reject` | POST | session-cookie | `app/api/crm/quotes-v2/[id]/reject/route.ts` |
| `/api/crm/quotes-v2/[id]/request-approval` | POST | session-cookie | `app/api/crm/quotes-v2/[id]/request-approval/route.ts` |
| `/api/crm/quotes-v2/[id]/send` | POST | session-cookie | `app/api/crm/quotes-v2/[id]/send/route.ts` |
| `/api/crm/quotes-v2/items` | GET | session-cookie | `app/api/crm/quotes-v2/items/route.ts` |
| `/api/crm/quotes/[id]/generate-pdf` | POST | session-cookie | `app/api/crm/quotes/[id]/generate-pdf/route.ts` |
| `/api/crm/requests` | GET, POST, PATCH | session-cookie | `app/api/crm/requests/route.ts` |
| `/api/crm/search-client` | GET | session-cookie | `app/api/crm/search-client/route.ts` |
| `/api/crm/tasks` | GET, POST, PATCH | session-cookie | `app/api/crm/tasks/route.ts` |
| `/api/diagnostics/imaging/reports` | POST | session-cookie | `app/api/diagnostics/imaging/reports/route.ts` |
| `/api/diagnostics/imaging/reports/[id]/release` | POST | session-cookie | `app/api/diagnostics/imaging/reports/[id]/release/route.ts` |
| `/api/diagnostics/imaging/reports/[id]/sign` | POST | session-cookie | `app/api/diagnostics/imaging/reports/[id]/sign/route.ts` |
| `/api/diagnostics/imaging/studies` | POST | session-cookie | `app/api/diagnostics/imaging/studies/route.ts` |
| `/api/diagnostics/intake/create-order` | POST | session-cookie | `app/api/diagnostics/intake/create-order/route.ts` |
| `/api/diagnostics/intake/create-patient` | POST | session-cookie | `app/api/diagnostics/intake/create-patient/route.ts` |
| `/api/diagnostics/intake/search-patient` | GET | session-cookie | `app/api/diagnostics/intake/search-patient/route.ts` |
| `/api/diagnostics/lab/results` | POST | session-cookie | `app/api/diagnostics/lab/results/route.ts` |
| `/api/diagnostics/lab/results/[id]/release` | POST | session-cookie | `app/api/diagnostics/lab/results/[id]/release/route.ts` |
| `/api/diagnostics/lab/results/[id]/validate` | POST | session-cookie | `app/api/diagnostics/lab/results/[id]/validate/route.ts` |
| `/api/diagnostics/lab/specimens` | POST | session-cookie | `app/api/diagnostics/lab/specimens/route.ts` |
| `/api/diagnostics/orders` | GET, POST | session-cookie | `app/api/diagnostics/orders/route.ts` |
| `/api/diagnostics/orders/[id]/admin-status` | POST | session-cookie | `app/api/diagnostics/orders/[id]/admin-status/route.ts` |
| `/api/diagnostics/orders/[id]/pay` | POST | session-cookie | `app/api/diagnostics/orders/[id]/pay/route.ts` |
| `/api/diagnostics/orders/[id]/send-to-execution` | POST | session-cookie | `app/api/diagnostics/orders/[id]/send-to-execution/route.ts` |
| `/api/files/[id]` | GET | session-cookie | `app/api/files/[id]/route.ts` |
| `/api/finanzas/categories` | GET, POST, PATCH | header-or-token | `app/api/finanzas/categories/route.ts` |
| `/api/finanzas/financial-accounts` | GET, POST, PATCH | header-or-token | `app/api/finanzas/financial-accounts/route.ts` |
| `/api/finanzas/journal-entries/[id]` | GET, PATCH | header-or-token | `app/api/finanzas/journal-entries/[id]/route.ts` |
| `/api/finanzas/journal-entries/[id]/post` | POST | public-or-unknown | `app/api/finanzas/journal-entries/[id]/post/route.ts` |
| `/api/finanzas/journal-entries/[id]/reverse` | POST | public-or-unknown | `app/api/finanzas/journal-entries/[id]/reverse/route.ts` |
| `/api/finanzas/parties` | GET, POST, PATCH | header-or-token | `app/api/finanzas/parties/route.ts` |
| `/api/finanzas/payables` | GET, POST, PATCH | header-or-token | `app/api/finanzas/payables/route.ts` |
| `/api/finanzas/subcategories` | GET, POST, PATCH | header-or-token | `app/api/finanzas/subcategories/route.ts` |
| `/api/finanzas/transactions` | GET, POST | header-or-token | `app/api/finanzas/transactions/route.ts` |
| `/api/health` | GET | public-or-unknown | `app/api/health/route.ts` |
| `/api/hr/attendance/day` | GET | session-cookie | `app/api/hr/attendance/day/route.ts` |
| `/api/hr/attendance/employee/[id]` | GET | session-cookie | `app/api/hr/attendance/employee/[id]/route.ts` |
| `/api/hr/attendance/event` | POST | session-cookie | `app/api/hr/attendance/event/route.ts` |
| `/api/hr/attendance/event/[id]` | PATCH, DELETE | session-cookie | `app/api/hr/attendance/event/[id]/route.ts` |
| `/api/hr/attendance/incidents` | GET | session-cookie | `app/api/hr/attendance/incidents/route.ts` |
| `/api/hr/attendance/logs` | GET, POST | session-cookie | `app/api/hr/attendance/logs/route.ts` |
| `/api/hr/attendance/process-day` | POST | session-cookie | `app/api/hr/attendance/process-day/route.ts` |
| `/api/hr/attendance/processed` | GET | session-cookie | `app/api/hr/attendance/processed/route.ts` |
| `/api/hr/attendance/shifts/[id]` | PATCH | session-cookie | `app/api/hr/attendance/shifts/[id]/route.ts` |
| `/api/hr/attendance/today` | GET | session-cookie | `app/api/hr/attendance/today/route.ts` |
| `/api/hr/departments` | GET, POST, PATCH | session-cookie | `app/api/hr/departments/route.ts` |
| `/api/hr/employees/[id]/documents/[docId]` | DELETE | session-cookie | `app/api/hr/employees/[id]/documents/[docId]/route.ts` |
| `/api/hr/employees/[id]/step-1` | PATCH | session-cookie | `app/api/hr/employees/[id]/step-1/route.ts` |
| `/api/hr/employees/[id]/step-2` | PATCH | session-cookie | `app/api/hr/employees/[id]/step-2/route.ts` |
| `/api/hr/employees/[id]/step-3` | PATCH | session-cookie | `app/api/hr/employees/[id]/step-3/route.ts` |
| `/api/hr/payroll/[id]/approve` | POST | session-cookie | `app/api/hr/payroll/[id]/approve/route.ts` |
| `/api/hr/payroll/[id]/employees/[employeeId]/email` | POST | session-cookie | `app/api/hr/payroll/[id]/employees/[employeeId]/email/route.ts` |
| `/api/hr/payroll/[id]/employees/[employeeId]/export.csv` | GET | session-cookie | `app/api/hr/payroll/[id]/employees/[employeeId]/export.csv/route.ts` |
| `/api/hr/payroll/[id]/employees/[employeeId]/payslip.pdf` | GET | session-cookie | `app/api/hr/payroll/[id]/employees/[employeeId]/payslip.pdf/route.ts` |
| `/api/hr/payroll/[id]/export` | GET | session-cookie | `app/api/hr/payroll/[id]/export/route.ts` |
| `/api/hr/payroll/[id]/export.csv` | GET | session-cookie | `app/api/hr/payroll/[id]/export.csv/route.ts` |
| `/api/hr/payroll/[id]/line/[lineId]` | PATCH | session-cookie | `app/api/hr/payroll/[id]/line/[lineId]/route.ts` |
| `/api/hr/payroll/[id]/publish` | POST | session-cookie | `app/api/hr/payroll/[id]/publish/route.ts` |
| `/api/hr/payroll/[id]/recalculate` | POST | session-cookie | `app/api/hr/payroll/[id]/recalculate/route.ts` |
| `/api/hr/positions` | GET, POST, PATCH | session-cookie | `app/api/hr/positions/route.ts` |
| `/api/integrations/hl7/oru` | POST | session-cookie | `app/api/integrations/hl7/oru/route.ts` |
| `/api/inventario/auditoria/export/xlsx` | GET | header-or-token | `app/api/inventario/auditoria/export/xlsx/route.ts` |
| `/api/inventario/movimientos/export` | GET | header-or-token | `app/api/inventario/movimientos/export/route.ts` |
| `/api/inventario/prices/matrix/export/xlsx` | GET | header-or-token | `app/api/inventario/prices/matrix/export/xlsx/route.ts` |
| `/api/inventario/qa/export/xlsx` | GET | header-or-token | `app/api/inventario/qa/export/xlsx/route.ts` |
| `/api/inventario/reset` | POST | header-or-token | `app/api/inventario/reset/route.ts` |
| `/api/labtest/access` | GET, POST | session-cookie | `app/api/labtest/access/route.ts` |
| `/api/labtest/auth/send-otp` | POST | session-cookie | `app/api/labtest/auth/send-otp/route.ts` |
| `/api/labtest/auth/verify-otp` | POST | session-cookie | `app/api/labtest/auth/verify-otp/route.ts` |
| `/api/labtest/catalog/categories` | GET, POST | session-cookie | `app/api/labtest/catalog/categories/route.ts` |
| `/api/labtest/catalog/subcategories` | GET, POST | session-cookie | `app/api/labtest/catalog/subcategories/route.ts` |
| `/api/labtest/catalog/tests` | GET, POST | session-cookie | `app/api/labtest/catalog/tests/route.ts` |
| `/api/labtest/contact` | POST | session-cookie | `app/api/labtest/contact/route.ts` |
| `/api/labtest/instruments` | GET, POST | session-cookie | `app/api/labtest/instruments/route.ts` |
| `/api/labtest/items/status` | POST | session-cookie | `app/api/labtest/items/status/route.ts` |
| `/api/labtest/logs/results` | GET | session-cookie | `app/api/labtest/logs/results/route.ts` |
| `/api/labtest/logs/specimens` | GET | session-cookie | `app/api/labtest/logs/specimens/route.ts` |
| `/api/labtest/orders` | POST | session-cookie | `app/api/labtest/orders/route.ts` |
| `/api/labtest/orders/[id]/document-preview` | GET | session-cookie | `app/api/labtest/orders/[id]/document-preview/route.ts` |
| `/api/labtest/release` | POST | session-cookie | `app/api/labtest/release/route.ts` |
| `/api/labtest/reports/summary` | GET | session-cookie | `app/api/labtest/reports/summary/route.ts` |
| `/api/labtest/requirements` | GET | session-cookie | `app/api/labtest/requirements/route.ts` |
| `/api/labtest/results` | GET, POST | session-cookie | `app/api/labtest/results/route.ts` |
| `/api/labtest/samples` | POST | session-cookie | `app/api/labtest/samples/route.ts` |
| `/api/labtest/send` | POST | session-cookie | `app/api/labtest/send/route.ts` |
| `/api/labtest/settings` | GET, POST | session-cookie | `app/api/labtest/settings/route.ts` |
| `/api/labtest/templates` | GET, POST | session-cookie | `app/api/labtest/templates/route.ts` |
| `/api/labtest/templates/v2` | GET, POST | session-cookie | `app/api/labtest/templates/v2/route.ts` |
| `/api/labtest/validate` | POST | session-cookie | `app/api/labtest/validate/route.ts` |
| `/api/labtest/workbench/[area]` | GET | session-cookie | `app/api/labtest/workbench/[area]/route.ts` |
| `/api/marcaje/status` | GET | session-cookie | `app/api/marcaje/status/route.ts` |
| `/api/medical/encounters/[encounterId]/pdf` | GET | session-cookie | `app/api/medical/encounters/[encounterId]/pdf/route.ts` |
| `/api/medical/encounters/[encounterId]/pdf-binary` | GET | session-cookie | `app/api/medical/encounters/[encounterId]/pdf-binary/route.ts` |
| `/api/medical/encounters/[encounterId]/snapshot` | GET, POST | session-cookie | `app/api/medical/encounters/[encounterId]/snapshot/route.ts` |
| `/api/memberships/clients` | GET | session-cookie | `app/api/memberships/clients/route.ts` |
| `/api/memberships/config` | GET, POST | session-cookie | `app/api/memberships/config/route.ts` |
| `/api/memberships/contracts` | GET, POST | session-cookie | `app/api/memberships/contracts/route.ts` |
| `/api/memberships/contracts/[id]` | GET | session-cookie | `app/api/memberships/contracts/[id]/route.ts` |
| `/api/memberships/contracts/[id]/payment` | POST | session-cookie | `app/api/memberships/contracts/[id]/payment/route.ts` |
| `/api/memberships/contracts/[id]/status` | POST | session-cookie | `app/api/memberships/contracts/[id]/status/route.ts` |
| `/api/memberships/dashboard` | GET | session-cookie | `app/api/memberships/dashboard/route.ts` |
| `/api/memberships/plans` | GET | session-cookie | `app/api/memberships/plans/route.ts` |
| `/api/memberships/plans/[id]/status` | POST | session-cookie | `app/api/memberships/plans/[id]/status/route.ts` |
| `/api/membresias/clientes` | GET | session-cookie | `app/api/membresias/clientes/route.ts` |
| `/api/membresias/config` | GET, POST | session-cookie | `app/api/membresias/config/route.ts` |
| `/api/membresias/contratos` | GET, POST | session-cookie | `app/api/membresias/contratos/route.ts` |
| `/api/membresias/contratos/[id]` | GET | session-cookie | `app/api/membresias/contratos/[id]/route.ts` |
| `/api/membresias/contratos/[id]/estado` | POST | public-or-unknown | `app/api/membresias/contratos/[id]/estado/route.ts` |
| `/api/membresias/contratos/[id]/pago` | POST | session-cookie | `app/api/membresias/contratos/[id]/pago/route.ts` |
| `/api/membresias/dashboard` | GET | session-cookie | `app/api/membresias/dashboard/route.ts` |
| `/api/membresias/planes` | GET | session-cookie | `app/api/membresias/planes/route.ts` |
| `/api/membresias/planes/[id]/estado` | POST | public-or-unknown | `app/api/membresias/planes/[id]/estado/route.ts` |
| `/api/reception/service-requests` | GET, POST | session-cookie | `app/api/reception/service-requests/route.ts` |
| `/api/reception/service-requests/[id]` | GET, PATCH | session-cookie | `app/api/reception/service-requests/[id]/route.ts` |
| `/api/terminology/icd10/search` | GET | session-cookie | `app/api/terminology/icd10/search/route.ts` |
| `/api/text-docs` | GET, POST | session-cookie | `app/api/text-docs/route.ts` |
| `/api/text-docs/[id]` | GET, PUT | session-cookie | `app/api/text-docs/[id]/route.ts` |
| `/api/upload/logo` | GET, POST | public-or-unknown | `app/api/upload/logo/route.ts` |
| `/api/users/[id]/hr-link` | GET | session-cookie | `app/api/users/[id]/hr-link/route.ts` |
| `/api/users/[id]/link-hr` | POST | session-cookie | `app/api/users/[id]/link-hr/route.ts` |
| `/api/users/[id]/unlink-hr` | POST | session-cookie | `app/api/users/[id]/unlink-hr/route.ts` |
| `/api/whatsapp/send` | POST | public-or-unknown | `app/api/whatsapp/send/route.ts` |
| `/api/whatsapp/threads` | GET | public-or-unknown | `app/api/whatsapp/threads/route.ts` |

---

## D) BASE DE DATOS (Prisma/SQL)

### D.1 Tipo de DB y configuración
- Motor configurado: **PostgreSQL**.
- Configuración principal por `DATABASE_URL`.
- Soporte local Docker + variantes Supabase (`.env.supabase.example`).

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Archivo: `.env.example`
Evidencia:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/starmedical?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/starmedical?schema=public"
SHADOW_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/starmedical_shadow?schema=public"
```

Archivo: `docker-compose.yml`
Evidencia:
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: starmedical
```

### D.2 Modelos/relaciones clave (schema.prisma)

Core auth/RBAC:
- `User`, `Role`, `UserRole`, `UserPermission`.

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model User {
  id           String @id @default(cuid())
  email        String @unique
  branchId     String?
  roles        UserRole[]
  userPermissions UserPermission[]
}
```

Clientes/CRM/Empresas:
- `ClientProfile`, `ClientAffiliation`, `CrmLead`, `CrmDeal`, `Company`, `CompanyContact`, `CompanyLocation`, `CompanyDocument`.

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model ClientProfile {
  id        String @id @default(cuid())
  type      ClientProfileType
  deletedAt DateTime?
  leads     CrmLead[]
  companyRecord Company?
}
```

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model Company {
  id              String @id @default(cuid())
  clientProfileId String @unique
  kind            CompanyKind
  status          CompanyStatus @default(ACTIVE)
  deletedAt       DateTime?
}
```

Membresías:
- `MembershipPlan`, `MembershipContract`, `MembershipPayment`, `MembershipUsage`.

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model MembershipContract {
  id            String @id
  ownerType     MembershipOwnerType
  ownerId       String
  planId        String
  status        MembershipStatus @default(ACTIVE)
}
```

Agenda/Recepción:
- `Appointment`, `Visit`, `Queue`, `QueueItem`, `ServiceRequest`, `TicketSequence`, vitals reception.

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model Visit {
  siteId          String
  appointmentId   String?
  status          VisitStatus @default(ARRIVED)
  queueItems      QueueItem[]
  serviceRequests ServiceRequest[]
}
```

Diagnóstico/Lab:
- `DiagnosticOrder`, `DiagnosticOrderItem`, `LabTestOrder`, `LabTestItem`.

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model DiagnosticOrder {
  patientId   String
  status      DiagnosticOrderStatus @default(DRAFT)
  adminStatus DiagnosticOrderAdminStatus @default(DRAFT)
  items       DiagnosticOrderItem[]
}
```

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model LabTestOrder {
  code      String @unique
  status    LabTestStatus @default(REQUESTED)
  branchId  String?
  items     LabTestItem[]
}
```

Finanzas/Facturación:
- `JournalEntry`, `FinancialTransaction`, `Receivable`, `Payable`, `Payment`.

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model JournalEntry {
  date       DateTime
  status     JournalEntryStatus @default(DRAFT)
  lines      JournalEntryLine[]
  legalEntityId String?
}
```

Marcaje/Asistencia:
- `AttendanceDay`, `AttendanceRawEvent`, `AttendancePunchToken`.

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model AttendanceRawEvent {
  employeeId      String?
  occurredAt      DateTime
  type            AttendanceRawEventType
  biometricDeviceId String?
}
```

Médico (encounter):
- `Encounter`, `EncounterSupply`, `EncounterOrderRequest`, `EncounterResult`.

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model Encounter {
  id          String @id
  patientId   String
  status      String @default("draft")
  supplies    EncounterSupply[]
  orderRequests EncounterOrderRequest[]
}
```

### D.3 Migraciones y drift (riesgo)

- Directorio principal: `prisma/migrations` (24 migraciones).
- Existe archivo legacy paralelo: `prisma/migrations__legacy/*`.
- En esta máquina local, `prisma migrate status` reporta migraciones pendientes de aplicar (riesgo de drift entre código y DB ejecutada).

Archivo: `prisma`
Evidencia:
```text
migrations
migrations__legacy
schema.prisma
seed.ts
```

Archivo: `RUNBOOK_DEV_SETUP.md`
Evidencia:
```md
- Migrations legacy archivadas por drift en `prisma/migrations__legacy/`;
  la nueva baseline es `prisma/migrations/20260126230520_baseline`
```

### D.4 Seeds

- `prisma/seed.ts`: roles/permisos, catálogos, datos base de varios módulos.
- `prisma/seed.core.ts`: colas de recepción por sede + área.
- `prisma/seed.geo.ts`: catálogo geográfico desde JSON.

Archivo: `prisma/seed.ts`
Evidencia:
```ts
import { ALL_PERMISSION_KEYS, ROLE_PERMISSION_MAP } from "../lib/security/permissionCatalog";
import { seedGeoCatalogs } from "./seed.geo";
...
await seedGeoCatalogs(prisma);
```

Archivo: `prisma/seed.core.ts`
Evidencia:
```ts
const areas = Object.values(OperationalArea);
const data = branches.flatMap((branch) =>
  areas.map((area) => ({ siteId: branch.id, area, status: QueueStatus.ACTIVE }))
);
```

Archivo: `prisma/seed.geo.ts`
Evidencia:
```ts
const countries = loadJson<CountrySeed[]>("prisma/seeds/geo-countries.json");
const guatemala = loadJson<GuatemalaSeed>("prisma/seeds/geo-guatemala.json");
```

### D.5 Diagrama textual (Módulo → Tablas → Relaciones)

- Clientes → `ClientProfile`, `ClientAffiliation`, `ClientDocument`, `ClientCatalogItem` → relaciones `ClientProfile`↔`ClientAffiliation`, `ClientProfile`↔`ClientDocument`.
- CRM → `CrmLead`, `CrmDeal`, `CrmQuote*`, `CrmPipeline*` → `CrmLead.clientId -> ClientProfile`, `CrmDeal.ownerUserId -> User`.
- Empresas → `Company`, `CompanyContact`, `CompanyLocation`, `CompanyDocument` → `Company.clientProfileId -> ClientProfile`.
- Membresías → `MembershipPlan`, `MembershipContract`, `MembershipPayment`, `MembershipUsage` → `MembershipContract.planId -> MembershipPlan`, `MembershipPayment.contractId -> MembershipContract`.
- Agenda → `Appointment` → relaciona con `AppointmentType`, `Room`; puente con recepción vía `Visit.appointmentId`.
- Recepción → `Visit`, `Queue`, `QueueItem`, `ServiceRequest`, `VisitEvent`, `TicketSequence` → `Visit.siteId -> Branch`, `QueueItem.visitId -> Visit`.
- RRHH/Marcaje → `HrEmployee*`, `AttendanceDay`, `AttendanceRawEvent`, `AttendancePunchToken` → `Attendance*` ligados a empleados/usuarios.
- Diagnóstico → `DiagnosticOrder`, `DiagnosticOrderItem`, `DiagnosticCatalogItem`, `LabResult`, `ImagingStudy` → `DiagnosticOrder.patientId -> ClientProfile`.
- LabTest → `LabTestOrder`, `LabTestItem`, `LabSample`, `LabTestResult`.
- Finanzas/Facturación → `JournalEntry`, `FinancialTransaction`, `Receivable`, `Payable`, `Payment`.
- Médico → `Encounter`, `EncounterSupply`, `EncounterOrderRequest`, `EncounterResult`.

### D.6 Inconsistencias detectadas

1) IDs sin default en varias tablas nuevas (riesgo de integridad si caller falla):
- `MembershipContract.id`, `MembershipPlan.id`, `Encounter.id`, etc. usan `String @id` sin `@default(...)`.

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model MembershipPlan {
  id   String @id
  slug String @unique
```

2) `branchId` sin relación explícita en algunos modelos core:
- `User.branchId` y `Appointment.branchId` son `String` sin `@relation` directo.

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model User {
  branchId String?
}

model Appointment {
  branchId String
}
```

3) Soft delete desigual:
- Sí en clientes/companies (`deletedAt`), no consistente en otros dominios.

Archivo: `prisma/schema.prisma`
Evidencia:
```prisma
model ClientProfile {
  deletedAt DateTime?
}

model MembershipContract {
  status MembershipStatus @default(ACTIVE)
}
```

4) Riesgo operativo de drift:
- coexistencia de `migrations` + `migrations__legacy` y pendientes locales.

---

## E) SEGURIDAD Y ACCESO

### E.1 Cómo funciona auth

- Login: verifica password hash y emite JWT en cookie HttpOnly.
- Request auth: `requireAuth(req)` en handlers.
- Route guarding global: `proxy.ts` redirige a `/login` para rutas protegidas.

Archivo: `app/api/login/route.ts`
Evidencia:
```ts
const ok = await validatePassword(password, user.passwordHash);
...
return createLoginResponse(sessionUser);
```

Archivo: `lib/auth.ts`
Evidencia:
```ts
response.cookies.set({
  name: AUTH_COOKIE_NAME,
  value: token,
  httpOnly: true,
  sameSite: "lax",
```

Archivo: `proxy.ts`
Evidencia:
```ts
if ((isAdminRoute || isHrRoute || isDiagnosticsRoute || isLabTestRoute) && !authenticated) {
  return NextResponse.redirect(new URL("/login", request.url));
}
```

### E.2 RBAC (roles/permisos/guards)

- Catálogo central `permissionCatalog`.
- Cálculo efectivo por rol + grants/denies usuario.
- Guards por permiso en endpoints (`requirePermission`, `requireHrPermission`, `requireDiagnosticsPermission`, etc.).

Archivo: `lib/rbac.ts`
Evidencia:
```ts
export function requirePermission(user: SessionUser | null, permission: string | string[]) {
  const ok = list.every((perm) => hasPermission(user, perm));
  if (!ok) return { errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
}
```

Archivo: `lib/security/permissionService.ts`
Evidencia:
```ts
for (const userPermission of user.userPermissions || []) {
  if (userPermission.effect === UserPermissionEffect.DENY) userDenies.push(normalizedKey);
}
```

### E.3 Puntos de riesgo detectados

1) Secret de auth por defecto en código.

Archivo: `lib/auth.ts`
Evidencia:
```ts
const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";
```

2) Endpoints con auth pública o no explícita (alto impacto):
- `/api/upload/image`, `/api/upload/logo`, `/api/whatsapp/send`, `/api/whatsapp/threads`, `/api/clientes/importar`, `/api/public/turnos` (público intencional con rate limit).

Archivo: `app/api/upload/image/route.ts`
Evidencia:
```ts
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
```

Archivo: `app/api/whatsapp/send/route.ts`
Evidencia:
```ts
export async function POST(req: NextRequest) {
  const payload = await req.json();
  await sendMessage(payload);
}
```

3) Fallback inseguro por header de rol en config/finanzas/inventario.

Archivo: `lib/api/admin.ts`
Evidencia:
```ts
const role = roleFromRequest(req);
if (role === "Administrador") {
  return { role, errorResponse: null };
}
```

Archivo: `lib/api/auth.ts`
Evidencia:
```ts
return req.headers.get("x-role") || req.headers.get("x-user-role") || req.nextUrl.searchParams.get("role");
```

4) Logs potencialmente con PII y volumen alto (319 `console.*` en app/lib/src/service).

Archivo: `app/api/login/route.ts`
Evidencia:
```ts
await auditLog({
  action: "LOGIN_FAILED",
  metadata: { email },
```

### E.4 Recomendaciones de parche (sin implementar en esta auditoría)

1) Bloquear fallback `x-role` en producción y exigir sesión+permiso en config/finanzas/inventario.
2) Exigir auth/permisos en upload y WhatsApp (o mover explícitamente a endpoints públicos con token firmado/rate limit estricto).
3) Eliminar `dev-star-secret` por defecto; fallar startup si falta `AUTH_SECRET` fuera de desarrollo.
4) Añadir validación uniforme Zod en handlers que hoy parsean `req.json()` sin schema.
5) Implementar masking/estrategia de logs para PII (emails, DPI, teléfonos).
6) Añadir pruebas de autorización negativas por endpoint crítico (403 esperados).

---

## F) OBSERVABILIDAD / DEBUGGING

### F.1 Logging y health checks

- Logging: predominio de `console.*`, sin logger centralizado único.
- Health checks:
  - `GET /api/health`
  - `GET /api/admin/health/db` (admin only)
  - UI de health DB: `/admin/health/db`

Archivo: `app/api/health/route.ts`
Evidencia:
```ts
await prisma.$queryRaw`SELECT 1`;
...
return NextResponse.json({ ok: status !== "down", status, checks: { db, emailConfig, exports: exportsCheck } });
```

Archivo: `app/api/admin/health/db/route.ts`
Evidencia:
```ts
const { user, errorResponse } = requireAuth(req);
if (!isAdmin(user)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
```

Archivo: `lib/server/dbHealth.service.ts`
Evidencia:
```ts
const CRITICAL_TABLES = [
  "Branch", "User", "ClientProfile", "Visit", "Queue", "QueueItem", "ServiceRequest", "_prisma_migrations"
];
```

### F.2 Cómo reproducir local (comandos exactos)

1. `npm install`
2. `npm run db:up`
3. `npm run dev:setup`
4. `npm run dev`
5. (opcional) `npm run qa`

Archivo: `README.md`
Evidencia:
```md
1) `npm install`
2) Configura `.env` con `DATABASE_URL`
3) `npm run dev:setup`
4) `npm run dev`
```

Archivo: `RUNBOOK_DEV_SETUP.md`
Evidencia:
```md
1. Instalar dependencias: `npm install`
2. Preparar DB y datos mínimos: `npm run dev:setup`
3. Levantar la app: `npm run dev`
```

### F.3 Checklist de diagnóstico rápido

Si Prisma falla:
1. Validar envs: `DATABASE_URL`, `DIRECT_URL`, `SHADOW_DATABASE_URL`.
2. Ver estado migraciones: `npm run db:migrate:status`.
3. Aplicar pendientes: `npm run db:migrate:deploy`.
4. Regenerar cliente: `npm run db:generate`.
5. Sembrar base: `npm run db:seed`.
6. Revisar health: `/api/admin/health/db`.

Si faltan tablas:
- El código ya emite warning dev y sugiere migrar.

Archivo: `lib/prisma/errors.ts`
Evidencia:
```ts
console.warn(
  `[DEV][db] ${context}: missing table (P2021). Run \`npm run db:migrate:deploy\`.`
);
```

Si falta env:

Archivo: `package.json`
Evidencia:
```json
"db:migrate:diff": "... test -n \"$SHADOW_DATABASE_URL\" || (echo \"SHADOW_DATABASE_URL is required\" && exit 1); ..."
```

---

## G) PLAN DE PULIDO POR PRIORIDAD (de arriba hacia abajo)

### 1) Clientes (P0)
- Objetivo: consolidar account master sin deuda de performance ni deuda de action monolítica.
- Trabajo concreto:
  - Particionar `app/admin/clientes/actions.ts` por dominio (persona/empresa/docs/catalogos).
  - Asegurar validaciones homogéneas Zod en entradas de actions.
  - Añadir tests de regresión de alta/archivo/reactivación.
- Archivos a tocar:
  - `app/admin/clientes/actions.ts`
  - `lib/clients/list.service.ts`
  - `lib/clients/dashboard.service.ts`
- Riesgo: alto (impacta altas y edición de datos maestros).
- Criterio de aceptación (manual): crear/editar/archivar cliente por cada tipo, sin errores y con KPI actualizado.
- Estimación: `L`.

### 2) CRM (P0/P1)
- Objetivo: cerrar brecha navegación/flujo y reducir complejidad operativa de bandeja.
- Trabajo concreto:
  - Habilitar o retirar tabs TODO (dashboard/reportes) con decisión explícita.
  - Normalizar contratos API para leads/deals/quotes con schemas Zod compartidos.
  - Revisar ownership/scope de deals (owner/branch).
- Archivos a tocar:
  - `app/admin/crm/CrmLayoutClient.tsx`
  - `app/api/crm/*`
  - `lib/rbac.ts`
- Riesgo: medio-alto (pipeline comercial y cotizaciones).
- Criterio de aceptación (manual): recorrer lead→deal→quote→aprobación con rol ventas/supervisor/admin.
- Estimación: `L`.

### 3) Membresías (P1)
- Objetivo: eliminar duplicidad de API y robustecer ciclo contrato/pago.
- Trabajo concreto:
  - Consolidar `/api/membresias/*` hacia `/api/memberships/*` con compatibilidad temporal.
  - Completar tabs pendientes (renovaciones/cobranza) o remover hasta implementación.
  - Añadir defaults de ID/estrategia de generación consistente.
- Archivos a tocar:
  - `app/api/membresias/*`
  - `app/api/memberships/*`
  - `app/admin/membresias/layout.tsx`
  - `prisma/schema.prisma`
- Riesgo: medio.
- Criterio de aceptación (manual): crear plan, crear contrato, cobrar pago, cambiar estado sin ruta duplicada rota.
- Estimación: `M`.

### 4) Agenda (P1)
- Objetivo: suprimir mezcla mock/real y estabilizar permisos por sede/rol.
- Trabajo concreto:
  - Quitar fallback a mocks en `app/admin/agenda/page.tsx` (mostrar error controlado).
  - Probar SSE + filtros por `branchId` con usuarios no admin.
  - Completar tabs TODO (dashboard/recursos).
- Archivos a tocar:
  - `app/admin/agenda/page.tsx`
  - `app/api/agenda/route.ts`
  - `app/admin/agenda/layout.tsx`
- Riesgo: medio.
- Criterio de aceptación (manual): crear/editar/mover cita desde dos roles y validar visibilidad por sede.
- Estimación: `M`.

### 5) Usuarios (P1)
- Objetivo: cerrar gestión de usuarios/roles/sedes de forma consistente.
- Trabajo concreto:
  - Implementar módulo de sucursales o quitar tab.
  - Añadir flujos de asignación masiva de roles/permisos con validación.
  - Mejorar UX de errores de vinculación HR.
- Archivos a tocar:
  - `app/admin/usuarios/layout.tsx`
  - `app/api/users/route.ts`
  - `src/lib/users/service.ts`
- Riesgo: medio.
- Criterio de aceptación (manual): alta usuario + rol + vínculo HR + desactivación/reactivación.
- Estimación: `M`.

### 6) Recepción (P1)
- Objetivo: reducir tamaño de server actions y endurecer contratos operativos.
- Trabajo concreto:
  - Segmentar `app/admin/reception/actions.ts` por subdominio (admisión/cola/SLA/settings).
  - Añadir tests de transición de `VisitStatus` y bloqueo por service requests abiertas.
  - Exponer APIs de lectura controlada para debugging de operaciones.
- Archivos a tocar:
  - `app/admin/reception/actions.ts`
  - `lib/reception/*`
  - `app/api/reception/service-requests/*`
- Riesgo: alto operativo.
- Criterio de aceptación (manual): admisión completa + cola + checkout con reglas de bloqueo y auditoría.
- Estimación: `L`.

### 7) RRHH (P1)
- Objetivo: reducir fricción en empleados/nómina y corregir mismatch de endpoints disciplinarios.
- Trabajo concreto:
  - Corregir rutas faltantes `submit/approve/reject` o adaptar UI a contrato real.
  - Dividir `app/hr/employees/page.tsx` en componentes por dominio.
  - Añadir pruebas end-to-end de payroll draft→approve→publish.
- Archivos a tocar:
  - `app/hr/employees/page.tsx`
  - `app/api/hr/employees/[id]/disciplinary-actions/route.ts`
  - `app/hr/payroll/page.tsx`
- Riesgo: alto (regresión funcional RH).
- Criterio de aceptación (manual): sanción disciplinaria end-to-end + corrida nómina sin errores.
- Estimación: `L`.

### 8) Inventario (P1)
- Objetivo: unificar auth y quitar dependencia mock silenciosa en endpoints críticos.
- Trabajo concreto:
  - Sustituir `x-role` por sesión+permisos o token firmados estrictos.
  - Evitar fallback mock en APIs operativas (`productos`, etc.).
  - Completar tab reportes.
- Archivos a tocar:
  - `lib/api/auth.ts`
  - `app/api/inventario/*`
  - `app/admin/inventario/layout.tsx`
- Riesgo: medio-alto.
- Criterio de aceptación (manual): CRUD productos/órdenes/movimientos con auth consistente.
- Estimación: `M`.

### 9) Finanzas (P1/P2)
- Objetivo: hardening de auth y simplificación de UI monolítica.
- Trabajo concreto:
  - Eliminar fallback `x-role` en producción.
  - Fragmentar `app/admin/finanzas/page.tsx` por tab/submódulo.
  - Añadir validaciones Zod uniformes en endpoints.
- Archivos a tocar:
  - `app/admin/finanzas/page.tsx`
  - `lib/api/finance.ts`
  - `app/api/finanzas/*`
- Riesgo: alto.
- Criterio de aceptación (manual): crear/postear/reversar asiento + flujo AR/AP con permisos correctos.
- Estimación: `L`.

### 10) Facturación (P2)
- Objetivo: llevar servicio de dashboard a datos reales (retirar mock progresivo).
- Trabajo concreto:
  - Migrar `lib/billing/service.ts` a repositorio Prisma para consultas principales.
  - Mantener quick actions API alineadas con nuevo source-of-truth.
- Archivos a tocar:
  - `lib/billing/service.ts`
  - `app/admin/facturacion/page.tsx`
  - `app/api/facturacion/expedientes/[id]/quick-action/route.ts`
- Riesgo: medio.
- Criterio de aceptación (manual): dashboard coincide con expedientes reales y acciones impactan saldos.
- Estimación: `M`.

### 11) Configuración + Seguridad transversal (P0 transversal)
- Objetivo: cerrar vectores de acceso por header y endpoints públicos sensibles.
- Trabajo concreto:
  - Bloquear `x-role` fallback fuera de dev.
  - Proteger upload/WhatsApp o formalizarlos como públicos con tokens rotativos y rate-limit.
  - Forzar `AUTH_SECRET` real.
- Archivos a tocar:
  - `lib/api/admin.ts`
  - `lib/api/finance.ts`
  - `app/api/upload/image/route.ts`
  - `app/api/whatsapp/*`
  - `lib/auth.ts`
- Riesgo: muy alto (seguridad).
- Criterio de aceptación (manual): acceso no autenticado devuelve 401/403 en endpoints sensibles.
- Estimación: `M`.

---

## H) QUICK WIN: SIDEBAR COLLAPSE/EXPAND MANUAL (sin romper navegación)

Estado: **implementado** en alcance mínimo y aislable como PR separado.

### H.1 Diseño técnico

- Fuente de estado: `components/layout/AdminShellClient.tsx`.
- Persistencia: `localStorage` key `star-erp-sidebar-collapsed`.
- Componente que manda:
  - `AdminShellClient` controla estado.
  - `Sidebar` renderiza colapsado/expandido en desktop.
  - `Header` expone toggles y drawer móvil.
- Responsive:
  - `Sidebar` solo `lg:flex`.
  - En mobile, menú lateral tipo drawer desde `Header`.
- Accesibilidad:
  - `aria-label`, `aria-pressed`, teclado Enter/Espacio en toggles.
  - drawer con `role="dialog"`, `aria-modal="true"`, cierre con `Esc`.

Archivo: `components/layout/AdminShellClient.tsx`
Evidencia:
```tsx
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const stored = window.localStorage.getItem("star-erp-sidebar-collapsed");
window.localStorage.setItem("star-erp-sidebar-collapsed", sidebarCollapsed ? "1" : "0");
```

Archivo: `components/layout/Sidebar.tsx`
Evidencia:
```tsx
<aside className={cn(..., collapsed ? "w-20 px-2" : "w-64 px-4")}>...
<button
  aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
  aria-pressed={collapsed}
```

Archivo: `components/layout/Header.tsx`
Evidencia:
```tsx
{mobileOpen && (
  <div className="fixed inset-0 ..." onClick={() => setMobileOpen(false)}>
    <div role="dialog" aria-modal="true" aria-label="Menú lateral" ...>
```

### H.2 Cambios exactos por archivo (diff)

1) `components/layout/AdminShellClient.tsx` (nuevo)
```diff
+const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
+const stored = window.localStorage.getItem("star-erp-sidebar-collapsed");
+<Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((c) => !c)} ... />
+<Header sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed((c) => !c)} ... />
```

2) `components/layout/Sidebar.tsx`
```diff
-export default function Sidebar() {
+export default function Sidebar({ collapsed = false, onToggleCollapsed, ... }) {
+<button aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"} aria-pressed={collapsed} ...>
+{collapsed ? <ChevronRightIcon ... /> : <ChevronLeftIcon ... />}
```

3) `components/layout/Header.tsx`
```diff
+import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
+onToggleSidebar?: () => void;
+aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
+role="dialog" aria-modal="true" aria-label="Menú lateral"
```

### H.3 Pasos para probar manualmente

1. Levantar app: `npm run dev`.
2. Ir a cualquier ruta admin (`/admin`).
3. Desktop:
   - Click en botón colapsar/expandir.
   - Refrescar página y validar persistencia del estado.
   - Validar que navegación y scroll principal no se rompen.
4. Teclado:
   - Foco en botón toggle, usar Enter/Espacio.
   - Confirmar cambio de estado.
5. Mobile (< `lg`):
   - Abrir menú con hamburguesa.
   - Cerrar con `X`, click en overlay y tecla `Esc`.
   - Entrar a una ruta desde drawer y confirmar cierre automático.

### H.4 Verificación ejecutada

- `npx eslint components/layout/AdminShellClient.tsx components/layout/Sidebar.tsx components/layout/Header.tsx` ✅
- `npm run -s typecheck` ✅

---

## Lista de preguntas abiertas

1. ¿Se decide desactivar por completo los alias legacy `/api/membresias/*` o mantenerlos con fecha de deprecación?
2. ¿El fallback por header `x-role` se mantiene únicamente para integración interna/dev o debe eliminarse en todos los entornos?
3. ¿Qué endpoints deben permanecer públicos por negocio (ej. `/api/public/turnos`) y cuáles requieren token firmado?
4. ¿Se prioriza completar tabs faltantes (CRM reportes/dashboard, Agenda dashboard/recursos, Membresías renovaciones/cobranza, Usuarios sucursales) o retirarlos temporalmente?
5. ¿El módulo Facturación debe migrar primero a datos reales o mantener mock hasta estabilizar Finanzas?
6. Confirmar política de IDs: ¿se estandariza `@default(cuid())` en nuevas tablas (`Membership*`, `Encounter*`) para evitar IDs caller-generated?
