# EXECUTION_PLAN_APPSTAR.md

Base única usada: `AUDIT_APPSTAR.md` (sin re-auditoría).

## Índice
- [A) ROADMAP GENERAL (6–8 semanas)](#a-roadmap-general-6-8-semanas)
- [B) DESCOMPOSICIÓN EN PRs (nivel quirúrgico)](#b-descomposición-en-prs-nivel-quirúrgico)
- [C) CIERRE FUNCIONAL POR MÓDULO (Definition of Done)](#c-cierre-funcional-por-módulo-definition-of-done)
- [D) PLAN DE QA MANUAL (sin testing automatizado)](#d-plan-de-qa-manual-sin-testing-automatizado)
- [E) POLÍTICA DE RAMAS Y MERGE](#e-política-de-ramas-y-merge)
- [F) QUICK WINS POST-AUDITORÍA](#f-quick-wins-post-auditoría)
- [G) RIESGOS TÉCNICOS A VIGILAR](#g-riesgos-técnicos-a-vigilar)

---

## A) ROADMAP GENERAL (6–8 semanas)

| Semana | Objetivo funcional claro | Riesgo principal | Qué NO se va a tocar (scope control) |
|---|---|---|---|
| 1 | Cerrar flujo base de **Clientes** (crear/editar/buscar/listar) sin regresiones en navegación. | Regresión en `app/admin/clientes/actions.ts` por alto acoplamiento. | No refactor masivo de diseño, no mover rutas `/admin/clientes/*`, no rediseñar otros módulos. |
| 2 | Completar **Clientes**: documentos, archivado (`deletedAt`), estados y acciones bloqueadas en archivados. | Inconsistencias de reglas entre lista/detalle/documentos. | No cambiar modelo de datos global ni introducir migraciones no estrictamente necesarias. |
| 3 | Estabilizar **CRM** operativo (bandeja/pipeline/leads/deals/quotes) y resolver tabs TODO (mostrar/ocultar). | Flujo comercial rompe por cambios en contratos API. | No reescribir pipeline UI completo; no tocar módulos no CRM excepto dependencias mínimas RBAC. |
| 4 | Consolidar **Membresías**: unificar API canónica (`/api/memberships/*`) y mantener compatibilidad temporal legacy. | Riesgo de romper clientes que consumen `/api/membresias/*`. | No eliminar alias legacy sin feature flag/deprecación controlada; no rediseño completo de pantallas. |
| 5 | Endurecer **Agenda**: quitar fallback mock en casos críticos, permisos por sucursal/rol, SSE estable. | Ruptura de operación diaria de citas por cambios de carga/errores. | No rediseñar calendario desde cero; no cambiar URLs `/admin/agenda*`. |
| 6 | Cerrar **Usuarios/Roles** + **Recepción** (sede activa, permisos, acciones críticas de visita/cola). | Regresión en flujos de recepción por `actions.ts` monolítico. | No migrar recepción a arquitectura nueva en big-bang; no tocar rutas existentes. |
| 7 | Hardening transversal: auth/roles en endpoints sensibles, seguridad de configuración, endpoints públicos críticos. | Cortar integraciones actuales por endurecer auth sin transición. | No eliminar compatibilidad sin fallback temporal; no cambios de UX grandes. |
| 8 | UX polish + deuda técnica de alto impacto (God components, labels ambiguos, botones inválidos, QA de humo global). | Sobrepasar tiempo por intentar “perfección técnica”. | No refactor estético global, no cambios de arquitectura profunda. |

**Arranque hoy (día 0–2):**
- Abrir PRs de Clientes (`PR-CL-01` y `PR-CL-02`) en paralelo corto.
- Congelar cambios no relacionados en Clientes hasta cerrar semana 2.
- Definir owner de QA manual para módulo Clientes.

---

## B) DESCOMPOSICIÓN EN PRs (nivel quirúrgico)

### Módulo: Clientes (prioridad absoluta)

| PR # | Nombre corto del PR | Tipo | Objetivo exacto | Archivos afectados (paths reales) | Riesgo | Dependencias | Checklist de aceptación (manual QA) |
|---|---|---|---|---|---|---|---|
| PR-CL-01 | Validación unificada en actions | Hardening | Estandarizar validaciones de alta/edición para evitar datos incompletos o inválidos. | `app/admin/clientes/actions.ts`, `lib/validation/identity.ts` | Medio | Ninguna | 1) Crear persona/empresa/institución/aseguradora; 2) validar errores claros por campo; 3) no 500 en formularios. |
| PR-CL-02 | Reglas de archivado consistentes | Bugfix | Bloquear acciones de edición/documentos cuando el perfil esté archivado y reflejar estado en UI. | `app/admin/clientes/actions.ts`, `lib/clients/list.service.ts`, `components/clients/ClientRowActions.tsx` | Medio | PR-CL-01 | 1) Archivar cliente; 2) confirmar acciones deshabilitadas; 3) reactivar y volver a operar. |
| PR-CL-03 | Dashboard/KPI robusto en faltantes DB | Hardening | Evitar degradación silenciosa y mejorar mensajes cuando falten tablas/columnas en KPIs. | `lib/clients/dashboard.service.ts`, `app/admin/clientes/page.tsx` | Bajo | PR-CL-01 | 1) KPI carga sin crash; 2) mensaje explícito si falta tabla; 3) navegación intacta. |
| PR-CL-04 | Flujo documentos con expiración | Feature | Asegurar carga/edición de documentos con fechas de expiración y alertas coherentes. | `app/admin/clientes/actions.ts`, `lib/clients/list.service.ts`, `components/clients/ClientPreviewSheet.tsx` | Medio | PR-CL-02 | 1) Subir documento; 2) ver vencidos/por vencer; 3) filtrar alertas correctamente. |
| PR-CL-05 | Pulido UX tablas clientes | UX | Reducir fricción en búsqueda/filtros/acciones rápidas sin cambiar rutas. | `app/admin/clientes/page.tsx`, `components/clients/DebouncedSearchInput.tsx`, `components/clients/ClientListKpiStrip.tsx` | Bajo | PR-CL-02 | 1) Buscar por nombre/DPI/NIT; 2) filtros no se resetean inesperadamente; 3) acciones visibles y claras. |

