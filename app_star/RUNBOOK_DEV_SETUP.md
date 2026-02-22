# Runbook de setup (dev/staging)

## Variables requeridas
- `DATABASE_URL`: cadena completa a Postgres (Supabase: usar puerto writer, no pooler para migraciones).
- `DIRECT_URL` (opcional): URL directa sin pooler para migraciones/seed si usas pooler para `DATABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` si el proyecto las necesita ya configuradas.

## Setup rápido (dev local)
1. Instalar dependencias: `npm install`
2. Preparar DB y datos mínimos:  
   `npm run dev:setup`
   - Ejecuta `prisma generate`
   - Aplica migraciones con `prisma migrate deploy` (no resetea)
   - Corre seeds idempotentes (RRHH, RBAC, catálogos básicos)
3. Levantar la app: `npm run dev`

## Seeds
- Ejecutar manualmente: `npm run db:seed`
- Idempotentes: se pueden correr varias veces sin duplicar (usa `upsert`/`createMany` con `skipDuplicates` donde aplica).
- No usa reset; conserva datos existentes.

## Reset explícito (solo dev local)
- `npm run dev:reset`  
  Internamente corre `prisma migrate reset --force` y luego `npm run db:seed`. Bloqueado si `NODE_ENV=production`.

## Staging / entornos compartidos
- **No usar reset.**  
  Ejecutar solo:
  ```
  npm run db:generate
  npm run db:migrate:deploy
  npm run db:seed
  ```
  Asegura apuntar al writer (no pooler) para migraciones.

## Verificación rápida
- `npm run qa` (lint + typecheck + tests)
- UI: `/hr`, `/hr/employees`, `/hr/employees/pending`
- Quick-create → aparece en pendientes → wizard → aparece en activos.

## Troubleshooting
- Pooler/DB offline: revisa `DATABASE_URL`; para Supabase usa el writer en migraciones y `DIRECT_URL` si necesitas saltar el pooler.
- Migraciones con drift: `npm run db:check` (validate + migrate status); no usar `prisma migrate dev` en prod/pooler.
