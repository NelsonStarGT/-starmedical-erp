# Runbook de setup local (Docker + Prisma)

## Ruta de trabajo correcta
- Trabaja siempre desde: `~/Documents/STARMEDICAL/app_star`

## One-command up (DB vacía + migraciones completas)
1. `npm install`
2. `npm run db:reset`
3. `npm run dev`

`npm run db:reset` ejecuta:
- `docker compose down -v --remove-orphans`
- `docker compose up -d --remove-orphans`
- `npm run db:wait`
- `npx prisma migrate deploy`
- `npx prisma db seed` (si hay seed configurado)

## Estrategia de migraciones activa
- Cadena activa en `prisma/migrations`: desde `20260126230520_baseline` en adelante.
- Histórico incremental previo movido a `prisma/migrations__legacy_prebaseline_20260222` (no leído por Prisma en deploy).
- Objetivo: evitar duplicados/drift entre snapshot baseline y migraciones históricas antiguas.

## Comandos de limpieza Docker (manuales)
- `docker compose down --remove-orphans`
- `docker compose down -v --remove-orphans`

## Verificación de puerto DB local
- Comando:
  - `lsof -nP -iTCP:5432 -sTCP:LISTEN`
- Si hay conflicto:
  - Solución A: usar el puerto por defecto endurecido del repo, `5434`
  - Actualizar `DATABASE_URL`, `DIRECT_URL` y `SHADOW_DATABASE_URL` a `5434`
  - Ejemplo: `postgresql://postgres:postgres@localhost:5434/starmedical?schema=public`
  - Si usas `docker compose local`, puedes sobreescribirlo con `DB_PORT=5434`

## Troubleshooting rápido
- Error `P1001` (DB no reachable):
  - No corras migraciones manuales antes del readiness.
  - Usa `npm run db:wait` y luego `npm run db:migrate:deploy`.
- Contenedores huérfanos/orphans:
  - `docker compose down --remove-orphans`
  - Si persiste: `docker compose down -v --remove-orphans` y luego `npm run db:reset`
- Diagnóstico de DB:
  - `docker compose ps`
  - `docker logs --tail 120 starmedical-db`

## Qué NO hacer
- No ejecutar `prisma migrate deploy` antes de que Postgres esté listo.
- No pegar líneas con `#` en terminal como si fueran comando (en `zsh` puede romper el pegado/ejecución).

## Política de tests
- Baseline diario (obligatorio): `npm test` (alias detallado: `npm run test:baseline`).
- Legacy/integration (manual): `npm run test:legacy` (muestra estado y razón de skip).
- Ejecución real de legacy para diagnóstico: `npm run test:legacy:run`.
- Suite legacy actual: `tests/memberships.db.test.ts` (depende de runtime/schema legacy).
- Ticket de seguimiento: `TEST-LEGACY-001`.
- En CI se ejecuta baseline (`lint`, `typecheck`, `test:baseline`), no `test:legacy`.

## Estabilidad: 5 comandos (release checklist)
1. `npm install`
2. `npm run db:reset`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run build && npm test`

Esperado: todos en `PASS`, con `test:legacy` fuera del gate principal.

## Legacy: estado actual y reactivación
- Baseline que sí bloquea releases: `npm test` / `npm run test:baseline`.
- Legacy aislado: `npm run test:legacy` (skip esperado por defecto).
- Legacy real bajo demanda: `npm run test:legacy:run` (activa `RUN_LEGACY_TESTS=1`).
- Causa conocida del fallo legacy real hoy: dependencia en `createPlanCategory` y desalineación de schema/runtime respecto al estado actual.

### Plan corto para reactivar `memberships.db.test.ts` (3 pasos)
1. Alinear helpers legacy con el schema actual (eliminar dependencia obsoleta en `createPlanCategory`).
2. Crear harness estable de integración (fixtures deterministas + setup/teardown aislado por suite).
3. Retirar `@ts-nocheck` de `tests/memberships.db.test.ts` y cerrar deuda de tipos.

Ticket técnico abierto: `TECHDEBT-TS-001` (quitar `@ts-nocheck` en `tests/memberships.db.test.ts`).
