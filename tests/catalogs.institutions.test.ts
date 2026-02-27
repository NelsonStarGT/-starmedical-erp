import test from "node:test";
import assert from "node:assert/strict";
import { ClientCatalogType } from "@prisma/client";
import { getClientCatalogDefaultsByType } from "@/lib/catalogs/clientCatalogDefaults";

test("institution type defaults expose stable ids", () => {
  const defaults = getClientCatalogDefaultsByType(ClientCatalogType.INSTITUTION_TYPE);
  const ids = defaults.map((item) => item.id);

  assert.ok(ids.includes("gobierno"));
  assert.ok(ids.includes("municipalidad"));
  assert.ok(ids.includes("otro"));
});

test("institution regime defaults expose stable ids", () => {
  const defaults = getClientCatalogDefaultsByType(ClientCatalogType.INSTITUTION_CATEGORY);
  const ids = defaults.map((item) => item.id);

  assert.ok(ids.includes("educacion"));
  assert.ok(ids.includes("salud"));
  assert.ok(ids.includes("otro"));
});
