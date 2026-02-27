# WORKLOG A1 - Client Codes (C/E/I/A), Backfill, Global Search

Updated: 2026-02-27  
Scope: A1 (Camino A)

## 1) Objetivo

Cerrar correlativos operativos por tipo de cliente, con backfill idempotente y busqueda por `clientCode` en Clientes + Recepcion.

## 2) Cambios implementados

1. Correlativo por tipo en flujos de Recepcion:
   - `actionCreateAdmission` (modo `new`) ahora crea paciente con `tenantId` + `clientCode`.
   - `actionCreatePatient` ahora reserva correlativo transaccional y persiste `clientCode`.
2. Busqueda en Recepcion (`check-in`, admision rapida, agenda):
   - `actionSearchPatients` ahora filtra por tenant + persona activa.
   - Incluye busqueda por `clientCode`, email, DPI/NIT, telefono y nombre.
   - Devuelve `clientCode` para UI.
3. Backfill robusto:
   - Se incorporo planner reutilizable `lib/clients/clientCodeBackfill.ts`.
   - Script actualizado con `--dry-run`, `--tenant`, `--type`.
   - Alias operativo creado en `scripts/ops/backfill-client-codes.ts`.
   - Scripts npm:
     - `pnpm backfill:client-codes`
     - `pnpm backfill:client-codes:dry-run`

## 3) Archivos clave

- `lib/clients/clientCodeBackfill.ts`
- `scripts/backfill-client-codes.ts`
- `scripts/ops/backfill-client-codes.ts`
- `app/admin/reception/actions.ts`
- `components/reception/CheckInForm.tsx`
- `components/reception/AdmissionModal.tsx`
- `components/reception/AppointmentIntakeForm.tsx`
- `package.json`

## 4) Tests y validacion automatizada

- `tests/clients.client-code-backfill.test.ts` (nuevo)
- `tests/clients.client-code.test.ts` (existente, sigue verde)
- `pnpm backfill:client-codes:dry-run` (ejecutado OK)
- `pnpm lint` -> PASS
- `pnpm typecheck` -> PASS
- `pnpm test` -> PASS

## 5) QA manual sugerido (A1)

1. Crear persona, empresa, institucion y aseguradora desde Clientes.
2. Confirmar `clientCode` con prefijo correcto (`C/E/I/A`) en lista y detalle.
3. Abrir `/admin/reception/check-in`, buscar por codigo parcial (`C0`, `E0`) y seleccionar paciente.
4. Crear paciente rapido desde admision/agenda y validar que se asigna `clientCode`.
5. Ejecutar `pnpm backfill:client-codes:dry-run` y verificar `planned` por tenant/tipo.
6. Ejecutar `pnpm backfill:client-codes` en QA y repetir dry-run para confirmar idempotencia.