### Módulo: CRM

| PR # | Nombre corto del PR | Tipo | Objetivo exacto | Archivos afectados (paths reales) | Riesgo | Dependencias | Checklist de aceptación (manual QA) |
|---|---|---|---|---|---|---|---|
| PR-CRM-01 | Tabs CRM sin rutas fantasma | UX | Resolver tabs Dashboard/Reportes (ocultar o disabled explícito) para evitar navegación muerta. | `app/admin/crm/CrmLayoutClient.tsx`, `lib/navigation/moduleTabs.visual.ts` | Bajo | PR-CL-02 | 1) Tabs visibles con estado correcto; 2) no links muertos; 3) flujo bandeja/pipeline intacto. |
| PR-CRM-02 | Contratos leads/deals zod | Hardening | Unificar validación de payloads críticos de leads/deals para disminuir 400/500 ambiguos. | `app/api/crm/leads/route.ts`, `app/api/crm/deals/route.ts`, `lib/hr/schemas.ts` | Medio | PR-CRM-01 | 1) Crear lead/deal válido; 2) error legible con payload inválido; 3) sin regress en listado. |
| PR-CRM-03 | Scope owner/sucursal en deals | Bugfix | Corregir visibilidad/edición de deals por owner y branch conforme RBAC. | `lib/rbac.ts`, `app/api/crm/deals/route.ts`, `app/api/crm/deals/[id]/route.ts` | Alto | PR-CRM-02 | 1) vendedor ve lo suyo; 2) supervisor ve sucursal; 3) admin ve todo. |
| PR-CRM-04 | QA quotes v2 y aprobaciones | Cleanup | Normalizar mensajes/estados en aprobación/rechazo/envío de cotizaciones v2. | `app/api/crm/quotes-v2/[id]/approve/route.ts`, `app/api/crm/quotes-v2/[id]/reject/route.ts`, `app/api/crm/quotes-v2/[id]/send/route.ts` | Medio | PR-CRM-03 | 1) aprobar/rechazar/envíar sin error; 2) auditoría consistente; 3) estado final correcto. |

### Módulo: Membresías

| PR # | Nombre corto del PR | Tipo | Objetivo exacto | Archivos afectados (paths reales) | Riesgo | Dependencias | Checklist de aceptación (manual QA) |
|---|---|---|---|---|---|---|---|
| PR-MB-01 | Alias legacy controlado | Cleanup | Mantener alias `/api/membresias/*` como wrappers estables hacia `/api/memberships/*`. | `app/api/membresias/planes/route.ts`, `app/api/membresias/contratos/route.ts`, `app/api/membresias/dashboard/route.ts` | Medio | PR-CRM-02 | 1) UI actual sigue funcionando; 2) endpoint canónico responde igual; 3) sin duplicar lógica. |
| PR-MB-02 | Estados contratos/planes seguros | Bugfix | Asegurar auth y validación en endpoints de cambio de estado legacy que figuran como públicos. | `app/api/membresias/contratos/[id]/estado/route.ts`, `app/api/membresias/planes/[id]/estado/route.ts` | Alto | PR-MB-01 | 1) no autenticado recibe 401/403; 2) autenticado autorizado cambia estado; 3) no autorizado bloqueado. |
| PR-MB-03 | Tabs pendientes membrecías | UX | Definir comportamiento de renovaciones/cobranza (ocultar o “próximamente”). | `app/admin/membresias/layout.tsx`, `lib/navigation/moduleTabs.visual.ts` | Bajo | PR-MB-01 | 1) sin tabs engañosos; 2) navegación clara; 3) cero rutas 404 por tab. |
| PR-MB-04 | IDs y defaults saneados | Hardening | Definir estrategia de IDs en creación de plan/contrato para evitar registros inválidos. | `src/lib/memberships/service.ts`, `app/api/memberships/contracts/route.ts`, `app/api/memberships/plans/route.ts` | Medio | PR-MB-02 | 1) crear plan/contrato siempre genera ID válido; 2) no colisiones; 3) CRUD estable. |

