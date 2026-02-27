import test from "node:test";
import assert from "node:assert/strict";
import { resolveCurrencyPreferenceSelection } from "@/lib/catalogs/currencies";

test("moneda preferida se agrega automáticamente a aceptadas", () => {
  const result = resolveCurrencyPreferenceSelection({
    preferredCurrencyCode: "usd",
    acceptedCurrencyCodes: ["GTQ", "EUR"]
  });

  assert.equal(result.preferredCurrencyCode, "USD");
  assert.deepEqual(result.acceptedCurrencyCodes, ["USD", "GTQ", "EUR"]);
  assert.equal(result.invalidPreferredCurrencyCode, null);
  assert.deepEqual(result.invalidAcceptedCurrencyCodes, []);
});

test("monedas inválidas se reportan para validación server", () => {
  const result = resolveCurrencyPreferenceSelection({
    preferredCurrencyCode: "ZZZ",
    acceptedCurrencyCodes: ["GTQ", "ABC", "usd"]
  });

  assert.equal(result.preferredCurrencyCode, null);
  assert.equal(result.invalidPreferredCurrencyCode, "ZZZ");
  assert.deepEqual(result.acceptedCurrencyCodes, ["GTQ", "USD"]);
  assert.deepEqual(result.invalidAcceptedCurrencyCodes, ["ABC"]);
});
