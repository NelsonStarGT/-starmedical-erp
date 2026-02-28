import test from "node:test";
import assert from "node:assert/strict";
import {
  AMERICAS_SUBREGION_OPTIONS,
  MAP_REGION_OPTIONS,
  buildAllowedIso2Set,
  isIso2AllowedByRegionFilters,
  resolveIso2FromMapCountryName,
  resolveAmericasSubregion,
  resolveCountryRegion
} from "@/lib/clients/reports/countryRegions";

test("countryRegions resuelve continente base para países comunes", () => {
  assert.equal(resolveCountryRegion("GT"), "AMERICAS");
  assert.equal(resolveCountryRegion("US"), "AMERICAS");
  assert.equal(resolveCountryRegion("FR"), "EUROPE");
  assert.equal(resolveCountryRegion("EG"), "AFRICA");
  assert.equal(resolveCountryRegion("JP"), "ASIA");
  assert.equal(resolveCountryRegion("AU"), "OCEANIA");
});

test("countryRegions resuelve subregión en América", () => {
  assert.equal(resolveAmericasSubregion("US"), "NORTH_AMERICA");
  assert.equal(resolveAmericasSubregion("GT"), "CENTRAL_AMERICA");
  assert.equal(resolveAmericasSubregion("CO"), "SOUTH_AMERICA");
});

test("isIso2AllowedByRegionFilters aplica región + subregión", () => {
  const regionSet = new Set(["AMERICAS"] as const);
  const subregionSet = new Set(["CENTRAL_AMERICA"] as const);
  assert.equal(
    isIso2AllowedByRegionFilters({
      iso2: "GT",
      selectedRegions: regionSet,
      selectedAmericasSubregions: subregionSet
    }),
    true
  );
  assert.equal(
    isIso2AllowedByRegionFilters({
      iso2: "US",
      selectedRegions: regionSet,
      selectedAmericasSubregions: subregionSet
    }),
    false
  );
  assert.equal(
    isIso2AllowedByRegionFilters({
      iso2: "FR",
      selectedRegions: regionSet,
      selectedAmericasSubregions: subregionSet
    }),
    false
  );

  const allRegions = new Set(MAP_REGION_OPTIONS.map((item) => item.key));
  const allAmericasSubregions = new Set(AMERICAS_SUBREGION_OPTIONS.map((item) => item.key));
  assert.equal(
    isIso2AllowedByRegionFilters({
      iso2: "FR",
      selectedRegions: allRegions,
      selectedAmericasSubregions: allAmericasSubregions
    }),
    true
  );
});

test("resolveIso2FromMapCountryName mapea nombres del topojson a ISO2", () => {
  assert.equal(resolveIso2FromMapCountryName("Guatemala"), "GT");
  assert.equal(resolveIso2FromMapCountryName("United States of America"), "US");
  assert.equal(resolveIso2FromMapCountryName("Dominican Rep."), "DO");
  assert.equal(resolveIso2FromMapCountryName("Côte d'Ivoire"), "CI");
});

test("buildAllowedIso2Set filtra Centroamérica y permite modo sin selección", () => {
  const centralAmericaOnly = buildAllowedIso2Set({
    selectedRegions: new Set(["AMERICAS"]),
    selectedAmericasSubregions: new Set(["CENTRAL_AMERICA"])
  });

  assert.ok(centralAmericaOnly);
  assert.equal(centralAmericaOnly?.has("GT"), true);
  assert.equal(centralAmericaOnly?.has("SV"), true);
  assert.equal(centralAmericaOnly?.has("US"), false);
  assert.equal(centralAmericaOnly?.has("FR"), false);

  const noSelection = buildAllowedIso2Set({
    selectedRegions: new Set(),
    selectedAmericasSubregions: new Set()
  });
  assert.equal(noSelection, null);
});