### Módulo: Agenda

| PR # | Nombre corto del PR | Tipo | Objetivo exacto | Archivos afectados (paths reales) | Riesgo | Dependencias | Checklist de aceptación (manual QA) |
|---|---|---|---|---|---|---|---|
| PR-AG-01 | Quitar fallback mock silencioso | Hardening | Reemplazar fallback a mock por estado de error controlado y retry. | `app/admin/agenda/page.tsx` | Medio | PR-MB-01 | 1) API caída muestra error claro; 2) retry funcional; 3) no mezcla datos mock/real. |
| PR-AG-02 | Branch scope estricto | Bugfix | Asegurar enforcement de sucursal en GET/POST/PATCH agenda. | `app/api/agenda/route.ts`, `lib/agenda/access.ts` | Medio | PR-AG-01 | 1) usuario de sucursal A no ve/edita B; 2) admin sí; 3) respuestas 403 correctas. |
| PR-AG-03 | Tabs Agenda sin deuda visible | UX | Resolver tabs Dashboard/Recursos hoy no implementados. | `app/admin/agenda/layout.tsx`, `lib/navigation/moduleTabs.visual.ts` | Bajo | PR-AG-01 | 1) tabs solo funcionales; 2) navegación consistente; 3) sin enlaces muertos. |
| PR-AG-04 | SSE robusto en desconexiones | Hardening | Mejorar reconexión y feedback visual para `/api/agenda/updates`. | `hooks/useAgendaUpdates.ts`, `app/api/agenda/updates/route.ts` | Bajo | PR-AG-02 | 1) desconexión no rompe UI; 2) reconexión automática; 3) eventos siguen llegando. |

### Módulo: Usuarios / Roles

| PR # | Nombre corto del PR | Tipo | Objetivo exacto | Archivos afectados (paths reales) | Riesgo | Dependencias | Checklist de aceptación (manual QA) |
|---|---|---|---|---|---|---|---|
| PR-US-01 | Tab sucursales: decisión explícita | UX | Ocultar/deshabilitar con copy claro la pestaña sin ruta (`Sucursales`). | `app/admin/usuarios/layout.tsx`, `lib/navigation/moduleTabs.visual.ts` | Bajo | PR-AG-03 | 1) no hay navegación rota; 2) usuario entiende estado del feature. |
| PR-US-02 | Alta usuario con vínculo HR robusto | Bugfix | Endurecer creación de usuario y enlace opcional a empleado con errores claros. | `app/api/users/route.ts`, `src/lib/users/service.ts`, `app/api/users/[id]/link-hr/route.ts` | Medio | PR-US-01 | 1) crear usuario; 2) vincular/desvincular HR; 3) conflictos devuelven 409 legible. |
| PR-US-03 | Permisos efectivos visibles | Feature | Mostrar permisos y denegaciones efectivas en pantalla de permisos/admin. | `components/users/UserProvider.tsx`, `app/admin/usuarios/permisos/page.tsx`, `lib/security/permissionService.ts` | Medio | PR-US-02 | 1) admin ve permisos finales; 2) deny prevalece; 3) cambios se reflejan al refrescar. |

### Módulo: Recepción

| PR # | Nombre corto del PR | Tipo | Objetivo exacto | Archivos afectados (paths reales) | Riesgo | Dependencias | Checklist de aceptación (manual QA) |
|---|---|---|---|---|---|---|---|
| PR-RC-01 | División mínima actions recepción | Cleanup | Extraer funciones por dominio (colas/visitas/sla) sin cambiar comportamiento ni rutas. | `app/admin/reception/actions.ts`, `lib/reception/queues.service.ts`, `lib/reception/visit.service.ts` | Alto | PR-US-02 | 1) admisión/cola/check-in siguen operando igual; 2) sin rotura de imports. |
| PR-RC-02 | Validación sede activa y errores UX | Bugfix | Endurecer selección de sede activa y mensajes cuando no hay sede seleccionada. | `app/admin/reception/ReceptionLayoutClient.tsx`, `lib/reception/active-branch.ts`, `app/admin/reception/page.tsx` | Medio | PR-RC-01 | 1) sin sede no permite operar; 2) selecciona sede y reintenta; 3) no estados inconsistentes. |
| PR-RC-03 | Service requests contrato estricto | Hardening | Completar validaciones y códigos de error estables en `/api/reception/service-requests`. | `app/api/reception/service-requests/route.ts`, `app/api/reception/service-requests/[id]/route.ts`, `lib/reception/service-requests.service.ts` | Medio | PR-RC-01 | 1) create/list/update por rol/sede correcto; 2) 400/403/404 consistentes. |

### Módulo: RRHH (soporte a plan principal)

