import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CLIENTS_REPORTS_DEFAULT_RANGE_PRESET,
  CLIENTS_REPORTS_RANGE_DROPDOWN_OPTIONS,
  resolveClientsReportsRangePresetToggle
} from "@/lib/clients/reports/datePresets";

test("rango dropdown incluye presets esperados sin duplicados", () => {
  const keys = CLIENTS_REPORTS_RANGE_DROPDOWN_OPTIONS.map((option) => option.key);
  const uniqueKeys = new Set(keys);

  assert.equal(keys.length, uniqueKeys.size);
  assert.equal(keys.includes("today"), true);
  assert.equal(keys.includes("last_30_days"), true);
  assert.equal(keys.includes("month_to_date"), true);
  assert.equal(keys.includes("year_to_date"), true);
  assert.equal(keys.includes("previous_year"), true);
});

test("toggle de preset activo vuelve al default de 30 días", () => {
  const toggled = resolveClientsReportsRangePresetToggle("last_12_months", "last_12_months");
  assert.equal(toggled, CLIENTS_REPORTS_DEFAULT_RANGE_PRESET);

  const switched = resolveClientsReportsRangePresetToggle("last_12_months", "year_to_date");
  assert.equal(switched, "year_to_date");
});

test("form de filtros usa un solo control de rango y elimina fila legacy duplicada", () => {
  const sourcePath = path.join(
    process.cwd(),
    "components/clients/reports/ClientsReportsFiltersForm.tsx"
  );
  const source = readFileSync(sourcePath, "utf8");

  const rangeLabelMatches = (source.match(/label=\"Rango\"/g) || []).length;
  assert.equal(rangeLabelMatches, 1);
  assert.equal(source.includes("CLIENTS_REPORTS_DATE_PRESETS.map"), false);
});
