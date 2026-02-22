# Runbook de migraciones (staging/prod, no destructivo)

## Alcance
- Este runbook NO resetea datos.
- Aplica para alinear ambientes donde puede existir drift entre `prisma_migrations` y el schema real.

## 1) Diagnóstico (solo lectura)
1. Ver estado de migraciones:
   - `npx prisma migrate status`
2. Ver historial en base:
   - `psql "$DATABASE_URL" -c "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY finished_at NULLS LAST, migration_name;"`
3. Ver diff schema vs migraciones:
   - `npx prisma migrate diff --from-url "$DATABASE_URL" --to-migrations prisma/migrations --shadow-database-url "$SHADOW_DATABASE_URL"`

## 2) Backup obligatorio antes de tocar migraciones
1. Backup lógico:
   - `pg_dump "$DATABASE_URL" -Fc -f "backup_$(date +%Y%m%d_%H%M%S).dump"`
2. Verificación rápida de backup:
   - `pg_restore -l backup_YYYYMMDD_HHMMSS.dump | head`

## 3) Estrategia A (recomendada): marcar baseline como aplicada
Usar cuando el schema ya contiene objetos del baseline y solo falta alinear historial.

1. Confirmar nombre baseline:
   - `ls prisma/migrations | sort | head`
2. Marcar baseline como aplicada (sin ejecutar SQL):
   - `npx prisma migrate resolve --applied 20260126230520_baseline`
3. Aplicar pendientes:
   - `npx prisma migrate deploy`
4. Verificar:
   - `npx prisma migrate status`

## 4) Estrategia B: migración puente (bridge)
Usar cuando hay diferencias reales de schema (columnas/índices/tipos faltantes o sobrantes) y no basta con `resolve`.

1. Crear branch de hardening:
   - `git checkout -b codex/bridge-migration-<fecha>`
2. Diseñar SQL puente no destructivo (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.).
3. Generar carpeta de migración puente y validar en staging clonado.
4. Deploy controlado:
   - `npx prisma migrate deploy`
5. Verificar queries críticas/health checks.

## 5) Rollback
Si algo falla:
1. Parar despliegue de app.
2. Restaurar backup:
   - `pg_restore -d "$DATABASE_URL" --clean --if-exists backup_YYYYMMDD_HHMMSS.dump`
3. Revalidar:
   - `npx prisma migrate status`
   - endpoint de salud DB de la app.
