# Supabase migrations + backfill

- No prod dev-migrations: nunca ejecutes `prisma migrate dev` contra Supabase prod ni contra el pooler de lectura. Usa solo `prisma migrate deploy` o SQL manual revisado.
- Generar migración: en dev usa `prisma migrate dev --create-only --name <cambio>`, revisa el SQL generado y súbelo al repo.
- Antes de aplicar: toma respaldo (dump o snapshot) y valida que el SQL aplica sobre el schema actual.
- Deploy seguro: aplica con `prisma migrate deploy` contra el writer; si hay dudas, pega el SQL manualmente en una sesión aislada.
- Backfill post-migrate: ejecutar `tsx scripts/backfill-isActive.ts --dry-run`; si el conteo es correcto, correr sin `--dry-run`.
- Smoke tests HR: listar `/api/hr/employees` y `/pending`, crear quick-create, completar onboarding, probar suspender/activar/terminar, subir documento, y registrar asistencia manual (debe rechazar onboarding incompleto).
- Drift check: correr `prisma migrate status` (sin reset) para confirmar que no hay desviaciones entre migraciones y la base.
- Listados de activos excluyen códigos `EMP-DEMO*` para evitar ruido de datos demo.
