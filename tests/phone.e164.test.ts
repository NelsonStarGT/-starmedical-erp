import assert from "node:assert/strict";
import test from "node:test";
import { detectPhoneCountryFromInput, inferPhoneIso2ByCountryText, normalizePhoneToE164, type PhoneCountryCodeConfig } from "@/lib/phone/normalize";

const CATALOG: PhoneCountryCodeConfig[] = [
  { iso2: "GT", countryName: "Guatemala", dialCode: "+502", minLength: 8, maxLength: 8, isActive: true },
  { iso2: "US", countryName: "United States", dialCode: "+1", minLength: 10, maxLength: 10, isActive: true },
  { iso2: "MX", countryName: "Mexico", dialCode: "+52", minLength: 10, maxLength: 10, isActive: true }
];

test("normaliza local GT con país preferido", () => {
  const normalized = normalizePhoneToE164("5555-1234", CATALOG, { preferredIso2: "GT", required: true });
  assert.equal(normalized?.e164, "+50255551234");
  assert.equal(normalized?.iso2, "GT");
});

test("normaliza +prefijo internacional y autodetecta país", () => {
  const normalized = normalizePhoneToE164("+52 55 1234 5678", CATALOG, { required: true });
  assert.equal(normalized?.e164, "+525512345678");
  assert.equal(normalized?.iso2, "MX");
});

test("rechaza input local sin país seleccionado", () => {
  assert.throws(
    () => normalizePhoneToE164("50255551234", CATALOG, { required: true }),
    /Selecciona país/
  );
});

test("rechaza longitud inválida por país", () => {
  assert.throws(
    () => normalizePhoneToE164("5555", CATALOG, { preferredIso2: "GT", required: true }),
    /inválido/i
  );
});

test("rechaza número sin contexto de país cuando no es autodetectable", () => {
  assert.throws(
    () => normalizePhoneToE164("987654321", CATALOG, { required: true }),
    /Selecciona país|prefijo internacional/i
  );
});

test("detecta país cuando usuario escribe +prefijo", () => {
  const detected = detectPhoneCountryFromInput("+15035551234", CATALOG);
  assert.equal(detected?.iso2, "US");
});

test("infiere ISO2 por nombre de país", () => {
  const iso2 = inferPhoneIso2ByCountryText("Guatemala", CATALOG);
  assert.equal(iso2, "GT");
});
