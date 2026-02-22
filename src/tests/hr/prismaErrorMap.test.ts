import assert from "node:assert/strict";
import test from "node:test";
import { mapPrismaError } from "@/lib/api/http";

test("maps P2002 duplicate errors with fields", () => {
  const result = mapPrismaError({ code: "P2002", meta: { target: ["email", "dpi"] } });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, "Duplicado");
  assert.deepEqual(result.body.details, { fields: ["email", "dpi"] });
});

test("maps P2003 foreign key errors", () => {
  const result = mapPrismaError({ code: "P2003" });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, "Relación inválida");
  assert.equal(result.body.code, "P2003");
});

test("maps P2022 schema mismatch errors", () => {
  const result = mapPrismaError({ code: "P2022" });
  assert.equal(result.status, 500);
  assert.equal(result.body.error, "Schema de DB no coincide");
  assert.equal(result.body.code, "P2022");
});

test("falls back to internal error", () => {
  const result = mapPrismaError(new Error("boom"));
  assert.equal(result.status, 500);
  assert.equal(result.body.error, "Error inesperado");
  assert.equal(result.body.code, "INTERNAL_ERROR");
});
