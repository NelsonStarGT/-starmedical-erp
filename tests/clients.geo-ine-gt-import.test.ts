import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizeGuatemalaDataset } from "@/scripts/geo/import-ine-gt";

test("normalizeGuatemalaDataset valida conteo GT 22/340", () => {
  const absolutePath = path.join(process.cwd(), "data/geo/gt_departamentos_municipios.json");
  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw);

  const normalized = normalizeGuatemalaDataset(parsed);

  assert.equal(normalized.departmentCount, 22);
  assert.equal(normalized.municipalityCount, 340);

  const first = normalized.departments[0];
  assert.ok(first);
  assert.ok(first.code.length > 0);
  assert.ok(first.name.length > 0);
});
