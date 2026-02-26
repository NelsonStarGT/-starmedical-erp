import test from "node:test";
import assert from "node:assert/strict";
import { canSearchTenantUserQuery, normalizeTenantUserLookupQuery } from "@/lib/clients/userLookup";

test("normaliza query de búsqueda de usuarios", () => {
  assert.equal(normalizeTenantUserLookupQuery("  ana@corp.com  "), "ana@corp.com");
  assert.equal(normalizeTenantUserLookupQuery(null), "");
});

test("habilita búsqueda de usuarios a partir de 2 caracteres", () => {
  assert.equal(canSearchTenantUserQuery("a"), false);
  assert.equal(canSearchTenantUserQuery("an"), true);
  assert.equal(canSearchTenantUserQuery("  an  "), true);
});
