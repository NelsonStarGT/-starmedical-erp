#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

APP_PORT="${APP_PORT:-3000}"
OPS_TOKEN="${OPS_HEALTH_TOKEN:-ops-health-local-token}"
VERIFY_ENDPOINTS="${OPS_VERIFY_ENDPOINTS:-1}"
OPS_TYPECHECK_CMD="${OPS_TYPECHECK_CMD:-npx tsc --noEmit -p tsconfig.ops.json}"

log() {
  printf '[ops-verify] %s\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[ops-verify] ERROR: comando requerido no encontrado: %s\n' "$1" >&2
    exit 1
  fi
}

check_http_code() {
  local label="$1"
  local url="$2"
  local code

  code="$(curl -sS --max-time 12 -o /tmp/ops_verify_response.json -w "%{http_code}" -H "Authorization: Bearer ${OPS_TOKEN}" "$url" || true)"

  case "$code" in
    200|503)
      log "${label}: HTTP ${code} OK"
      ;;
    *)
      printf '[ops-verify] ERROR: %s devolvió HTTP %s (%s)\n' "$label" "$code" "$url" >&2
      if [[ -s /tmp/ops_verify_response.json ]]; then
        printf '[ops-verify] body: %s\n' "$(cat /tmp/ops_verify_response.json)" >&2
      fi
      exit 1
      ;;
  esac
}

require_cmd docker
require_cmd npm
require_cmd curl

log "docker compose config"
docker compose -f docker-compose.local.yml config >/tmp/ops_compose_config.yml

log "typecheck OPS"
bash -lc "$OPS_TYPECHECK_CMD"

log "tests OPS"
npx tsx --test tests/ops*.test.ts tests/ops.*.test.ts

if [[ "$VERIFY_ENDPOINTS" == "1" ]]; then
  log "endpoints internos (health/metrics)"
  check_http_code "internal health" "http://localhost:${APP_PORT}/api/internal/ops/health"
  check_http_code "internal metrics" "http://localhost:${APP_PORT}/api/internal/ops/metrics?range=5m"
else
  log "endpoints internos omitidos (OPS_VERIFY_ENDPOINTS=${VERIFY_ENDPOINTS})"
fi

log "OK: verificación OPS completada"
