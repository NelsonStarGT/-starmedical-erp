export type CompanyFormSectionId = "quick" | "A" | "B" | "C" | "D";

export type CompanyFormSectionStatusTone = "complete" | "incomplete" | "recommended";

export type CompanyFormSectionMissingField = {
  key: string;
  label: string;
  fieldId?: string;
};

export type CompanyFormSectionStatus = {
  sectionId: CompanyFormSectionId;
  label: string;
  required: boolean;
  status: CompanyFormSectionStatusTone;
  missingFields: CompanyFormSectionMissingField[];
};

export type CompanyFormSectionStatusInput = {
  nit: string;
  legalName: string;
  tradeName: string;
  legalFormId: string;
  legalFormRequiresOther: boolean;
  legalFormOther: string;
  economicActivityId: string;
  activityRequiresOtherNote: boolean;
  economicActivityOtherNote: string;
  address: string;
  geoCountryId: string;
  geoAdmin1Id: string;
  geoAdmin2Id: string;
  geoFreeState: string;
  geoFreeCity: string;
  geoHasDivisionCatalog: boolean;
  hasAnyCompanyChannel: boolean;
  generalChannelsDraftValidationError: string | null;
  contactPeopleDraftValidationError: string | null;
  generalChannelsValidationError: string | null;
  contactPeopleValidationError: string | null;
  preferredCurrencyCode: string;
  acceptedCurrencyCodes: string[];
  billingEmail: string;
  commercialNote: string;
};

function normalize(value: string) {
  return value.trim();
}

function pushMissing(
  items: CompanyFormSectionMissingField[],
  condition: boolean,
  field: CompanyFormSectionMissingField
) {
  if (!condition) return;
  items.push(field);
}

export function getCompanyFormSectionStatus(input: CompanyFormSectionStatusInput): CompanyFormSectionStatus[] {
  const quickMissing: CompanyFormSectionMissingField[] = [];
  pushMissing(quickMissing, normalize(input.nit).length === 0, {
    key: "nit",
    label: "Documento fiscal (NIT)",
    fieldId: "company-nit"
  });

  const identityMissing: CompanyFormSectionMissingField[] = [];
  pushMissing(identityMissing, normalize(input.legalName).length === 0, {
    key: "legalName",
    label: "Razón social",
    fieldId: "company-legal-name"
  });
  pushMissing(identityMissing, normalize(input.tradeName).length === 0, {
    key: "tradeName",
    label: "Nombre comercial",
    fieldId: "company-trade-name"
  });
  pushMissing(identityMissing, normalize(input.legalFormId).length === 0, {
    key: "legalFormId",
    label: "Forma jurídica",
    fieldId: "company-legal-form"
  });
  pushMissing(identityMissing, normalize(input.economicActivityId).length === 0, {
    key: "economicActivityId",
    label: "Actividad económica principal",
    fieldId: "company-activity-primary"
  });
  pushMissing(
    identityMissing,
    input.legalFormRequiresOther && normalize(input.legalFormOther).length === 0,
    {
      key: "legalFormOther",
      label: "Especificar forma jurídica",
      fieldId: "company-legal-form-other"
    }
  );
  pushMissing(
    identityMissing,
    input.activityRequiresOtherNote && normalize(input.economicActivityOtherNote).length === 0,
    {
      key: "economicActivityOtherNote",
      label: "Especificar actividad económica",
      fieldId: "company-activity-other-note"
    }
  );

  const locationMissing: CompanyFormSectionMissingField[] = [];
  pushMissing(locationMissing, normalize(input.address).length === 0, {
    key: "address",
    label: "Dirección principal",
    fieldId: "company-address"
  });
  pushMissing(locationMissing, normalize(input.geoCountryId).length === 0, {
    key: "geoCountryId",
    label: "País",
    fieldId: "company-main-location-country"
  });

  if (input.geoHasDivisionCatalog) {
    pushMissing(locationMissing, normalize(input.geoAdmin1Id).length === 0, {
      key: "geoAdmin1Id",
      label: "Departamento",
      fieldId: "company-main-location-admin1"
    });
    pushMissing(locationMissing, normalize(input.geoAdmin2Id).length === 0, {
      key: "geoAdmin2Id",
      label: "Municipio",
      fieldId: "company-main-location-admin2"
    });
  } else {
    pushMissing(locationMissing, normalize(input.geoFreeState).length === 0, {
      key: "geoFreeState",
      label: "Departamento (texto)",
      fieldId: "company-main-location-free-state"
    });
    pushMissing(locationMissing, normalize(input.geoFreeCity).length === 0, {
      key: "geoFreeCity",
      label: "Municipio (texto)",
      fieldId: "company-main-location-free-city"
    });
  }

  const contactsMissing: CompanyFormSectionMissingField[] = [];
  pushMissing(
    contactsMissing,
    !input.hasAnyCompanyChannel,
    {
      key: "channels",
      label: "Al menos un canal de contacto",
      fieldId: "company-contacts-root"
    }
  );
  if (input.generalChannelsDraftValidationError) {
    contactsMissing.push({
      key: "generalChannelsDraftValidation",
      label: input.generalChannelsDraftValidationError,
      fieldId: "company-contacts-root"
    });
  }
  if (input.contactPeopleDraftValidationError) {
    contactsMissing.push({
      key: "contactPeopleDraftValidation",
      label: input.contactPeopleDraftValidationError,
      fieldId: "company-contacts-root"
    });
  }
  if (input.generalChannelsValidationError) {
    contactsMissing.push({
      key: "generalChannelsValidation",
      label: input.generalChannelsValidationError,
      fieldId: "company-contacts-root"
    });
  }
  if (input.contactPeopleValidationError) {
    contactsMissing.push({
      key: "contactPeopleValidation",
      label: input.contactPeopleValidationError,
      fieldId: "company-contacts-root"
    });
  }

  const hasCommercialData =
    normalize(input.preferredCurrencyCode).length > 0 ||
    input.acceptedCurrencyCodes.length > 0 ||
    normalize(input.billingEmail).length > 0 ||
    normalize(input.commercialNote).length > 0;

  return [
    {
      sectionId: "quick",
      label: "Identificación rápida",
      required: true,
      status: quickMissing.length === 0 ? "complete" : "incomplete",
      missingFields: quickMissing
    },
    {
      sectionId: "A",
      label: "A) Identidad fiscal y perfil",
      required: true,
      status: identityMissing.length === 0 ? "complete" : "incomplete",
      missingFields: identityMissing
    },
    {
      sectionId: "B",
      label: "B) Ubicación",
      required: true,
      status: locationMissing.length === 0 ? "complete" : "incomplete",
      missingFields: locationMissing
    },
    {
      sectionId: "C",
      label: "C) Contactos",
      required: true,
      status: contactsMissing.length === 0 ? "complete" : "incomplete",
      missingFields: contactsMissing
    },
    {
      sectionId: "D",
      label: "D) Facturación",
      required: false,
      status: hasCommercialData ? "complete" : "recommended",
      missingFields: []
    }
  ];
}

export function getMissingRequiredCompanySections(status: CompanyFormSectionStatus[]) {
  return status.filter((item) => item.required && item.status === "incomplete");
}