| PR # | Nombre corto del PR | Tipo | Objetivo exacto | Archivos afectados (paths reales) | Riesgo | Dependencias | Checklist de aceptación (manual QA) |
|---|---|---|---|---|---|---|---|
| PR-HR-01 | Resolver mismatch disciplinario | Bugfix | Alinear UI y API para submit/approve/reject de acciones disciplinarias. | `app/hr/employees/page.tsx`, `app/api/hr/employees/[id]/disciplinary-actions/route.ts` | Alto | PR-RC-02 | 1) submit/approve/reject funciona; 2) sin 404; 3) estado actualizado en historial. |
| PR-HR-02 | Payroll preview/runs robusto | Hardening | Corregir queries dinámicas y errores ambiguos en preview/listado nómina. | `app/hr/payroll/page.tsx`, `app/api/hr/payroll/route.ts` | Medio | PR-HR-01 | 1) preview carga; 2) crear corrida; 3) filtros no rompen query string. |

### Módulo: Inventario

| PR # | Nombre corto del PR | Tipo | Objetivo exacto | Archivos afectados (paths reales) | Riesgo | Dependencias | Checklist de aceptación (manual QA) |
|---|---|---|---|---|---|---|---|
| PR-INV-01 | Hardening auth inventario | Hardening | Reducir dependencia de `x-role` y exigir token válido en operaciones sensibles. | `lib/api/auth.ts`, `app/api/inventario/productos/route.ts`, `app/api/inventario/movimientos/route.ts` | Alto | PR-RC-03 | 1) sin token: 403; 2) token válido: operaciones ok; 3) UI no rompe. |
| PR-INV-02 | Eliminar fallback mock silencioso | Bugfix | Evitar responder 200 con mock cuando DB falla en endpoints operativos. | `app/api/inventario/productos/route.ts`, `app/api/inventario/servicios/route.ts` | Medio | PR-INV-01 | 1) DB caída -> error explícito; 2) DB ok -> datos reales; 3) no mezclas. |
| PR-INV-03 | Tabs reportes inventario | UX | Resolver tab de reportes no implementado para evitar confusión. | `app/admin/inventario/layout.tsx`, `lib/navigation/moduleTabs.visual.ts` | Bajo | PR-INV-02 | 1) tab funcional o oculto; 2) navegación limpia. |

### Módulo: Finanzas

| PR # | Nombre corto del PR | Tipo | Objetivo exacto | Archivos afectados (paths reales) | Riesgo | Dependencias | Checklist de aceptación (manual QA) |
|---|---|---|---|---|---|---|---|
| PR-FN-01 | Cerrar fallback role-header | Hardening | Deshabilitar bypass por `x-role` fuera de dev en APIs financieras. | `lib/api/finance.ts`, `app/api/finanzas/summary/route.ts`, `app/api/finanzas/journal-entries/[id]/post/route.ts` | Alto | PR-INV-01 | 1) sin sesión/token válido: 401/403; 2) flujo admin autorizado funciona. |
| PR-FN-02 | Validación unificada asientos | Bugfix | Estandarizar validaciones y mensajes de error de post/reverse de asientos. | `app/api/finanzas/journal-entries/[id]/post/route.ts`, `app/api/finanzas/journal-entries/[id]/reverse/route.ts` | Medio | PR-FN-01 | 1) solo DRAFT posteable; 2) reversa solo POSTED; 3) respuestas claras. |
| PR-FN-03 | Segmentación UI finanzas por subvista | Cleanup | Reducir complejidad operativa fragmentando bloques en componentes sin tocar rutas. | `app/admin/finanzas/page.tsx`, `components/ui/Tabs.tsx` | Medio | PR-FN-02 | 1) mismas funciones disponibles; 2) menor scroll/errores operativos; 3) no regress en formularios. |

### Módulo: Facturación

| PR # | Nombre corto del PR | Tipo | Objetivo exacto | Archivos afectados (paths reales) | Riesgo | Dependencias | Checklist de aceptación (manual QA) |
|---|---|---|---|---|---|---|---|
| PR-FA-01 | Quick-actions con prechecks claros | Bugfix | Añadir validaciones previas y mensajes claros en quick actions de expedientes. | `app/api/facturacion/expedientes/[id]/quick-action/route.ts`, `lib/billing/access.ts` | Medio | PR-FN-01 | 1) cobrar/abono/crédito/doc emiten resultado consistente; 2) no autorizado bloqueado. |
| PR-FA-02 | Plan de salida de mock dashboard | Cleanup | Preparar capa dual para migrar `billingCasesMock` a datos reales por feature flag. | `lib/billing/service.ts`, `app/admin/facturacion/page.tsx` | Medio | PR-FA-01 | 1) modo actual sigue intacto; 2) flag permite probar datos reales sin romper UI. |

### Módulo: Configuración / Seguridad transversal

