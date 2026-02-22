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

## Verificación de puerto 5432
- Comando:
  - `lsof -nP -iTCP:5432 -sTCP:LISTEN`
- Si hay conflicto:
  - Solución A: cambiar `docker-compose.yml` a `5433:5432`
  - Actualizar `DATABASE_URL` a puerto `5433`
  - Ejemplo: `postgresql://postgres:postgres@localhost:5433/starmedical?schema=public`

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
