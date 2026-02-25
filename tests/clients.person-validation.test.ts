import assert from "node:assert/strict";
import test from "node:test";
import { parseOptionalBirthDate } from "@/lib/clients/personValidation";

test("parseOptionalBirthDate permite crear persona sin fecha de nacimiento", () => {
  assert.equal(parseOptionalBirthDate(undefined), null);
  assert.equal(parseOptionalBirthDate(""), null);
});

test("parseOptionalBirthDate valida fecha futura", () => {
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  assert.throws(() => parseOptionalBirthDate(futureDate), /no puede ser futura/i);
});
