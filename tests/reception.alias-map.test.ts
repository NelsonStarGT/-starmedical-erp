import test from "node:test";
import assert from "node:assert/strict";
import { resolveReceptionAliasPath } from "@/lib/reception/alias";

test("reception alias: raiz apunta a dashboard canonical", () => {
  assert.equal(resolveReceptionAliasPath("/admin/recepcion"), "/admin/reception/dashboard");
});

test("reception alias: mapea rutas legacy en español", () => {
  assert.equal(resolveReceptionAliasPath("/admin/recepcion/cola"), "/admin/reception/queues");
  assert.equal(resolveReceptionAliasPath("/admin/recepcion/citas"), "/admin/reception/appointments");
  assert.equal(resolveReceptionAliasPath("/admin/recepcion/admisiones"), "/admin/reception/check-in");
});

test("reception alias: preserva rutas canonical equivalentes", () => {
  assert.equal(resolveReceptionAliasPath("/admin/recepcion/queues"), "/admin/reception/queues");
  assert.equal(resolveReceptionAliasPath("/admin/recepcion/visit/v1"), "/admin/reception/visit/v1");
});
