#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${NODE_ENV:-}" == "production" ]]; then
  echo "ERROR: db-reset is blocked in production."
  exit 1
fi

echo "Resetting dockerized database..."
echo "CMD: docker compose down -v --remove-orphans"
docker compose down -v --remove-orphans

echo "CMD: docker compose up -d --remove-orphans"
docker compose up -d --remove-orphans

echo "CMD: ./scripts/dev/db-wait.sh"
bash ./scripts/dev/db-wait.sh

echo "CMD: npx prisma migrate deploy"
npx prisma migrate deploy

has_seed=0
if [[ -f "prisma/seed.ts" ]]; then
  has_seed=1
fi

if node -e 'const p=require("./package.json");process.exit(p?.scripts?.["db:seed"]?0:1)' >/dev/null 2>&1; then
  has_seed=1
fi

if [[ "${has_seed}" -eq 1 ]]; then
  echo "CMD: npx prisma db seed"
  npx prisma db seed
else
  echo "No seed detected. Skipping seed step."
fi

echo "Database reset completed."
