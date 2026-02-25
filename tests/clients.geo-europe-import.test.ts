import test from "node:test";
import assert from "node:assert/strict";
import { EUROPE_TARGET_ISO2 } from "@/scripts/geo/import-europe";

test("EUROPE_TARGET_ISO2 incluye cobertura base y no contiene duplicados", () => {
  const unique = new Set<string>(EUROPE_TARGET_ISO2);
  assert.equal(unique.size, EUROPE_TARGET_ISO2.length);
  assert.equal(EUROPE_TARGET_ISO2.length >= 40, true);

  for (const iso2 of ["ES", "FR", "DE", "IT", "PT", "GB", "PL", "RO", "UA", "NL"]) {
    assert.equal(unique.has(iso2), true);
  }
});
