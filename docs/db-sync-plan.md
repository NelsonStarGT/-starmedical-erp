## DB Sync Plan (Supabase ➜ prisma/schema.prisma)

- **Source of truth:** `prisma/schema.prisma` + migrations in `prisma/migrations`.
- **Target:** Supabase Postgres (`DATABASE_URL`), `public` schema only.
- **Safety rails:** Do not touch `auth.*`, `storage.*`, `realtime.*`, `extensions.*`, `supabase_functions.*`, `supabase_migrations.*`, or drop `_prisma_migrations`.

### Applied steps
1) Backup  
   - `mkdir -p backups`  
   - `ts=$(date +"%Y%m%d_%H%M"); file="./backups/supabase_${ts}.sql"; set -a; source .env; /usr/local/opt/libpq/bin/pg_dump --schema=public --no-owner --format=plain --file="$file" "$DATABASE_URL"`
2) Normalize migration metadata (one-time to align legacy history)  
   - Ensure placeholder migrations exist for legacy names (00000000000000_baseline_init, 20260109115921_memberships_module, 20260309120000_hr_rrhh_module, 20260312120000_attendance_biometric, 20260313130000_payroll_module, 20260315123000_permissions_matrix, 20260318120000_hr_onboarding, 20260318180000_attendance_close_flow, 20260318200000_hr_onboarding_nullable, 20260319120000_compensation_bonus, 20260322120000_warning_attachments, 20260323120000_disciplinary_termination, 20260323123000_hr_settings).  
   - Update `_prisma_migrations.checksum` to match filesystem (SQL updates already executed).
3) Drift-fix migration application  
   - SQL generated via `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > /tmp/drift.sql`.  
   - Applied with `set -a; source .env; /usr/local/opt/libpq/bin/psql "$DATABASE_URL" -f prisma/migrations/20260409_sync_supabase_drift/migration.sql`.
4) Register migrations without re-running SQL  
   - `set -a; source .env; npx prisma migrate resolve --applied 20260402120000_hr_attendance_module`  
   - Repeat for `20260403120000_attendance_punch_config`, `20260404120000_attendance_shift_engine`, `20260405120000_attendance_assignments`, `20260407_attendance_manual_module`, `20260408_biometric_raw_pipeline`, `20260409_sync_supabase_drift`.
5) Validation  
   - `set -a; source .env; npx prisma migrate status` (expected: “Database schema is up to date!”)  
   - `set -a; source .env; npx prisma validate`

### Post-checks to keep running
- DB sanity: verify new attendance tables exist and are empty/consistent (`select count(*) from "AttendanceRawEvent";` etc.), ensure unique index `HrEmployee_biometricId_key` present.
- App smoke (when API is available): RRHH asistencia list, import raw, process raw, marcaje status/raw list, uploads/logo paths.
- Constraints: spot-check FK integrity on new attendance tables; confirm `HrSettings` new columns present with defaults.

### Notes
- Drift-fix adds only app-managed public objects; no Supabase system schema touched.  
- Future deploys can use `prisma migrate deploy`; history now matches repo (54 migrations).  
- If re-running on another environment, regenerate drift diff vs that DB to avoid applying deltas blindly.