| PR # | Nombre corto del PR | Tipo | Objetivo exacto | Archivos afectados (paths reales) | Riesgo | Dependencias | Checklist de aceptación (manual QA) |
|---|---|---|---|---|---|---|---|
| PR-SEC-01 | AUTH_SECRET obligatorio fuera dev | Hardening | Bloquear arranque inseguro cuando falta `AUTH_SECRET` en staging/prod. | `lib/auth.ts`, `README.md`, `.env.example` | Alto | PR-FN-01 | 1) dev sigue levantando; 2) staging/prod sin secret falla temprano con mensaje explícito. |
| PR-SEC-02 | Proteger upload/logo | Hardening | Requerir auth/permisos para endpoints de carga de archivos. | `app/api/upload/image/route.ts`, `app/api/upload/logo/route.ts`, `app/api/files/[id]/route.ts` | Alto | PR-SEC-01 | 1) no autenticado no sube; 2) autenticado autorizado sí; 3) descarga respeta permisos. |
| PR-SEC-03 | WhatsApp endpoints gated | Hardening | Restringir `/api/whatsapp/*` a sesión + permiso de comunicaciones. | `app/api/whatsapp/send/route.ts`, `app/api/whatsapp/threads/route.ts`, `lib/rbac.ts` | Alto | PR-SEC-01 | 1) endpoint público bloqueado; 2) staff sin permiso no accede; 3) usuario autorizado opera. |

---

## C) CIERRE FUNCIONAL POR MÓDULO (Definition of Done)

### 1) Clientes
- Funcionalidades obligatorias:
  - Crear, editar, listar y buscar clientes por tipo.
  - Documentos con expiración y alertas.
  - Archivado (`deletedAt`) y reactivación.
- Casos borde cubiertos:
  - Cliente archivado no editable.
  - Documento vencido y por vencer (30 días).
  - Validación de DPI/NIT/email duplicados.
- UX mínima aceptable:
  - Estados visibles (Activo/Archivado/Incompleto).
  - Botones de acción con labels claros y disabled correcto.
- Errores que NO deben ocurrir:
  - 500 al guardar formularios.
  - Acción permitida sobre perfil archivado.
- Métricas/confianza:
  - 10/10 casos de QA manual pasan.
  - 0 crashes reportados en 1 semana de uso operativo.

### 2) CRM
- Funcionalidades obligatorias:
  - Lead→Deal→Quote funcional con permisos por rol.
  - Bandeja/pipeline/listado operativos.
- Casos borde cubiertos:
  - Usuario sin permiso no puede editar/aprobar.
  - Supervisor limitado por sucursal (si aplica).
- UX mínima aceptable:
  - Sin tabs que lleven a rutas inexistentes.
  - Estados de quote claros (draft/requested/approved/rejected/sent).
- Errores que NO deben ocurrir:
  - 404 por navegación de tabs.
  - Cambios de estado sin permiso.
- Métricas/confianza:
  - 95%+ de operaciones comerciales sin retry manual.

### 3) Membresías
- Funcionalidades obligatorias:
  - CRUD operativo de planes/contratos.
  - Pago y cambio de estado controlado.
- Casos borde cubiertos:
  - Duplicidad por alias legacy.
  - Contratos con saldo pendiente y bloqueo por regla.
- UX mínima aceptable:
  - Tabs consistentes con features reales.
  - Mensajes de estado de contrato legibles.
- Errores que NO deben ocurrir:
  - Endpoint de estado abierto sin auth.
  - Inconsistencia entre dashboard y contrato.
- Métricas/confianza:
  - 0 diferencias entre endpoint canónico y alias (durante transición).

### 4) Agenda
- Funcionalidades obligatorias:
  - CRUD citas por día/semana/lista.
  - SSE para actualización de eventos.
  - Scope por sucursal.
- Casos borde cubiertos:
  - Reconexión SSE.
  - API caída con fallback de error (no mock silencioso).
- UX mínima aceptable:
  - Estados de cita/pago visibles.
  - Mensajes de error accionables.
- Errores que NO deben ocurrir:
  - Ver citas de otra sucursal sin permiso.
  - Mostrar datos mock como reales.
- Métricas/confianza:
  - 0 incidentes de “cita perdida” por sincronización durante 1 semana.

### 5) Usuarios / Roles
- Funcionalidades obligatorias:
  - Alta/edición/desactivación de usuario.
  - Asignación de roles y permisos efectivos.
  - Vínculo/desvínculo HR opcional.
- Casos borde cubiertos:
  - Usuario ya vinculado a otro empleado.
  - Deny override prevalece sobre grant.
- UX mínima aceptable:
  - Errores 409 claros y accionables.
  - Información de permisos efectiva visible para admin.
- Errores que NO deben ocurrir:
  - Asignación silenciosa inválida de permisos.
  - Estado de vínculo HR incoherente.
- Métricas/confianza:
  - 100% de cambios de permiso auditables y reproducibles.

### 6) Recepción
- Funcionalidades obligatorias:
  - Admisión nueva/existente.
  - Gestión de cola (llamar/iniciar/completar/transferir según rol).
  - Bloqueo de checkout con requests abiertas.
- Casos borde cubiertos:
  - Operar sin sede activa.
  - Transiciones inválidas de visita.
