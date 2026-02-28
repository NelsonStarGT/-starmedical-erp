import test from "node:test";
import assert from "node:assert/strict";
import { mapGeoBucketRows } from "@/lib/clients/reports.service";
import {
  getFeatureIso2,
  roundCoord,
  normalizeMapCountryName,
  resolveGeoCountryRowByName
} from "@/components/clients/reports/ClientsGeoMapPanel";

test("geo rows preservan countryIso2 para el mapa", () => {
  const rows = mapGeoBucketRows([
    {
      label: "Guatemala",
      source: "catalog",
      total: 12,
      countryId: "country-gt",
      countryIso2: "GT"
    }
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.countryIso2, "GT");
});

test("resolución de país en mapa no falla con alias o vacíos", () => {
  const index = new Map(
    [["united states", {
      label: "United States",
      source: "catalog" as const,
      total: 18,
      countryId: "country-us",
      countryIso2: "US"
    }]]
  );

  assert.equal(normalizeMapCountryName("Guatemala"), "guatemala");
  assert.equal(resolveGeoCountryRowByName("United States of America", index)?.countryId, "country-us");
  assert.equal(resolveGeoCountryRowByName("", index), null);
  assert.equal(resolveGeoCountryRowByName(null, index), null);
});

test("roundCoord produce redondeo determinista para hydration", () => {
  assert.equal(roundCoord(259.4429016477791), 259.4429);
  assert.equal(roundCoord(259.442901647779), 259.4429);
  assert.equal(roundCoord(12.98765, 1), 13);
});

test("getFeatureIso2 prioriza ISO_A2/ADM0_A3/id/name según disponibilidad", () => {
  assert.equal(getFeatureIso2({ properties: { ISO_A2: "GT" } }), "GT");
  assert.equal(getFeatureIso2({ properties: { ADM0_A3: "GTM" } }), "GT");
  assert.equal(getFeatureIso2({ id: "US", properties: {} }), "US");
  assert.equal(getFeatureIso2({ id: "320", properties: { name: "Guatemala" } }), "GT");
});
