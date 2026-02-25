import assert from "node:assert/strict";
import test from "node:test";
import { buildIdentityDocumentOptionsByCountry } from "@/lib/clients/identityDocuments";

test("GT solo permite DPI y Pasaporte", () => {
  const options = buildIdentityDocumentOptionsByCountry(
    [
      { id: "doc-dpi", name: "DPI", isActive: true },
      { id: "doc-pass", name: "Pasaporte", isActive: true },
      { id: "doc-curp", name: "CURP", isActive: true }
    ],
    "GT"
  );

  const codes = new Set(options.map((item) => item.code));
  assert.equal(codes.has("DPI"), true);
  assert.equal(codes.has("PASSPORT"), true);
  assert.equal(codes.has("CURP"), false);
});

test("US incluye SSN como sensible y opcional", () => {
  const options = buildIdentityDocumentOptionsByCountry([{ id: "doc-pass", name: "Passport", isActive: true }], "US");
  const ssn = options.find((item) => item.code === "SSN");

  assert.ok(ssn);
  assert.equal(ssn?.sensitive, true);
  assert.equal(ssn?.optional, true);
});

test("cuando no hay catálogo devuelve fallback Passport + Documento nacional", () => {
  const options = buildIdentityDocumentOptionsByCountry([], "AR");
  const codes = new Set(options.map((item) => item.code));

  assert.equal(codes.has("PASSPORT"), true);
  assert.equal(codes.has("NATIONAL_ID"), true);
});
