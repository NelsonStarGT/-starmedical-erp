import test from "node:test";
import assert from "node:assert/strict";
import { resolveClientsReportsDatePresetRange } from "@/lib/clients/reports/datePresets";

test("presets de fechas generan rangos ISO esperados", () => {
  const base = new Date("2026-02-27T10:30:00.000Z");

  const today = resolveClientsReportsDatePresetRange("today", base);
  assert.equal(today.from, "2026-02-27");
  assert.equal(today.to, "2026-02-27");

  const seven = resolveClientsReportsDatePresetRange("last_7_days", base);
  assert.equal(seven.from, "2026-02-21");
  assert.equal(seven.to, "2026-02-27");

  const thirty = resolveClientsReportsDatePresetRange("last_30_days", base);
  assert.equal(thirty.from, "2026-01-29");
  assert.equal(thirty.to, "2026-02-27");

  const twelveMonths = resolveClientsReportsDatePresetRange("last_12_months", base);
  assert.equal(twelveMonths.from, "2025-02-27");
  assert.equal(twelveMonths.to, "2026-02-27");

  const twentyFourMonths = resolveClientsReportsDatePresetRange("last_24_months", base);
  assert.equal(twentyFourMonths.from, "2024-02-27");
  assert.equal(twentyFourMonths.to, "2026-02-27");

  const thirtySixMonths = resolveClientsReportsDatePresetRange("last_36_months", base);
  assert.equal(thirtySixMonths.from, "2023-02-27");
  assert.equal(thirtySixMonths.to, "2026-02-27");

  const fortyEightMonths = resolveClientsReportsDatePresetRange("last_48_months", base);
  assert.equal(fortyEightMonths.from, "2022-02-27");
  assert.equal(fortyEightMonths.to, "2026-02-27");

  const month = resolveClientsReportsDatePresetRange("month_to_date", base);
  assert.equal(month.from, "2026-02-01");
  assert.equal(month.to, "2026-02-27");

  const year = resolveClientsReportsDatePresetRange("year_to_date", base);
  assert.equal(year.from, "2026-01-01");
  assert.equal(year.to, "2026-02-27");

  const previousYear = resolveClientsReportsDatePresetRange("previous_year", base);
  assert.equal(previousYear.from, "2025-01-01");
  assert.equal(previousYear.to, "2025-12-31");
});
