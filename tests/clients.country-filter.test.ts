import test from "node:test";
import assert from "node:assert/strict";
import { buildClientCountryFilterWhere, normalizeClientsCountryFilterInput } from "@/lib/clients/countryFilter.server";

test("filtro GT conserva countryId y ALL desactiva filtro", () => {
  assert.equal(normalizeClientsCountryFilterInput("country-gt"), "country-gt");
  assert.equal(normalizeClientsCountryFilterInput(""), null);
  assert.equal(normalizeClientsCountryFilterInput("ALL"), null);
  assert.equal(normalizeClientsCountryFilterInput(" all "), null);
});

test("country filter aplica ubicación principal: GT filtra, ALL devuelve todo", () => {
  assert.deepEqual(buildClientCountryFilterWhere("country-gt"), {
    clientLocations: {
      some: {
        isActive: true,
        isPrimary: true,
        geoCountryId: "country-gt"
      }
    }
  });
  assert.deepEqual(buildClientCountryFilterWhere(null), {});
  assert.deepEqual(buildClientCountryFilterWhere(normalizeClientsCountryFilterInput("ALL")), {});
  assert.deepEqual(buildClientCountryFilterWhere("country-us"), {
    clientLocations: {
      some: {
        isActive: true,
        isPrimary: true,
        geoCountryId: "country-us"
      }
    }
  });
});
