import assert from "node:assert/strict";
import test from "node:test";
import { resolveClientBloodType } from "@/lib/clients/bloodType";

test("persona create: bloodType enviado se normaliza a enum", () => {
  assert.equal(resolveClientBloodType("O+"), "O_POS");
  assert.equal(resolveClientBloodType("ab-"), "AB_NEG");
});

test("persona create: sin bloodType persiste null", () => {
  assert.equal(resolveClientBloodType(undefined), null);
  assert.equal(resolveClientBloodType(""), null);
});

test("persona create: valor legado 'DESCONOCIDO' se trata como null", () => {
  assert.equal(resolveClientBloodType("DESCONOCIDO"), null);
  assert.equal(resolveClientBloodType("UNKNOWN"), null);
});
