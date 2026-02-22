import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidNationalNumber,
  normalizeE164,
  normalizePhoneToE164,
  parseE164,
  sanitizeInput,
  type PhoneCountryCodeConfig
} from "@/lib/phone/normalize";

const CATALOG: PhoneCountryCodeConfig[] = [
  { iso2: "GT", countryName: "Guatemala", dialCode: "+502", minLength: 8, maxLength: 8, isActive: true },
  { iso2: "US", countryName: "United States", dialCode: "+1", minLength: 10, maxLength: 10, isActive: true }
];

test("sanitizeInput limpia formato visual", () => {
  assert.equal(sanitizeInput("+502 5555-1234"), "+50255551234");
  assert.equal(sanitizeInput("(555) 1234"), "5551234");
});

test("parseE164 detecta país y número nacional", () => {
  const parsed = parseE164("+50255551234", CATALOG);
  assert.equal(parsed?.iso2, "GT");
  assert.equal(parsed?.dialCode, "+502");
  assert.equal(parsed?.nationalNumber, "55551234");
});

test("normalizeE164 concatena prefijo + número nacional", () => {
  const e164 = normalizeE164({
    iso2: "GT",
    nationalNumber: "5555-1234",
    catalog: CATALOG
  });
  assert.equal(e164, "+50255551234");
});

test("isValidNationalNumber valida longitud según país", () => {
  assert.equal(isValidNationalNumber("GT", "55551234", CATALOG), true);
  assert.equal(isValidNationalNumber("GT", "5555", CATALOG), false);
});

test("normalizePhoneToE164 exige país para números locales", () => {
  assert.throws(
    () => normalizePhoneToE164("55551234", CATALOG, { required: true }),
    /Selecciona país/
  );
});
