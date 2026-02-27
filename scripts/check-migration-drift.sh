#!/usr/bin/env bash
set -euo pipefail

tmp_file="$(mktemp)"
status=0

if ! pnpm prisma migrate status >"$tmp_file" 2>&1; then
  status=$?
fi

output="$(cat "$tmp_file")"
rm -f "$tmp_file"

echo "$output"

# Drift we explicitly block:
# 1) migration exists in DB history but folder is missing locally
# 2) migration checksum/content mismatch after apply
if printf '%s\n' "$output" | rg -qi "not found locally in prisma/migrations|from the database are not found locally|exists in DB but not local|have been modified since they were applied|was modified after it was applied|checksum"; then
  echo "ERROR: migration drift detected (DB/local mismatch or checksum mismatch)." >&2
  exit 1
fi

# If Prisma status failed for another reason (e.g. DB connectivity), do fail.
if [ "$status" -ne 0 ]; then
  echo "ERROR: prisma migrate status failed (non-drift reason)." >&2
  exit "$status"
fi

echo "OK: no migration drift detected."
