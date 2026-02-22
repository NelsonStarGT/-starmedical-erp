# Prisma / Postgres workflow (DB)

Objetivo: evitar drift entre `prisma/schema.prisma`, `prisma/migrations/**` y la base de datos. El runtime **no debe depender** de “DB ya migrada por casualidad”.

## Regla de oro

- Cambios en `prisma/schema.prisma` **siempre** se entregan con una migración nueva en `prisma/migrations/**`.

## DEV (local)

1) Generar migración (create-only)  
`npx prisma migrate dev --create-only --name <descripcion_corta>`

2) Revisar SQL antes de commitear  
`prisma/migrations/<timestamp>_<name>/migration.sql`

3) Aplicar migraciones a tu DB local  
`npm run db:migrate` (o `npx prisma migrate dev`)

4) Generar Prisma Client  
`npm run db:generate`

## Ambientes compartidos / CI / Producción

- Aplicar migraciones **solamente** con:  
`npm run db:migrate:deploy` (o `npx prisma migrate deploy`)

## Prohibido (salvo prototipos desechables)

- `prisma db push` en producción o ambientes compartidos.
- Mezclar `db push` + `migrate dev` sin un plan: genera drift.

## Scripts estándar

- `npm run db:validate` → valida `schema.prisma`
- `npm run db:migrate:deploy` → aplica migraciones (deploy)
- `npm run db:migrate:status` → estado de migraciones
- `npm run db:migrate:diff` → drift check (DB vs migrations)
- `npm run db:seed:core` → seed operativo mínimo (colas por sede/área)

### Nota sobre `db:migrate:diff`

`prisma migrate diff` necesita shadow DB cuando compara contra `prisma/migrations`.

En DEV puedes usar el mismo DB con otro schema como shadow:

`SHADOW_DATABASE_URL="postgresql://.../starmedical?schema=shadow" npm run db:migrate:diff`

## Señal típica de drift

- **Prisma P2021**: `The table public."QueueItem" does not exist`  
  → migraciones no aplicadas o falta una migración en el repo.

## Health-check interno (DEV)

- Página: `/admin/health/db`  
  Muestra tablas críticas, estado de migraciones, env y `DATABASE_URL` enmascarada.

