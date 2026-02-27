import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPANY_LOGO_MAX_SIZE_BYTES,
  normalizeCompanyWebsite,
  normalizeCompanyBranchDrafts,
  validateCompanyBranchDraft,
  validateCompanyDocumentWizardDrafts,
  validateCompanyLogoAsset
} from "@/lib/clients/companyCreate";

test("website normaliza protocolo https cuando falta", () => {
  const normalized = normalizeCompanyWebsite("starmedical.com");
  assert.equal(normalized.error, null);
  assert.equal(normalized.value, "https://starmedical.com/");
});

test("logo invalido si supera 10MB", () => {
  const result = validateCompanyLogoAsset({
    mimeType: "image/png",
    sizeBytes: COMPANY_LOGO_MAX_SIZE_BYTES + 1,
    storageKey: "clients/logos/acme.png"
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /10mb/i);
});

test("sucursal requiere nombre si hay datos", () => {
  const drafts = normalizeCompanyBranchDrafts([
    {
      name: "",
      address: "Zona 10",
      geoCountryId: "gt"
    }
  ]);

  assert.equal(drafts.length, 1);
  const error = validateCompanyBranchDraft({ branch: drafts[0]!, rowNumber: 1 });
  assert.match(error ?? "", /nombre de sucursal requerido/i);
});

test("documento con vencimiento requiere fecha", () => {
  const validation = validateCompanyDocumentWizardDrafts([
    {
      title: "Patente de comercio",
      hasExpiry: true,
      expiryDate: "",
      fileAssetId: "asset_1"
    }
  ]);
  assert.equal(validation.ok, false);
  if (validation.ok) return;
  assert.match(validation.error, /fecha de vencimiento/i);
});
