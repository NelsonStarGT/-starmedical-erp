#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

SERVICE="${DB_SERVICE:-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-starmedical}"
MAX_ATTEMPTS="${DB_WAIT_MAX_ATTEMPTS:-60}"
SLEEP_SECONDS="${DB_WAIT_SLEEP_SECONDS:-2}"

echo "Waiting for Postgres (service: ${SERVICE}, db: ${DB_NAME}, user: ${DB_USER})..."

container_id="$(docker compose ps -q "${SERVICE}" || true)"
if [[ -z "${container_id}" ]]; then
  echo "ERROR: docker compose service '${SERVICE}' is not running."
  echo "Run: docker compose up -d --remove-orphans"
  docker compose ps || true
  exit 1
fi

container_name="$(docker inspect --format '{{.Name}}' "${container_id}" 2>/dev/null | sed 's#^/##' || true)"
if [[ -z "${container_name}" ]]; then
  container_name="${container_id}"
fi

for attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
  output="$(docker compose exec -T "${SERVICE}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" 2>&1 || true)"
  if [[ "${output}" == *"accepting connections"* ]]; then
    echo "Postgres is ready: ${output}"
    exit 0
  fi

  echo "[${attempt}/${MAX_ATTEMPTS}] not ready yet: ${output}"
  sleep "${SLEEP_SECONDS}"
done

echo "ERROR: Postgres did not become ready after ${MAX_ATTEMPTS} attempts."
echo
echo "docker compose ps:"
docker compose ps || true
echo
echo "docker logs --tail 120 ${container_name}:"
docker logs --tail 120 "${container_name}" || true
exit 1
