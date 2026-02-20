#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

TMP_A="$(mktemp /tmp/ops_tenant_a.XXXXXX.yml)"
TMP_B="$(mktemp /tmp/ops_tenant_b.XXXXXX.yml)"
trap 'rm -f "$TMP_A" "$TMP_B" /tmp/ops_tenant_a_ports.txt /tmp/ops_tenant_b_ports.txt' EXIT

log() {
  printf '[ops-tenant] %s\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[ops-tenant] ERROR: comando requerido no encontrado: %s\n' "$1" >&2
    exit 1
  fi
}

extract_ports() {
  local file="$1"
  awk '/published:/ {gsub(/"/,"",$2); print $2}' "$file" | sort -n | uniq
}

require_cmd docker
require_cmd awk
require_cmd comm

log "render compose tenant_a"
TENANT_ID=tenant_a \
APP_PORT=3100 \
DB_PORT=55432 \
MINIO_PORT=9100 \
MINIO_CONSOLE_PORT=9101 \
MAILPIT_UI_PORT=8125 \
MAILPIT_SMTP_PORT=1125 \
docker compose -f docker-compose.local.yml config >"$TMP_A"

log "render compose tenant_b"
TENANT_ID=tenant_b \
APP_PORT=3200 \
DB_PORT=56432 \
MINIO_PORT=9200 \
MINIO_CONSOLE_PORT=9201 \
MAILPIT_UI_PORT=8225 \
MAILPIT_SMTP_PORT=1225 \
docker compose -f docker-compose.local.yml config >"$TMP_B"

if ! grep -q '^name: starmedical-tenant_a$' "$TMP_A"; then
  printf '[ops-tenant] ERROR: tenant_a no renderizó project name esperado\n' >&2
  exit 1
fi

if ! grep -q '^name: starmedical-tenant_b$' "$TMP_B"; then
  printf '[ops-tenant] ERROR: tenant_b no renderizó project name esperado\n' >&2
  exit 1
fi

extract_ports "$TMP_A" >/tmp/ops_tenant_a_ports.txt
extract_ports "$TMP_B" >/tmp/ops_tenant_b_ports.txt

COLLISIONS="$(comm -12 /tmp/ops_tenant_a_ports.txt /tmp/ops_tenant_b_ports.txt || true)"
if [[ -n "$COLLISIONS" ]]; then
  printf '[ops-tenant] ERROR: colisión de puertos detectada:\n%s\n' "$COLLISIONS" >&2
  exit 1
fi

log "tenant_a ports: $(paste -sd, /tmp/ops_tenant_a_ports.txt)"
log "tenant_b ports: $(paste -sd, /tmp/ops_tenant_b_ports.txt)"
log "OK: compose tenant-per-stack sin colisiones de puertos publicados"
