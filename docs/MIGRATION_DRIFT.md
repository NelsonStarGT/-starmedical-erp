# Migration Drift Log

## Date
- February 27, 2026

## Scope
- Repository: `app_star`
- Branch: `codex/sec/audit-2026-02-24-fixes`
- Database: `starmedical` (`localhost:5432`)

## Incident Summary
- `prisma migrate status` initially reported drift due to a migration present in DB history but missing locally:
  - `20260222174549_memberships_repair_postformat`
- Pending migrations from July 2026 were also not applied yet.

## Root Cause
- DB migration history and repository migration folders diverged.
- The missing folder `prisma/migrations/20260222174549_memberships_repair_postformat/` is not present in local Git history available in this workspace.

## Actions Taken
1. Confirmed missing folder and searched local/remote Git history.
2. Applied pending migrations with `prisma migrate deploy`.
3. Fixed failure in `20260720090000_client_affiliations_pending_verify` caused by enum-value usage in the same transaction:
   - Updated partial unique index predicate from:
     - `status IN ('ACTIVE', 'PENDING_VERIFY')`
   - To:
     - `status <> 'INACTIVE'`
4. Marked failed migration as rolled back and re-applied:
   - `prisma migrate resolve --rolled-back "20260720090000_client_affiliations_pending_verify"`
   - `prisma migrate deploy`
5. Verified status:
   - `prisma migrate status` -> `Database schema is up to date!`

## Guardrail Added
- New command:
  - `pnpm db:drift:check`
- Implementation:
  - `scripts/check-migration-drift.sh`
- Behavior:
  - Runs `prisma migrate status`.
  - Fails if output indicates:
    - DB migration not found locally.
    - Applied migration checksum/content mismatch.
  - Fails on other `migrate status` errors as well.

## Operational Recommendation
- If `20260222174549_memberships_repair_postformat` can be recovered from another clone/backup, restore the exact folder and SQL content to fully reconcile historical lineage in Git.
- Until recovered, keep this incident documented and enforce `pnpm db:drift:check` in CI/preflight.
