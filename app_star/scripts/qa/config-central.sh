#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

BASE_URL="${CONFIG_CENTRAL_BASE_URL:-http://localhost:3000}"
COOKIE="${STAR_ERP_COOKIE:-}"
if [[ -z "$COOKIE" && -n "${STAR_ERP_SESSION:-}" ]]; then
  if [[ "$STAR_ERP_SESSION" == star-erp-session=* ]]; then
    COOKIE="$STAR_ERP_SESSION"
  else
    COOKIE="star-erp-session=${STAR_ERP_SESSION}"
  fi
fi

if [[ -n "$COOKIE" && "$COOKIE" != star-erp-session=* ]]; then
  COOKIE="star-erp-session=${COOKIE}"
fi

if [[ -z "$COOKIE" ]]; then
  echo "[FAIL] Debes exportar STAR_ERP_COOKIE='star-erp-session=...' o STAR_ERP_SESSION='...'."
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FAIL] jq no está instalado."
  exit 2
fi

TMP_DIR="$(mktemp -d)"
TEMP_BRANCH_ID=""

cleanup() {
  if [[ -n "$TEMP_BRANCH_ID" ]]; then
    TEMP_BRANCH_ID="$TEMP_BRANCH_ID" node --input-type=module <<'NODE' >/dev/null 2>&1 || true
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const branchId = process.env.TEMP_BRANCH_ID || "";
if (branchId) {
  await prisma.branchFelSeries.deleteMany({
    where: { establishment: { branchId } }
  });
  await prisma.branchSatEstablishment.deleteMany({
    where: { branchId }
  });
  await prisma.branchBusinessHours.deleteMany({
    where: { branchId }
  });
  await prisma.branch.deleteMany({
    where: { id: branchId }
  });
}
await prisma.$disconnect();
NODE
  fi

  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

request_api() {
  local method="$1"
  local path="$2"
  local outfile="$3"
  local body="${4:-}"

  if [[ -n "$body" ]]; then
    curl -sS -o "$outfile" -w "%{http_code}" \
      -X "$method" \
      -H "Cookie: $COOKIE" \
      -H "Content-Type: application/json" \
      --data "$body" \
      "${BASE_URL}${path}"
  else
    curl -sS -o "$outfile" -w "%{http_code}" \
      -X "$method" \
      -H "Cookie: $COOKIE" \
      "${BASE_URL}${path}"
  fi
}

assert_status_and_code() {
  local label="$1"
  local actual_status="$2"
  local expected_status="$3"
  local expected_code="$4"
  local file="$5"

  local actual_code
  actual_code="$(jq -r '.code // empty' "$file")"

  if [[ "$actual_status" != "$expected_status" ]]; then
    echo "[FAIL] ${label}: status esperado=${expected_status}, recibido=${actual_status}"
    cat "$file" | jq
    exit 1
  fi
  if [[ "$actual_code" != "$expected_code" ]]; then
    echo "[FAIL] ${label}: code esperado=${expected_code}, recibido=${actual_code:-<empty>}"
    cat "$file" | jq
    exit 1
  fi

  echo "[OK] ${label}: status=${actual_status}, code=${actual_code}"
}

echo "[STEP] 1/6 Smoke API"
SMOKE_FILE="$TMP_DIR/smoke.json"
SMOKE_STATUS="$(request_api "GET" "/api/admin/config/smoke" "$SMOKE_FILE")"
if [[ "$SMOKE_STATUS" != "200" ]]; then
  echo "[FAIL] /api/admin/config/smoke devolvió HTTP ${SMOKE_STATUS}"
  cat "$SMOKE_FILE" | jq
  exit 1
fi

if [[ "$(jq -r '.ok // false' "$SMOKE_FILE")" != "true" ]]; then
  echo "[FAIL] Smoke API no está OK"
  cat "$SMOKE_FILE" | jq
  exit 1
fi
echo "[OK] Smoke API ready"

echo "[STEP] 2/6 Seed central config"
npm run db:seed:central-config

echo "[STEP] 3/6 Resolver branch PALIN"
BRANCHES_FILE="$TMP_DIR/branches.json"
BRANCHES_STATUS="$(request_api "GET" "/api/admin/config/branches?includeInactive=1" "$BRANCHES_FILE")"
if [[ "$BRANCHES_STATUS" != "200" ]]; then
  echo "[FAIL] /api/admin/config/branches?includeInactive=1 devolvió HTTP ${BRANCHES_STATUS}"
  cat "$BRANCHES_FILE" | jq
  exit 1
fi

PALIN_BRANCH_ID="$(jq -r '.data[]? | select(.code=="PALIN") | .id' "$BRANCHES_FILE" | head -n1)"
if [[ -z "$PALIN_BRANCH_ID" || "$PALIN_BRANCH_ID" == "null" ]]; then
  echo "[FAIL] No se encontró sucursal PALIN."
  cat "$BRANCHES_FILE" | jq
  exit 1
fi
echo "[OK] PALIN branchId=${PALIN_BRANCH_ID}"

NOW_ISO="$(node -e 'console.log(new Date().toISOString())')"
FUTURE_ISO="$(node -e 'const d=new Date(); d.setFullYear(d.getFullYear()+1); console.log(d.toISOString())')"

echo "[STEP] 4/6 Guardrail horario vacío => 422 VALIDATION_ERROR"
EMPTY_FILE="$TMP_DIR/hours-empty.json"
EMPTY_STATUS="$(request_api "POST" "/api/admin/config/branches/${PALIN_BRANCH_ID}/hours" "$EMPTY_FILE" "{\"validFrom\":\"${NOW_ISO}\",\"validTo\":null,\"scheduleJson\":{\"mon\":[],\"tue\":[],\"wed\":[],\"thu\":[],\"fri\":[],\"sat\":[],\"sun\":[]},\"slotMinutesDefault\":30,\"isActive\":true}")"
assert_status_and_code "Horario vacío" "$EMPTY_STATUS" "422" "VALIDATION_ERROR" "$EMPTY_FILE"

echo "[STEP] 5/6 Guardrail solape intradía => 422 VALIDATION_ERROR"
OVERLAP_DAY_FILE="$TMP_DIR/hours-overlap-day.json"
OVERLAP_DAY_STATUS="$(request_api "POST" "/api/admin/config/branches/${PALIN_BRANCH_ID}/hours" "$OVERLAP_DAY_FILE" "{\"validFrom\":\"${NOW_ISO}\",\"validTo\":null,\"scheduleJson\":{\"mon\":[\"08:00-12:00\",\"11:00-13:00\"],\"tue\":[],\"wed\":[],\"thu\":[],\"fri\":[],\"sat\":[],\"sun\":[]},\"slotMinutesDefault\":30,\"isActive\":true}")"
assert_status_and_code "Solape intradía" "$OVERLAP_DAY_STATUS" "422" "VALIDATION_ERROR" "$OVERLAP_DAY_FILE"

echo "[STEP] 6/6 Guardrails de conflicto vigencia + SAT inactiva"
OVERLAP_RANGE_FILE="$TMP_DIR/hours-overlap-range.json"
OVERLAP_RANGE_STATUS="$(request_api "POST" "/api/admin/config/branches/${PALIN_BRANCH_ID}/hours" "$OVERLAP_RANGE_FILE" "{\"validFrom\":\"${NOW_ISO}\",\"validTo\":\"${FUTURE_ISO}\",\"scheduleJson\":{\"mon\":[\"07:00-17:00\"],\"tue\":[\"07:00-17:00\"],\"wed\":[\"07:00-17:00\"],\"thu\":[\"07:00-17:00\"],\"fri\":[\"07:00-17:00\"],\"sat\":[],\"sun\":[]},\"slotMinutesDefault\":30,\"isActive\":true}")"
assert_status_and_code "Solape vigencia activa" "$OVERLAP_RANGE_STATUS" "409" "CONFLICT" "$OVERLAP_RANGE_FILE"

TEMP_CODE="TMPCC$RANDOM$RANDOM"
CREATE_BRANCH_FILE="$TMP_DIR/temp-branch-create.json"
CREATE_BRANCH_STATUS="$(request_api "POST" "/api/admin/config/branches" "$CREATE_BRANCH_FILE" "{\"name\":\"Tmp Config ${TEMP_CODE}\",\"code\":\"${TEMP_CODE}\",\"address\":\"Tmp\",\"phone\":\"0000\",\"timezone\":\"America/Guatemala\",\"isActive\":false}")"
if [[ "$CREATE_BRANCH_STATUS" != "201" ]]; then
  echo "[FAIL] No se pudo crear sucursal temporal inactiva para prueba SAT"
  cat "$CREATE_BRANCH_FILE" | jq
  exit 1
fi
TEMP_BRANCH_ID="$(jq -r '.data.id // empty' "$CREATE_BRANCH_FILE")"
if [[ -z "$TEMP_BRANCH_ID" ]]; then
  echo "[FAIL] No se pudo resolver TEMP_BRANCH_ID."
  cat "$CREATE_BRANCH_FILE" | jq
  exit 1
fi

SAT_FILE="$TMP_DIR/sat-inactive.json"
SAT_STATUS="$(request_api "POST" "/api/admin/config/branches/${TEMP_BRANCH_ID}/establishments" "$SAT_FILE" "{\"satEstablishmentCode\":\"TMP-SAT-${RANDOM}\",\"legalName\":\"Tmp SAT\",\"tradeName\":\"Tmp\",\"address\":\"Tmp direccion\",\"isActive\":true}")"
assert_status_and_code "SAT en sucursal inactiva" "$SAT_STATUS" "422" "VALIDATION_ERROR" "$SAT_FILE"

echo
echo "[PASS] Config Central QA routine completada correctamente."
echo "       Smoke + seed + guardrails: OK"
