import assert from "node:assert/strict";
import test from "node:test";
import {
  assertStrictLocalPhoneValue,
  assertStrictPhoneValue,
  buildE164,
  sanitizeLocalNumber,
  sanitizePhoneInputValue
} from "@/lib/clients/phoneValidation";

test("sanitizePhoneInputValue conserva dígitos y + inicial", () => {
  assert.equal(sanitizePhoneInputValue("+502 55-11-22aa"), "+502551122");
  assert.equal(sanitizePhoneInputValue("55 11 22"), "551122");
  assert.equal(sanitizePhoneInputValue("abc"), "");
});

test("assertStrictPhoneValue rechaza letras y + mal posicionado", () => {
  assert.throws(() => assertStrictPhoneValue("55A11"), /Solo se permiten números/);
  assert.throws(() => assertStrictPhoneValue("55+11"), /solo puede ir al inicio/);
});

test("assertStrictPhoneValue acepta números y + inicial", () => {
  assert.equal(assertStrictPhoneValue("+50255112233"), "+50255112233");
  assert.equal(assertStrictPhoneValue("55112233"), "55112233");
});

test("sanitizeLocalNumber conserva solo dígitos locales", () => {
  assert.equal(sanitizeLocalNumber("55 11-22+33"), "55112233");
  assert.equal(sanitizeLocalNumber("abc"), "");
});

test("buildE164 deriva +prefijo + local", () => {
  assert.equal(buildE164("+502", "55112233"), "+50255112233");
  assert.equal(buildE164("502", "55-11 22 33"), "+50255112233");
  assert.equal(buildE164("", "55112233"), null);
});

test("assertStrictLocalPhoneValue rechaza símbolos y +", () => {
  assert.equal(assertStrictLocalPhoneValue("55112233"), "55112233");
  assert.throws(() => assertStrictLocalPhoneValue("+5025511"), /Solo se permiten dígitos/);
  assert.throws(() => assertStrictLocalPhoneValue("55A11"), /Solo se permiten dígitos/);
});
