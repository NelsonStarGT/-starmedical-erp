import test from "node:test";
import assert from "node:assert/strict";
import { isCompanySsoDocumentType, mapCompanyDocumentTypeLabel } from "@/lib/clients/companyDocumentTypes";

test("mapea tipos legacy a etiqueta corporativa", () => {
  assert.equal(mapCompanyDocumentTypeLabel("CURP"), "Otros");
  assert.equal(mapCompanyDocumentTypeLabel("Patente Comercio"), "Patente de comercio");
  assert.equal(mapCompanyDocumentTypeLabel("Recibo de luz"), "Recibo luz");
});

test("detecta tipos SSO", () => {
  assert.equal(isCompanySsoDocumentType("Constancia SSO"), true);
  assert.equal(isCompanySsoDocumentType("Licencia sanitaria"), true);
  assert.equal(isCompanySsoDocumentType("RTU"), false);
});
