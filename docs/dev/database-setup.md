# Database setup (DEV)

StarMedical ERP usa PostgreSQL + Prisma Migrate. La mayoría de errores runtime en Recepción (por ejemplo **Prisma P2021** “table does not exist”) provienen de una DB local sin migrar o con drift.

## Setup estándar (DEV)

1) Levantar Postgres (Docker)

`npm run db:up`

2) Aplicar migraciones

`npm run db:migrate:deploy`

3) Generar Prisma Client

`npm run db:generate`

4) Seed (si aplica)

`npm run db:seed`

Atajo (todo lo anterior):

`npm run dev:setup`

## Reset controlado (solo DEV)

Esto borra datos locales (volúmenes Docker) y re-aplica migraciones + seed:

`npm run dev:reset`

## Señales de error comunes

### Prisma P2021 (missing table)

Ejemplo:
- `The table public."QueueItem" does not exist`

Significa:
- La DB no tiene migraciones aplicadas (o falta una migración en `prisma/migrations/`).

Acción:
- `npm run db:migrate:deploy`
- Si tu DB es desechable y hay drift, usar `npm run dev:reset`.

## Qué NO hacer

- No usar `prisma db push` en producción (evita migrations y genera drift).
- Evitar mezclar `db push` y `migrate dev` en el mismo entorno sin un plan (drift casi garantizado).

## Diagnóstico de entorno (opcional)

Para ver en consola qué datasource está usando **Next server + Prisma Client** (enmascarado):

`SM_DB_DIAGNOSTICS=1 npm run dev`

Para Prisma CLI:

`npm run db:check`

## Checklist antes de trabajar Diagnóstico/Lab

- `npm run db:check` (schema + migrate status OK)
- `/admin/reception` carga sin crash
- Tablas críticas existen: `Visit`, `Queue`, `QueueItem`, `VisitEvent`, `ServiceRequest`

