# Módulo de Recepción (`/admin/recepcion`)

## Propósito
Consola operativa del front desk para StarMedical ERP en fase v1 (esqueleto + UX + wiring mínimo).

Objetivos de esta fase:
- Búsqueda rápida y validación de cliente.
- Cola / sala de espera.
- Agenda del día (citas).
- Admisión / check-in guiado.
- Caja rápida v1.
- Slot para registros pendientes (auto-registro por link/QR).

Fuera de alcance v1:
- Persistencia operativa completa de cola/citas/admisión/cobro.
- Lógica clínica profunda.
- Flujo fiscal/PDF de comprobante final.

## Rutas v1
- `/admin/recepcion` (Dashboard)
- `/admin/recepcion/cola`
- `/admin/recepcion/citas`
- `/admin/recepcion/admisiones`
- `/admin/recepcion/caja`
- `/admin/recepcion/registros`

## Capacidades RBAC
Se agregaron capacidades al catálogo global:
- `RECEPTION_VIEW`
- `RECEPTION_QUEUE_VIEW`
- `RECEPTION_QUEUE_WRITE`
- `RECEPTION_APPOINTMENTS_VIEW`
- `RECEPTION_APPOINTMENTS_WRITE`
- `RECEPTION_ADMISSIONS_VIEW`
- `RECEPTION_ADMISSIONS_WRITE`
- `RECEPTION_CASHIER_VIEW`
- `RECEPTION_CASHIER_WRITE`
- `RECEPTION_REGISTRATIONS_VIEW`
- `RECEPTION_REGISTRATIONS_WRITE`

Roles sugeridos en catálogo:
- `SUPER_ADMIN`
- `OPS`
- `TENANT_ADMIN`
- `RECEPTIONIST`
- `CASHIER`

Compatibilidad:
- Roles legados (`RECEPTION`, `RECEPTION_OPERATOR`, `RECEPTION_SUPERVISOR`, `RECEPTION_ADMIN`, `FINANCE`) se mapean en `lib/recepcion/rbac.ts`.

## Guard Pattern (server-only)
- Todas las páginas de `/admin/recepcion` validan autenticación y capability con `requireRecepcionCapability` (`lib/recepcion/server.ts`).
- Si no hay sesión: redirección a `/login`.
- Si falta capability: `forbidden()`.

## Wiring mínimo implementado
### Búsqueda global de clientes
- Server action: `app/admin/recepcion/actions.ts` (`actionSearchRecepcionClients`).
- Servicio: `lib/recepcion/client-search.service.ts`.
- Criterios: correlativo, nombres, NIT/DPI, teléfono, email (incluye relaciones `clientIdentifiers`, `clientPhones`, `clientEmails`).
- Resultado abre perfil en `/admin/clientes/[id]`.

### Quick actions / deep links
- Crear persona: `/admin/clientes/personas/nuevo`
- Crear empresa: `/admin/clientes/empresas/nuevo`
- Agenda: `/admin/recepcion/citas` (placeholder funcional)
- Check-in: `/admin/recepcion/admisiones` (wizard v1)
- Caja: `/admin/recepcion/caja`
- Finanzas/Facturación: links a `/admin/finanzas/receivables` y `/admin/facturacion/caja`

### Registros pendientes
- En v1 se dejó tabla funcional mock con aprobar/rechazar UI.
- Hay enlace a módulo avanzado existente: `/admin/recepcion/registros`.

## Navegación
- Menú principal “Recepción” ahora apunta a `/admin/recepcion`.
- Navegación contextual registrada en `components/nav/moduleNavRegistry.ts` para las 6 vistas.
- Se mantiene el módulo legado `/admin/recepcion` sin romper rutas previas.

## Componentes y utilidades nuevas
- `components/recepcion/SearchClientBar.tsx`
- `components/recepcion/QueueBoardV1.tsx`
- `components/recepcion/CitasBoardV1.tsx`
- `components/recepcion/AdmissionsWizardV1.tsx`
- `components/recepcion/CashierV1.tsx`
- `components/recepcion/RegistrationsV1.tsx`
- `lib/recepcion/permissions.ts`
- `lib/recepcion/rbac.ts`
- `lib/recepcion/server.ts`
- `lib/recepcion/routes.ts`
- `lib/recepcion/mock.ts`
- `lib/recepcion/client-search.service.ts`

## Backlog recomendado v2
1. Cola persistente con eventos, SLA y auditoría.
2. Conexión real con agenda/scheduler (crear, reprogramar, disponibilidad por médico/sede).
3. Admisión persistente con ticket formal y trazabilidad por sede.
4. Caja real con integración de facturación, folio, métodos y conciliación.
5. Registros pendientes con aprobación/rechazo persistente y notificaciones.
6. Telemetría operativa (tiempos de espera, throughput por hora, abandono).
