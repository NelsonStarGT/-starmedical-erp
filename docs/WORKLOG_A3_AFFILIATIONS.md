# WORKLOG A3 - Affiliations + Pending Verify + Check-in Reminder

Updated: 2026-02-27  
Scope: A3 (Camino A)

## 1) Objetivo

Agregar recordatorio operativo de afiliaciones (persona <-> empresa/institucion/aseguradora) con regla temporal y acciones directas en check-in.

## 2) Cambios implementados

1. Modelo y semantica:
   - `ClientAffiliationStatus` extendido con `PENDING_VERIFY`.
   - Nuevos campos en `ClientAffiliation`:
     - `tenantId`
     - `lastVerifiedAt`
     - `notes`
   - Migracion: `prisma/migrations/20260720090000_client_affiliations_pending_verify/migration.sql`
2. Reglas de verificacion:
   - Nuevo helper `lib/clients/affiliations.ts`.
   - Regla por defecto: 6 meses (`CLIENT_AFFILIATION_VERIFY_MONTHS`).
   - `ACTIVE` vencida -> `PENDING_VERIFY` (estado efectivo en UI).
3. Clientes (perfil persona):
   - Panel de afiliaciones ahora muestra:
     - estado efectivo (incluye `Pendiente de verificar`)
     - ultima verificacion
     - notas
   - Acciones:
     - Confirmar / Reactivar
     - Guardar cambios
     - Eliminar
   - Nuevas opciones de estado en formularios: `ACTIVE | PENDING_VERIFY | INACTIVE`.
4. Recepcion / check-in:
   - `actionSearchPatients` devuelve `pendingAffiliationsCount`.
   - Banner en check-in con afiliaciones pendientes por paciente.
   - Acciones inline:
     - Confirmar afiliacion
     - Desvincular afiliacion
   - Acciones server nuevas:
     - `actionListPendingAffiliations`
     - `actionConfirmReceptionAffiliation`
     - `actionDeactivateReceptionAffiliation`

## 3) Seguridad y multi-tenant

- Alta/edicion de afiliaciones valida tenant consistente entre persona, entidad y responsable de pago.
- Acciones de check-in para afiliaciones requieren capability `VISIT_CHECKIN`.
- Queries en Recepcion filtran por `tenantId`.

## 4) Archivos clave

- `prisma/schema.prisma`
- `prisma/migrations/20260720090000_client_affiliations_pending_verify/migration.sql`
- `lib/clients/affiliations.ts`
- `app/admin/clientes/actions.ts`
- `app/admin/clientes/[id]/page.tsx`
- `components/clients/portal/ClientAffiliationsPanel.tsx`
- `app/admin/reception/actions.ts`
- `components/reception/CheckInForm.tsx`

## 5) Tests y validacion automatizada

- `tests/clients.affiliations-verification.test.ts` (nuevo)
- `pnpm db:generate` -> PASS
- `pnpm lint` -> PASS
- `pnpm typecheck` -> PASS
- `pnpm test` -> PASS

## 6) QA manual sugerido (A3)

1. Abrir una persona en `/admin/clientes/[id]?tab=afiliaciones`.
2. Crear afiliacion y dejarla en `ACTIVE`.
3. Simular antiguedad de verificacion en QA (fecha vieja) y confirmar estado efectivo `Pendiente de verificar`.
4. Usar boton `Confirmar` y validar `lastVerifiedAt` actualizado.
5. Ir a `/admin/reception/check-in`, buscar el paciente y verificar banner de pendientes.
6. Confirmar/desvincular desde check-in y validar reflejo al refrescar perfil del cliente.

