import test from "node:test";
import assert from "node:assert/strict";
import { getCompanyFormSectionStatus, getMissingRequiredCompanySections } from "@/lib/clients/companyFormPreflight";

function buildBaseInput() {
  return {
    nit: "1234567",
    legalName: "Acme S.A.",
    tradeName: "Acme",
    legalFormId: "sa",
    legalFormRequiresOther: false,
    legalFormOther: "",
    economicActivityId: "software_ti",
    activityRequiresOtherNote: false,
    economicActivityOtherNote: "",
    address: "Zona 10",
    geoCountryId: "gt",
    geoAdmin1Id: "gt-gua",
    geoAdmin2Id: "gt-gua-mun",
    geoFreeState: "",
    geoFreeCity: "",
    geoHasDivisionCatalog: true,
    hasAnyCompanyChannel: true,
    generalChannelsDraftValidationError: null,
    contactPeopleDraftValidationError: null,
    generalChannelsValidationError: null,
    contactPeopleValidationError: null,
    preferredCurrencyCode: "",
    acceptedCurrencyCodes: [],
    billingEmail: "",
    commercialNote: ""
  };
}

test("preflight marca secciones requeridas incompletas", () => {
  const status = getCompanyFormSectionStatus({
    ...buildBaseInput(),
    legalName: "",
    geoAdmin1Id: "",
    hasAnyCompanyChannel: false
  });

  const missing = getMissingRequiredCompanySections(status);
  assert.deepEqual(
    missing.map((item) => item.sectionId),
    ["A", "B", "C"]
  );
});

test("preflight deja D como recomendada si esta vacia", () => {
  const status = getCompanyFormSectionStatus(buildBaseInput());
  const requiredMissing = getMissingRequiredCompanySections(status);
  assert.equal(requiredMissing.length, 0);

  const sectionD = status.find((item) => item.sectionId === "D");
  assert.ok(sectionD);
  assert.equal(sectionD?.status, "recommended");
});
