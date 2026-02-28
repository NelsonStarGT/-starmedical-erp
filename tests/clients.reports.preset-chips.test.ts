import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveClientsReportsDatePresetFromRange,
  resolveClientsReportsDatePresetRange
} from "@/lib/clients/reports/datePresets";

test("preset chips resuelven from/to correcto para rangos estándar", () => {
  const base = new Date("2026-02-28T10:00:00.000Z");

  const twelve = resolveClientsReportsDatePresetRange("last_12_months", base);
  assert.equal(
    resolveClientsReportsDatePresetFromRange({ from: twelve.from, to: twelve.to }, base),
    "last_12_months"
  );

  const year = resolveClientsReportsDatePresetRange("year_to_date", base);
  assert.equal(
    resolveClientsReportsDatePresetFromRange({ from: year.from, to: year.to }, base),
    "year_to_date"
  );
});

test("preset chips detectan modo personalizado cuando from/to no coincide", () => {
  const base = new Date("2026-02-28T10:00:00.000Z");
  const preset = resolveClientsReportsDatePresetFromRange(
    { from: "2025-02-01", to: "2026-02-15" },
    base
  );
  assert.equal(preset, null);
});
