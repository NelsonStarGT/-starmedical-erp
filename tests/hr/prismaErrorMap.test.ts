import test from "node:test";
import assert from "node:assert/strict";
import { mapPrismaError } from "@/lib/api/http";

test("mapPrismaError P2002 -> 409 con fields", () => {
  const err: any = { code: "P2002", meta: { target: ["employeeCode"] } };
  const res = mapPrismaError(err);
  assert.equal(res.status, 409);
  assert.equal(res.body.error, "Duplicado");
  assert.deepEqual(res.body.details, { fields: ["employeeCode"] });
});

test("mapPrismaError P2003 -> 409 FK", () => {
  const err: any = { code: "P2003" };
  const res = mapPrismaError(err);
  assert.equal(res.status, 409);
  assert.equal(res.body.error, "Relación inválida");
  assert.equal(res.body.code, "P2003");
});

test("mapPrismaError P2022 -> 500 schema mismatch", () => {
  const err: any = { code: "P2022" };
  const res = mapPrismaError(err);
  assert.equal(res.status, 500);
  assert.equal(res.body.code, "P2022");
});

test("mapPrismaError fallback -> 500", () => {
  const err: any = { code: "OTHER" };
  const res = mapPrismaError(err);
  assert.equal(res.status, 500);
  assert.equal(res.body.code, "INTERNAL_ERROR");
});