- UX mínima aceptable:
  - Indicadores de rol/capacidad visibles.
  - Mensajes claros en acciones bloqueadas.
- Errores que NO deben ocurrir:
  - Cambio de estado sin capacidad.
  - Cola en sede equivocada.
- Métricas/confianza:
  - Tiempo promedio de admisión estable y sin errores críticos en turno completo.

### 7) RRHH
- Funcionalidades obligatorias:
  - Gestión empleados y acciones disciplinarias sin rutas rotas.
  - Corridas de nómina básicas operativas.
- Casos borde cubiertos:
  - Submit/approve/reject disciplinario.
  - Errores en preview de payroll.
- UX mínima aceptable:
  - Formularios extensos sin pérdida de estado accidental.
- Errores que NO deben ocurrir:
  - 404 en acciones disciplinarias.
  - Errores ambiguos en creación de corrida.
- Métricas/confianza:
  - 0 bloqueos de operación RH por rutas inexistentes.

### 8) Inventario
- Funcionalidades obligatorias:
  - CRUD catálogo, movimientos, solicitudes/órdenes con auth consistente.
- Casos borde cubiertos:
  - Token inválido/ausente.
  - DB caída sin mock silencioso.
- UX mínima aceptable:
  - Mensajes de error operativos claros.
- Errores que NO deben ocurrir:
  - Respuesta 200 con data mock en operación real.
- Métricas/confianza:
  - 100% endpoints críticos devuelven códigos HTTP consistentes.

### 9) Finanzas
- Funcionalidades obligatorias:
  - Asientos, AR/AP y resumen con acceso restringido correcto.
- Casos borde cubiertos:
  - Post/reverse en estados inválidos.
- UX mínima aceptable:
  - Acciones críticas confirmadas y con feedback explícito.
- Errores que NO deben ocurrir:
  - Bypass por `x-role` en producción.
- Métricas/confianza:
  - Ninguna acción financiera crítica sin traza y autorización válida.

### 10) Facturación
- Funcionalidades obligatorias:
  - Bandejas operativas + quick actions estables.
- Casos borde cubiertos:
  - Cobro parcial/abono/crédito con validaciones.
- UX mínima aceptable:
  - Estados de expediente entendibles por caja/operador.
- Errores que NO deben ocurrir:
  - Monto inconsistente tras quick action.
- Métricas/confianza:
  - 0 discrepancias críticas de saldo en QA manual.

---

## D) PLAN DE QA MANUAL (sin testing automatizado)

### Clientes (admin/recepción)
- Casos felices:
  1. Crear persona completa.
  2. Crear empresa con NIT.
  3. Editar datos y confirmar persistencia.
  4. Subir documento con expiración.
- Casos borde:
  1. DPI inválido / NIT duplicado.
  2. Cliente archivado intenta edición.
  3. Documento vencido aparece como alerta.
- Casos que antes fallaban (auditoría):
  1. Action monolítica con riesgo de validación inconsistente.
- Revisión visual:
  1. Labels de acciones claros.
  2. Botones deshabilitados en archivados.
  3. Estados de alerta coherentes.

### CRM (ventas/supervisor/admin)
- Casos felices:
  1. Crear lead, convertir a deal.
  2. Crear quote, aprobar/rechazar/enviar.
  3. Ver pipeline y bandeja con datos consistentes.
- Casos borde:
  1. Usuario sin permiso intenta aprobar quote.
  2. Supervisor fuera de sucursal intenta editar deal.
- Casos que antes fallaban:
  1. Tabs con rutas no implementadas.
- Revisión visual:
  1. Tabs sin rutas muertas.
  2. Estados de quote y badges coherentes.

### Membresías (admin/caja)
- Casos felices:
  1. Crear plan.
  2. Crear contrato.
  3. Registrar pago.
  4. Cambiar estado.
- Casos borde:
  1. Endpoint legacy y canónico devuelven resultado equivalente.
  2. No autenticado intenta cambiar estado.
- Casos que antes fallaban:
  1. Endpoints legacy con auth pública/no clara.
- Revisión visual:
  1. Tabs renovaciones/cobranza no deben llevar a error.

### Agenda (recepción)
- Casos felices:
  1. Crear cita desde calendario.
  2. Reprogramar cita.
  3. Cambiar estado/pago con rol permitido.
- Casos borde:
  1. API agenda caída: mostrar error con retry.
  2. Usuario de sucursal A intenta ver B.
  3. Reconexión SSE tras desconexión.
- Casos que antes fallaban:
  1. Fallback a mock ocultando fallas reales.
- Revisión visual:
  1. Avisos de carga/error no ambiguos.
  2. No datos “fantasma” en grilla.

### Usuarios / Roles (admin)
- Casos felices:
  1. Crear usuario con rol.
  2. Editar rol/permisos.
  3. Vincular y desvincular empleado HR.
- Casos borde:
  1. Vincular usuario ya asociado a otro empleado.
  2. Aplicar DENY y validar prevalencia.
