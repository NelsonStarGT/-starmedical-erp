#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

printf '\n[check-tenant-scope] Validando tenant/branch scope en superficies críticas...\n'

node --input-type=module <<'NODE'
import fs from "node:fs";
import path from "node:path";

const filesToScan = [
  "app/api/admin/companies/route.ts",
  "app/api/admin/companies/[id]/route.ts",
  "app/api/admin/clientes/diagnostics/export/route.ts",
  "app/api/admin/clientes/diagnostics/resolve/route.ts",
  "app/api/admin/clientes/import/csv/route.ts",
  "app/api/reception/service-requests/route.ts",
  "app/api/reception/service-requests/[id]/route.ts",
  "app/admin/clientes/[id]/page.tsx",
  "app/admin/reception/visit/[visitId]/page.tsx",
  "app/admin/reception/actions.ts",
  "lib/companies/repositories/company.repo.ts",
  "lib/clients/commercialList.service.ts"
];

const scopedModels = new Set([
  "clientProfile",
  "company",
  "systemEventLog",
  "visit",
  "serviceRequest"
]);

const allowlist = [
  // Intencional: consulta de catálogos globales y reads no tenant-aware por diseño.
  { file: "app/admin/clientes/[id]/page.tsx", line: 384 },
  { file: "app/admin/clientes/[id]/page.tsx", line: 389 },
  { file: "app/admin/clientes/[id]/page.tsx", line: 394 },
  // where object incluye tenantId en construcción previa (línea 206).
  { file: "lib/clients/commercialList.service.ts", line: 214 }
];

const allowKey = new Set(allowlist.map((entry) => `${entry.file}:${entry.line}`));

const queryRegex = /prisma\.(\w+)\.(findMany|findUnique|findFirst|groupBy|count|update|updateMany|delete|deleteMany|upsert|create|createMany)\s*\(/g;
const tenantSignalRegex = /\btenantId\b|patient\s*:\s*\{\s*tenantId|visit\s*:\s*\{\s*patient\s*:\s*\{\s*tenantId|\bbranchId\b|\bsiteId\b|tenant-scope:allow/s;

const violations = [];

for (const relFile of filesToScan) {
  const absFile = path.join(process.cwd(), relFile);
  if (!fs.existsSync(absFile)) continue;

  const content = fs.readFileSync(absFile, "utf8");

  for (const match of content.matchAll(queryRegex)) {
    const model = match[1] ?? "";
    if (!scopedModels.has(model)) continue;

    const start = match.index ?? 0;
    const line = content.slice(0, start).split("\n").length;
    const key = `${relFile}:${line}`;
    if (allowKey.has(key)) continue;

    const snippet = content.slice(start, Math.min(content.length, start + 1500));
    if (tenantSignalRegex.test(snippet)) continue;

    const firstLine = snippet.split("\n")[0]?.trim() ?? "query";
    violations.push({ file: relFile, line, query: firstLine, model });
  }
}

if (violations.length > 0) {
  console.error("ERROR: Se detectaron queries potencialmente sin tenant/branch scope.");
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line} [${v.model}] ${v.query}`);
  }
  process.exit(1);
}

console.log("OK: guardrail tenant/branch scope sin hallazgos en superficies críticas.");
NODE
