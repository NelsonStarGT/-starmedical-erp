#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

printf '\n[check-no-legacy-recepcion] Verificando alias /admin/recepcion...\n'

if rg -n "(^|\s)(\"use client\"|'use client')(;|$)" app/admin/recepcion >/tmp/check_legacy_recepcion_use_client.txt 2>/dev/null; then
  echo "ERROR: Se detectó 'use client' dentro de app/admin/recepcion"
  cat /tmp/check_legacy_recepcion_use_client.txt
  exit 1
fi

legacy_hits="$(rg -n "/admin/recepcion" app components lib tests docs proxy.ts || true)"

if [ -z "$legacy_hits" ]; then
  echo "OK: No hay referencias a /admin/recepcion"
  exit 0
fi

disallowed=()
while IFS= read -r hit; do
  [ -z "$hit" ] && continue
  case "$hit" in
    proxy.ts:*) ;;
    lib/reception/alias.ts:*) ;;
    app/admin/recepcion/*) ;;
    tests/proxy.recepcion-redirect.test.ts:*) ;;
    tests/reception.alias-map.test.ts:*) ;;
    tests/recepcion.routes.test.ts:*) ;;
    docs/*) ;;
    *) disallowed+=("$hit") ;;
  esac
done <<EOF_HITS
$legacy_hits
EOF_HITS

if [ "${#disallowed[@]}" -gt 0 ]; then
  echo "ERROR: Referencias legacy no permitidas a /admin/recepcion:"
  printf '%s\n' "${disallowed[@]}"
  exit 1
fi

echo "OK: Referencias legacy dentro de allowlist."