- Casos que antes fallaban:
  1. Tab sucursales sin ruta.
- Revisión visual:
  1. Errores de negocio legibles.
  2. Información de permisos efectiva visible.

### Recepción (recepcionista/supervisor)
- Casos felices:
  1. Seleccionar sede activa.
  2. Crear admisión.
  3. Encolar y llamar turno.
  4. Completar atención y cerrar visita.
- Casos borde:
  1. Operar sin sede seleccionada.
  2. Intentar transición no permitida por rol.
  3. Intentar checkout con service request abierta.
- Casos que antes fallaban:
  1. Riesgo de regresión por `actions.ts` centralizada.
- Revisión visual:
  1. Mensajes de bloqueo claros.
  2. Estado de cola visible por área.

### RRHH
- Casos felices:
  1. Crear acción disciplinaria.
  2. Submit/approve/reject.
  3. Crear corrida de nómina.
- Casos borde:
  1. Rutas dinámicas con query string compleja.
  2. Empleado inexistente en acción.
- Casos que antes fallaban:
  1. UI llamaba endpoints no existentes para disciplinario.
- Revisión visual:
  1. Botones de flujo disciplinario no ambiguos.

### Inventario
- Casos felices:
  1. Listar productos/servicios con auth válida.
  2. Registrar movimiento.
- Casos borde:
  1. Token ausente/incorrecto.
  2. DB caída.
- Casos que antes fallaban:
  1. Fallback mock silencioso.
- Revisión visual:
  1. Mensajes claros de auth y backend.

### Finanzas
- Casos felices:
  1. Crear asiento DRAFT.
  2. Postear asiento balanceado.
  3. Reversar asiento POSTED.
- Casos borde:
  1. Intentar postear asiento no DRAFT.
  2. Intentar reversar no POSTED.
- Casos que antes fallaban:
  1. Exposición de endpoints con auth inconsistente.
- Revisión visual:
  1. Confirmaciones de acciones críticas.

### Facturación
- Casos felices:
  1. Abrir expediente.
  2. Ejecutar cobrar/abono/crédito.
  3. Ver impacto en bandeja/saldo.
- Casos borde:
  1. Monto inválido o referencia faltante.
- Casos que antes fallaban:
  1. Dependencia mock/real mezclada.
- Revisión visual:
  1. Badges de estado y saldo legibles.

---

## E) POLÍTICA DE RAMAS Y MERGE

### Naming de ramas
- Feature: `feature/<modulo>-<tema-corto>`
  - Ejemplo: `feature/clientes-archivado-reglas`
- Bugfix: `fix/<modulo>-<tema-corto>`
  - Ejemplo: `fix/hr-disciplinary-endpoints`
- Hardening: `hardening/<modulo>-<tema-corto>`
  - Ejemplo: `hardening/security-upload-auth`
- Cleanup: `chore/<modulo>-<tema-corto>`
  - Ejemplo: `chore/reception-actions-split`

### Estrategia de merge
- Estrategia recomendada: **Squash merge** por PR pequeño y atómico.
- Rebase obligatorio antes de merge si `main` avanzó.
- Un PR = un objetivo funcional verificable = rollback simple.

### Comandos obligatorios antes de merge
- Siempre:
  1. `npm run lint`
  2. `npm run typecheck`
- Si toca API o lógica crítica:
  1. `npm test` (si aplica suite del módulo)
  2. QA manual del checklist del módulo
- Si toca Prisma/schema/migrations:
  1. `npm run db:check`
  2. `npm run db:migrate:status`
  3. `npm run db:generate`

### Cuándo un PR NO debe mergearse
- Falla cualquiera de `lint` o `typecheck`.
- Cambia rutas/URLs públicas (prohibido por política).
- Mezcla objetivos (ej. bugfix + refactor amplio + UX) sin necesidad.
- No trae checklist QA ejecutado y evidenciado.
- No tiene plan de rollback.
- Introduce endpoint sensible sin auth o con bypass por header en producción.

---

## F) QUICK WINS POST-AUDITORÍA

