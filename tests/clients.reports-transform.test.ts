import test from "node:test";
import assert from "node:assert/strict";
import { mapGeoBucketRows, summarizeInsurerLines } from "@/lib/clients/reports.service";

test("mapGeoBucketRows separa source catalog/manual y aplica fallback label", () => {
  const rows = mapGeoBucketRows([
    { label: "Guatemala", source: "catalog", total: 10 },
    { label: null, source: "manual", total: 3n },
    { label: "  ", source: "unexpected", total: 1 }
  ]);

  assert.deepEqual(rows, [
    { label: "Guatemala", source: "catalog", total: 10 },
    { label: "Manual entry", source: "manual", total: 3 },
    { label: "Manual entry", source: "manual", total: 1 }
  ]);
});

test("summarizeInsurerLines agrupa por ramo y manual entry", () => {
  const lineMap = new Map<string, string>([
    ["medico", "Médico / Gastos médicos"],
    ["vida", "Vida"]
  ]);

  const summary = summarizeInsurerLines(
    [
      { insurerLinePrimaryCode: "medico" },
      { insurerLinePrimaryCode: "vida" },
      { insurerLinePrimaryCode: "vida" },
      { insurerLinePrimaryCode: "legacy-line" },
      null,
      {}
    ],
    lineMap
  );

  assert.deepEqual(summary, [
    { line: "Vida", total: 2 },
    { line: "Sin ramo", total: 2 },
    { line: "Médico / Gastos médicos", total: 1 },
    { line: "Manual entry (legacy-line)", total: 1 }
  ]);
});
