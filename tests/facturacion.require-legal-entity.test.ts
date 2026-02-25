import test from "node:test";
import assert from "node:assert/strict";
import { requiresLegalEntitySelection } from "@/lib/facturacion/legal-entity-policy";

test("emitir factura exige patente cuando tenant tiene más de una activa", () => {
  assert.equal(
    requiresLegalEntitySelection({
      activeLegalEntitiesCount: 2,
      requestedLegalEntityId: null,
      profileLegalEntityId: null
    }),
    true
  );

  assert.equal(
    requiresLegalEntitySelection({
      activeLegalEntitiesCount: 2,
      requestedLegalEntityId: "le-1",
      profileLegalEntityId: null
    }),
    false
  );

  assert.equal(
    requiresLegalEntitySelection({
      activeLegalEntitiesCount: 1,
      requestedLegalEntityId: null,
      profileLegalEntityId: null
    }),
    false
  );
});