| Quick win | Impacto usuario | Riesgo | Tiempo objetivo | Archivos sugeridos |
|---|---|---|---|---|
| 1. Marcar tabs no implementados como “Próximamente” (CRM/Agenda/Membresías/Usuarios/Inventario) | Evita clicks muertos y confusión | Bajo | < 4h | `app/admin/crm/CrmLayoutClient.tsx`, `app/admin/agenda/layout.tsx`, `app/admin/membresias/layout.tsx`, `app/admin/usuarios/layout.tsx`, `app/admin/inventario/layout.tsx` |
| 2. Corregir mismatch disciplinario en RRHH (submit/approve/reject) | Elimina errores 404 en operación RH | Medio | < 1 día | `app/hr/employees/page.tsx`, `app/api/hr/employees/[id]/disciplinary-actions/route.ts` |
| 3. Reemplazar fallback mock silencioso en Agenda por mensaje + retry | Evita decisiones sobre datos ficticios | Bajo | < 1 día | `app/admin/agenda/page.tsx` |
| 4. Reemplazar fallback mock silencioso en Inventario APIs críticas | Evita falsa sensación de operación exitosa | Medio | < 1 día | `app/api/inventario/productos/route.ts`, `app/api/inventario/servicios/route.ts` |
| 5. Endurecer endpoints públicos de Membresías estado legacy | Reduce riesgo de cambios no autorizados | Alto | < 1 día | `app/api/membresias/contratos/[id]/estado/route.ts`, `app/api/membresias/planes/[id]/estado/route.ts` |
| 6. Endurecer upload image/logo con auth | Protege carga de archivos sensibles | Alto | < 1 día | `app/api/upload/image/route.ts`, `app/api/upload/logo/route.ts` |
| 7. Mensajes de error de validación más claros en Clientes | Reduce retrabajo de recepción/admin | Bajo | < 1 día | `app/admin/clientes/actions.ts`, `components/clients/*` |
| 8. Normalizar labels ambiguos “...” a “Acciones” en tablas operativas | Baja errores operativos de UX | Bajo | < 4h | `components/ui/DataTable.tsx`, tablas de módulos |
| 9. Sidebar colapsable y drawer responsive | Mejor densidad de trabajo en desktop/móvil | Bajo | Ya implementado | `components/layout/AdminShellClient.tsx`, `components/layout/Sidebar.tsx`, `components/layout/Header.tsx` |

---

## G) RIESGOS TÉCNICOS A VIGILAR

### 1) Riesgos de base de datos

| Riesgo | Señal temprana | Detección | Acción preventiva |
|---|---|---|---|
| Drift entre código y DB por migraciones pendientes (`prisma/migrations` + `migrations__legacy`) | Errores P2021, features “vacías”, health YELLOW/RED | `npm run db:migrate:status`, `/api/admin/health/db` | Gate de merge para cambios DB + checklist de migraciones en release semanal. |
| IDs sin default en modelos críticos (Membership/Encounter) | Fallas de creación por ID nulo/duplicado | Logs de API + QA creación masiva | Definir estrategia de generación de ID en capa de servicio antes de expandir features. |
| Relaciones no explícitas en `branchId` en modelos legacy | Filtrado por sucursal inconsistente | QA multi-sucursal + consultas de verificación | Agregar validaciones de branch scope en API/servicio y pruebas manuales dirigidas. |

### 2) Riesgos de auth/roles

| Riesgo | Señal temprana | Detección | Acción preventiva |
|---|---|---|---|
| `AUTH_SECRET` por defecto (`dev-star-secret`) | Sesiones válidas con secret inseguro | Revisión de env al boot/deploy | Falla temprana en staging/prod si falta secret real. |
| Bypass por headers (`x-role`) en config/finanzas/inventario | Usuarios no autenticados acceden con header forjado | QA negativa (curl/postman) + logs 401/403 | Deshabilitar fallback en prod; mantener solo con flag dev si imprescindible. |
| Endpoints públicos sensibles (upload/whatsapp/legacy estado) | Cambios sin auditoría o abuso | Escaneo de superficie API + monitoreo de tráfico | Gating por sesión/permiso o token firmado con rate limiting. |

### 3) Riesgos de performance/mantenibilidad

| Riesgo | Señal temprana | Detección | Acción preventiva |
|---|---|---|---|
| God components y archivos monolíticos (`clientes/actions`, `reception/actions`, `hr/employees`, `finanzas/page`) | PRs grandes, regresiones frecuentes, tiempos de revisión altos | Métricas de tamaño de PR + defectos por release | Dividir por subdominio en PRs pequeños sin cambiar rutas. |
| Carga excesiva en páginas cliente-heavy | UI lenta al filtrar/listar | QA en dataset real + profiling básico en browser | Paginación/queries más acotadas y feedback de loading consistente. |

### 4) Riesgos UX que generan errores operativos

| Riesgo | Señal temprana | Detección | Acción preventiva |
|---|---|---|---|
| Tabs con rutas inexistentes o incompletas | Clicks sin resultado/404 internos | QA de navegación por módulo | Ocultar/deshabilitar con copy explícito “Próximamente”. |
| Fallback a mocks en producción operativa | Decisiones tomadas con data ficticia | Revisar respuestas con `warning: mock` + QA de contingencia | Reemplazar por error controlado y retry. |
| Acciones ambiguas o habilitadas en estados inválidos | Errores de operación por parte de recepción/admin | QA visual + feedback de usuarios | Renombrar acciones y bloquear botones inválidos por estado/rol. |

### 5) Monitoreo operativo mínimo por semana
- Revisión semanal obligatoria:
  1. `npm run db:migrate:status`
  2. Smoke manual: Clientes, CRM, Agenda, Recepción
  3. Revisión de endpoints 401/403 y 5xx en logs
- Señal de alerta release:
  - >2 bugs críticos en módulo de la semana.
  - Cualquier incidente de auth en endpoint sensible.
  - Cualquier operación con datos mock en módulo ya marcado “cerrado”.

