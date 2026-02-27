"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ClientCatalogType, ClientProfileType } from "@prisma/client";
import { Building2, ExternalLink, PlusCircle, Upload, X } from "lucide-react";
import {
  actionAddClientDocument,
  actionAddClientNote,
  actionCreateCompanyClient,
  actionCreateInstitutionClient,
  actionCreateInsurerClient,
  actionListClientCatalogItems,
  actionListClientAcquisitionDetailOptions,
  actionListClientAcquisitionSources
} from "@/app/admin/clientes/actions";
import CompanyContactsEditor, {
  DEFAULT_COMPANY_CONTACTS,
  type CompanyContactsDraft
} from "@/components/clients/CompanyContactsEditor";
import { ClientProfileLookup, type ClientProfileLookupItem } from "@/components/clients/ClientProfileLookup";
import GeoCascadeFieldset, { type GeoCascadeErrors, type GeoCascadeValue } from "@/components/clients/GeoCascadeFieldset";
import SearchableMultiSelect from "@/components/ui/SearchableMultiSelect";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { useClientsCountryContext } from "@/components/clients/useClientsCountryContext";
import {
  buildFallbackClientContactDirectories,
  type ClientContactDirectoriesSnapshot
} from "@/lib/clients/contactDirectories";
import {
  applyDefaultsToDraft,
  type OperatingCountryDefaultsSnapshot
} from "@/lib/clients/operatingCountryDefaults";
import {
  hasAtLeastOneCompanyChannel,
  inferEmailCategoryFromLabel,
  inferPhoneCategoryFromLabel,
  normalizeCompanyGeneralChannels,
  normalizeCompanyPersonContacts,
  validateCompanyContactPeopleDrafts,
  validateCompanyContactPeople,
  validateCompanyGeneralChannelDrafts,
  validateCompanyGeneralChannels,
  resolveCompanyGeneralChannelLabel,
  type NormalizedCompanyGeneralChannel,
  type NormalizedCompanyPersonContact
} from "@/lib/clients/companyProfile";
import {
  ECONOMIC_ACTIVITIES,
  requiresEconomicActivityOtherNote
} from "@/lib/catalogs/economicActivities";
import { COMPANY_EMPLOYEE_RANGES } from "@/lib/catalogs/companyEmployeeRanges";
import { COMPANY_LEGAL_FORMS, requiresCompanyLegalFormOther } from "@/lib/catalogs/legalForms";
import { INSTITUTION_TYPES } from "@/lib/catalogs/institutionTypes";
import { INSTITUTIONAL_REGIMES } from "@/lib/catalogs/institutionalRegimes";
import { INSURER_BILLING_METHODS, INSURER_SCOPES, INSURER_TYPES } from "@/lib/catalogs/insurerTypes";
import { normalizeInsurerLineSelection } from "@/lib/catalogs/insurerLines";
import { getIso4217CurrencyOptions, resolveCurrencyPreferenceSelection } from "@/lib/catalogs/currencies";
import {
  isReferralAcquisitionSource,
  isSocialAcquisitionSource,
  requiresAcquisitionOtherNote
} from "@/lib/clients/acquisition";
import {
  COMPANY_DOCUMENT_ALLOWED_MIME_TYPES,
  COMPANY_LOGO_ALLOWED_MIME_TYPES,
  COMPANY_LOGO_MAX_SIZE_BYTES,
  normalizeCompanyWebsite,
  validateCompanyDocumentWizardDrafts
} from "@/lib/clients/companyCreate";
import {
  getCompanyFormSectionStatus,
  getMissingRequiredCompanySections,
  type CompanyFormSectionId,
  type CompanyFormSectionStatus
} from "@/lib/clients/companyFormPreflight";
import { cn, isValidEmail } from "@/lib/utils";

type AcquisitionSource = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  isActive: boolean;
};

type AcquisitionDetail = {
  id: string;
  sourceId: string;
  code: string;
  name: string;
  isActive: boolean;
};

type FormState = {
  legalName: string;
  tradeName: string;
  nit: string;
  website: string;
  companySizeRange: string;
  legalFormId: string;
  legalFormOther: string;
  economicActivityId: string;
  economicActivitySecondaryIds: string[];
  economicActivityOtherNote: string;
  institutionTypeId: string;
  institutionRegimePrimaryId: string;
  institutionRegimeSecondaryIds: string[];
  institutionSector: "" | "publico" | "privado" | "mixto";
  insurerTypeId: string;
  insurerLinePrimaryCode: string;
  insurerLineSecondaryCodes: string[];
  insurerScope: "" | "local" | "regional" | "internacional";
  insurerCode: string;
  hasActiveAgreement: boolean;
  agreementStartDate: string;
  agreementEndDate: string;
  billingMethod: "" | "direct" | "reimbursement" | "mixed";
  typicalPaymentTermsDays: string;
  authorizationPortalUrl: string;
  authorizationEmail: string;
  claimsEmail: string;
  providerSupportPhone: string;
  providerSupportWhatsApp: string;
  acquisitionSourceId: string;
  acquisitionDetailOptionId: string;
  acquisitionOtherNote: string;
  preferredCurrencyCode: string;
  acceptedCurrencyCodes: string[];
  billingEmail: string;
  commercialNote: string;
  address: string;
  useSameAddressForFiscal: boolean;
  geoCountryId: string;
  geoAdmin1Id: string;
  geoAdmin2Id: string;
  geoAdmin3Id: string;
  geoPostalCode: string;
  geoFreeState: string;
  geoFreeCity: string;
};

type UploadedAsset = {
  assetId: string;
  url: string;
  previewUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type BranchDraft = {
  id: string;
  name: string;
  address: string;
  geoCountryId: string;
  geoAdmin1Id: string;
  geoAdmin2Id: string;
  geoAdmin3Id: string;
  geoPostalCode: string;
  geoFreeState: string;
  geoFreeCity: string;
  hasDivisionCatalog: boolean;
};

type CompanyDocumentDraft = {
  id: string;
  title: string;
  hasExpiry: boolean;
  expiryDate: string;
  notes: string;
  asset: UploadedAsset | null;
};

const BASE_COMPANY_DOCUMENTS = [
  "Patente de comercio",
  "Patente de sociedad",
  "DPI representante legal",
  "Recibo agua/luz",
  "Escritura pública"
] as const;

const BASE_INSTITUTION_DOCUMENTS = [
  "Acta constitutiva / escritura",
  "Nombramiento / representación legal",
  "Registro / resolución",
  "DPI representante / director",
  "Recibo agua/luz",
  "SSO / sanitario (si aplica)"
] as const;

const BASE_INSURER_DOCUMENTS = [
  "Convenio firmado",
  "Tarifario / tabulador",
  "Manual de procedimientos",
  "Requisitos de autorización",
  "Otros"
] as const;
const COMPANY_DOCUMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024;

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildDefaultBranch(): BranchDraft {
  return {
    id: randomId("branch"),
    name: "",
    address: "",
    geoCountryId: "",
    geoAdmin1Id: "",
    geoAdmin2Id: "",
    geoAdmin3Id: "",
    geoPostalCode: "",
    geoFreeState: "",
    geoFreeCity: "",
    hasDivisionCatalog: true
  };
}

function buildBaseDocumentDrafts(mode: "company" | "institution" | "insurer"): CompanyDocumentDraft[] {
  const baseDocuments =
    mode === "institution" ? BASE_INSTITUTION_DOCUMENTS : mode === "insurer" ? BASE_INSURER_DOCUMENTS : BASE_COMPANY_DOCUMENTS;
  return baseDocuments.map((title) => ({
    id: randomId("doc"),
    title,
    hasExpiry: false,
    expiryDate: "",
    notes: "",
    asset: null
  }));
}

function pickPrimaryGeneralPhone(channels: NormalizedCompanyGeneralChannel[]) {
  return channels.find((row) => row.kind !== "EMAIL" && row.isPrimary) ?? channels.find((row) => row.kind !== "EMAIL") ?? null;
}

function pickPrimaryGeneralEmail(channels: NormalizedCompanyGeneralChannel[]) {
  return channels.find((row) => row.kind === "EMAIL" && row.isPrimary) ?? channels.find((row) => row.kind === "EMAIL") ?? null;
}

function pickPrimaryPersonPhone(people: NormalizedCompanyPersonContact[]) {
  for (const person of people) {
    const row = person.phones.find((phone) => phone.isPrimary) ?? person.phones[0];
    if (row) return row;
  }
  return null;
}

function pickPrimaryPersonEmail(people: NormalizedCompanyPersonContact[]) {
  for (const person of people) {
    const row = person.emails.find((email) => email.isPrimary) ?? person.emails[0];
    if (row) return row;
  }
  return null;
}

const ISO_CURRENCY_OPTIONS = getIso4217CurrencyOptions().map((item) => ({
  id: item.code,
  label: item.label
}));

const FOCUSABLE_SELECTOR = "input:not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex='-1'])";

const SECTION_DOM_IDS: Record<CompanyFormSectionId, string> = {
  quick: "company-section-quick",
  A: "company-section-a",
  B: "company-section-b",
  C: "company-section-c",
  D: "company-section-d"
};

type OrganizationMode = "company" | "institution" | "insurer";

type SelectOption = {
  id: string;
  label: string;
};

function buildInstitutionSectionStatus(input: {
  nit: string;
  legalName: string;
  tradeName: string;
  institutionTypeId: string;
  institutionRegimePrimaryId: string;
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
}): CompanyFormSectionStatus[] {
  const quickMissing = input.nit.trim()
    ? []
    : [{ key: "nit", label: "Documento fiscal (opcional)", fieldId: "company-nit" }];

  const identityMissing: Array<{ key: string; label: string; fieldId?: string }> = [];
  if (!input.legalName.trim()) {
    identityMissing.push({ key: "legalName", label: "Nombre legal", fieldId: "company-legal-name" });
  }
  if (!input.tradeName.trim()) {
    identityMissing.push({ key: "tradeName", label: "Nombre público", fieldId: "company-trade-name" });
  }
  if (!input.institutionTypeId.trim()) {
    identityMissing.push({ key: "institutionTypeId", label: "Tipo de institución", fieldId: "institution-type" });
  }
  if (!input.institutionRegimePrimaryId.trim()) {
    identityMissing.push({
      key: "institutionRegimePrimaryId",
      label: "Régimen institucional principal",
      fieldId: "institution-regime-primary"
    });
  }

  const locationMissing: Array<{ key: string; label: string; fieldId?: string }> = [];
  if (!input.address.trim()) {
    locationMissing.push({ key: "address", label: "Dirección principal", fieldId: "company-address" });
  }
  if (!input.geoCountryId.trim()) {
    locationMissing.push({ key: "geoCountryId", label: "País", fieldId: "company-main-location-country" });
  }
  if (input.geoHasDivisionCatalog) {
    if (!input.geoAdmin1Id.trim()) {
      locationMissing.push({ key: "geoAdmin1Id", label: "Departamento", fieldId: "company-main-location-admin1" });
    }
    if (!input.geoAdmin2Id.trim()) {
      locationMissing.push({ key: "geoAdmin2Id", label: "Municipio", fieldId: "company-main-location-admin2" });
    }
  } else {
    if (!input.geoFreeState.trim()) {
      locationMissing.push({ key: "geoFreeState", label: "Departamento", fieldId: "company-main-location-free-state" });
    }
    if (!input.geoFreeCity.trim()) {
      locationMissing.push({ key: "geoFreeCity", label: "Municipio", fieldId: "company-main-location-free-city" });
    }
  }

  const contactsMissing: Array<{ key: string; label: string; fieldId?: string }> = [];
  if (!input.hasAnyCompanyChannel) {
    contactsMissing.push({
      key: "channels",
      label: "Al menos un canal de contacto",
      fieldId: "company-contacts-root"
    });
  }
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
    input.preferredCurrencyCode.trim().length > 0 ||
    input.acceptedCurrencyCodes.length > 0 ||
    input.billingEmail.trim().length > 0 ||
    input.commercialNote.trim().length > 0;

  return [
    {
      sectionId: "quick",
      label: "Identificación rápida",
      required: false,
      status: quickMissing.length === 0 ? "complete" : "recommended",
      missingFields: quickMissing
    },
    {
      sectionId: "A",
      label: "A) Identidad institucional y perfil",
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
      label: "D) Facturación y condiciones comerciales",
      required: false,
      status: hasCommercialData ? "complete" : "recommended",
      missingFields: []
    }
  ];
}

function buildInsurerSectionStatus(input: {
  nit: string;
  legalName: string;
  tradeName: string;
  legalFormId: string;
  legalFormRequiresOther: boolean;
  legalFormOther: string;
  insurerTypeId: string;
  insurerLinePrimaryCode: string;
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
}): CompanyFormSectionStatus[] {
  const quickMissing = input.nit.trim()
    ? []
    : [{ key: "nit", label: "Documento fiscal (NIT)", fieldId: "company-nit" }];

  const identityMissing: Array<{ key: string; label: string; fieldId?: string }> = [];
  if (!input.legalName.trim()) {
    identityMissing.push({ key: "legalName", label: "Razón social", fieldId: "company-legal-name" });
  }
  if (!input.tradeName.trim()) {
    identityMissing.push({ key: "tradeName", label: "Nombre comercial", fieldId: "company-trade-name" });
  }
  if (!input.legalFormId.trim()) {
    identityMissing.push({ key: "legalFormId", label: "Forma jurídica", fieldId: "company-legal-form" });
  }
  if (input.legalFormRequiresOther && !input.legalFormOther.trim()) {
    identityMissing.push({
      key: "legalFormOther",
      label: "Especificar forma jurídica",
      fieldId: "company-legal-form-other"
    });
  }
  if (!input.insurerLinePrimaryCode.trim()) {
    identityMissing.push({
      key: "insurerLinePrimaryCode",
      label: "Ramo principal del seguro",
      fieldId: "insurer-line-primary"
    });
  }
  if (!input.insurerTypeId.trim()) {
    identityMissing.push({
      key: "insurerTypeId",
      label: "Tipo de aseguradora",
      fieldId: "insurer-type"
    });
  }

  const locationMissing: Array<{ key: string; label: string; fieldId?: string }> = [];
  if (!input.address.trim()) {
    locationMissing.push({ key: "address", label: "Dirección principal", fieldId: "company-address" });
  }
  if (!input.geoCountryId.trim()) {
    locationMissing.push({ key: "geoCountryId", label: "País", fieldId: "company-main-location-country" });
  }
  if (input.geoHasDivisionCatalog) {
    if (!input.geoAdmin1Id.trim()) {
      locationMissing.push({ key: "geoAdmin1Id", label: "Departamento", fieldId: "company-main-location-admin1" });
    }
    if (!input.geoAdmin2Id.trim()) {
      locationMissing.push({ key: "geoAdmin2Id", label: "Municipio", fieldId: "company-main-location-admin2" });
    }
  } else {
    if (!input.geoFreeState.trim()) {
      locationMissing.push({ key: "geoFreeState", label: "Departamento", fieldId: "company-main-location-free-state" });
    }
    if (!input.geoFreeCity.trim()) {
      locationMissing.push({ key: "geoFreeCity", label: "Municipio", fieldId: "company-main-location-free-city" });
    }
  }

  const contactsMissing: Array<{ key: string; label: string; fieldId?: string }> = [];
  if (!input.hasAnyCompanyChannel) {
    contactsMissing.push({
      key: "channels",
      label: "Al menos un canal de contacto",
      fieldId: "company-contacts-root"
    });
  }
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
    input.preferredCurrencyCode.trim().length > 0 ||
    input.acceptedCurrencyCodes.length > 0 ||
    input.billingEmail.trim().length > 0 ||
    input.commercialNote.trim().length > 0;

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
      label: "A) Identidad fiscal y perfil de aseguradora",
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
      label: "D) Facturación y condiciones comerciales",
      required: false,
      status: hasCommercialData ? "complete" : "recommended",
      missingFields: []
    }
  ];
}

export default function ClientOrganizationCreateFormBase({
  mode = "company",
  initialOperatingDefaults,
  initialContactDirectories
}: {
  mode?: OrganizationMode;
  initialOperatingDefaults?: OperatingCountryDefaultsSnapshot;
  initialContactDirectories?: ClientContactDirectoriesSnapshot;
}) {
  const router = useRouter();
  const isInstitutionMode = mode === "institution";
  const isInsurerMode = mode === "insurer";
  const organizationLabel = isInstitutionMode ? "institución" : isInsurerMode ? "aseguradora" : "empresa";
  const { country: countryContext } = useClientsCountryContext();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [geoErrors, setGeoErrors] = useState<GeoCascadeErrors>({});
  const [geoHasDivisionCatalog, setGeoHasDivisionCatalog] = useState(true);
  const [sources, setSources] = useState<AcquisitionSource[]>([]);
  const [detailOptions, setDetailOptions] = useState<AcquisitionDetail[]>([]);
  const [referrer, setReferrer] = useState<ClientProfileLookupItem | null>(null);
  const [institutionTypeOptions, setInstitutionTypeOptions] = useState<SelectOption[]>(() =>
    INSTITUTION_TYPES.map((item) => ({ id: item.id, label: item.label }))
  );
  const [institutionRegimeOptions, setInstitutionRegimeOptions] = useState<SelectOption[]>(() =>
    INSTITUTIONAL_REGIMES.map((item) => ({ id: item.id, label: item.label }))
  );

  const [form, setForm] = useState<FormState>({
    legalName: "",
    tradeName: "",
    nit: "",
    website: "",
    companySizeRange: "",
    legalFormId: "",
    legalFormOther: "",
    economicActivityId: "",
    economicActivitySecondaryIds: [],
    economicActivityOtherNote: "",
    institutionTypeId: "",
    institutionRegimePrimaryId: "",
    institutionRegimeSecondaryIds: [],
    institutionSector: "",
    insurerTypeId: "",
    insurerLinePrimaryCode: "",
    insurerLineSecondaryCodes: [],
    insurerScope: "",
    insurerCode: "",
    hasActiveAgreement: false,
    agreementStartDate: "",
    agreementEndDate: "",
    billingMethod: "",
    typicalPaymentTermsDays: "",
    authorizationPortalUrl: "",
    authorizationEmail: "",
    claimsEmail: "",
    providerSupportPhone: "",
    providerSupportWhatsApp: "",
    acquisitionSourceId: "",
    acquisitionDetailOptionId: "",
    acquisitionOtherNote: "",
    preferredCurrencyCode: "",
    acceptedCurrencyCodes: [],
    billingEmail: "",
    commercialNote: "",
    address: "",
    useSameAddressForFiscal: true,
    geoCountryId: "",
    geoAdmin1Id: "",
    geoAdmin2Id: "",
    geoAdmin3Id: "",
    geoPostalCode: "",
    geoFreeState: "",
    geoFreeCity: ""
  });
  const [contacts, setContacts] = useState<CompanyContactsDraft>(DEFAULT_COMPANY_CONTACTS);
  const [branches, setBranches] = useState<BranchDraft[]>([]);
  const [logo, setLogo] = useState<UploadedAsset | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [createdCompanyName, setCreatedCompanyName] = useState<string>("");
  const [showDocumentsStep, setShowDocumentsStep] = useState(false);
  const [documents, setDocuments] = useState<CompanyDocumentDraft[]>(() => buildBaseDocumentDrafts(mode));
  const [otherDocuments, setOtherDocuments] = useState<CompanyDocumentDraft[]>([]);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentsSaved, setDocumentsSaved] = useState(false);
  const [isDocumentUploading, setIsDocumentUploading] = useState(false);
  const [isDocumentsPending, startDocumentsTransition] = useTransition();
  const [isPreflightOpen, setIsPreflightOpen] = useState(false);
  const preflightCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  const contactDirectories = useMemo(
    () => initialContactDirectories ?? buildFallbackClientContactDirectories(),
    [initialContactDirectories]
  );
  const contactDepartmentOptions = useMemo(() => {
    const byCode = new Map<string, { id: string; label: string; isActive: boolean }>();
    for (const item of contactDirectories.departments) {
      const code = item.code.trim() || item.id.trim();
      if (!code) continue;
      const existing = byCode.get(code);
      const next = { id: code, label: item.name, isActive: item.isActive };
      if (!existing) {
        byCode.set(code, next);
      } else if (!existing.isActive && next.isActive) {
        byCode.set(code, next);
      }
    }
    return Array.from(byCode.values());
  }, [contactDirectories.departments]);

  const contactJobTitleOptions = useMemo(() => {
    const byCode = new Map<string, { id: string; label: string; isActive: boolean }>();
    for (const item of contactDirectories.jobTitles) {
      const code = item.code.trim() || item.id.trim();
      if (!code) continue;
      const existing = byCode.get(code);
      const next = { id: code, label: item.name, isActive: item.isActive };
      if (!existing) {
        byCode.set(code, next);
      } else if (!existing.isActive && next.isActive) {
        byCode.set(code, next);
      }
    }
    return Array.from(byCode.values());
  }, [contactDirectories.jobTitles]);

  const pbxCategoryOptions = useMemo(() => {
    const byCode = new Map<string, { id: string; label: string; isActive: boolean }>();
    for (const item of contactDirectories.pbxCategories) {
      const code = item.code.trim() || item.id.trim();
      if (!code) continue;
      if (!byCode.has(code)) {
        byCode.set(code, {
          id: code,
          label: item.name,
          isActive: item.isActive
        });
      }
    }
    return Array.from(byCode.values());
  }, [contactDirectories.pbxCategories]);

  const insurerLineOptions = useMemo(() => {
    const byCode = new Map<string, { id: string; label: string; isActive: boolean }>();
    for (const item of contactDirectories.insurerLines) {
      const code = item.code.trim() || item.id.trim();
      if (!code) continue;
      const existing = byCode.get(code);
      const next = { id: code, label: item.name, isActive: item.isActive };
      if (!existing) {
        byCode.set(code, next);
      } else if (!existing.isActive && next.isActive) {
        byCode.set(code, next);
      }
    }
    return Array.from(byCode.values());
  }, [contactDirectories.insurerLines]);

  const jobTitleIdsByDepartment = useMemo(() => {
    const departmentCodeById = new Map(contactDirectories.departments.map((item) => [item.id, item.code.trim() || item.id.trim()]));
    const jobTitleCodeById = new Map(contactDirectories.jobTitles.map((item) => [item.id, item.code.trim() || item.id.trim()]));

    return contactDirectories.correlations.reduce<Record<string, string[]>>((acc, row) => {
      const departmentCode = departmentCodeById.get(row.departmentId) ?? "";
      if (!departmentCode) return acc;
      const jobTitleCodes = Array.from(
        new Set(
          row.jobTitleIds
            .map((jobTitleId) => jobTitleCodeById.get(jobTitleId) ?? "")
            .map((value) => value.trim())
            .filter(Boolean)
        )
      );
      if (jobTitleCodes.length > 0) {
        acc[departmentCode] = jobTitleCodes;
      }
      return acc;
    }, {});
  }, [contactDirectories.correlations, contactDirectories.departments, contactDirectories.jobTitles]);

  const geoValue: GeoCascadeValue = {
    geoCountryId: form.geoCountryId,
    geoAdmin1Id: form.geoAdmin1Id,
    geoAdmin2Id: form.geoAdmin2Id,
    geoAdmin3Id: form.geoAdmin3Id,
    geoPostalCode: form.geoPostalCode,
    geoFreeState: form.geoFreeState,
    geoFreeCity: form.geoFreeCity
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [sourcesRes, institutionTypesRes, institutionRegimesRes] = await Promise.all([
          actionListClientAcquisitionSources(),
          isInstitutionMode
            ? actionListClientCatalogItems({ type: ClientCatalogType.INSTITUTION_TYPE })
            : Promise.resolve({ items: [] as Array<{ id: string; name: string }> }),
          isInstitutionMode
            ? actionListClientCatalogItems({ type: ClientCatalogType.INSTITUTION_CATEGORY })
            : Promise.resolve({ items: [] as Array<{ id: string; name: string }> })
        ]);
        if (!mounted) return;
        setSources(sourcesRes.items as AcquisitionSource[]);
        if (isInstitutionMode) {
          const fallbackTypes = INSTITUTION_TYPES.map((item) => ({ id: item.id, label: item.label }));
          const fallbackRegimes = INSTITUTIONAL_REGIMES.map((item) => ({ id: item.id, label: item.label }));
          const nextTypes = institutionTypesRes.items.length
            ? institutionTypesRes.items.map((item) => ({ id: item.id, label: item.name }))
            : fallbackTypes;
          const nextRegimes = institutionRegimesRes.items.length
            ? institutionRegimesRes.items.map((item) => ({ id: item.id, label: item.name }))
            : fallbackRegimes;
          setInstitutionTypeOptions(nextTypes);
          setInstitutionRegimeOptions(nextRegimes);
          setForm((prev) => ({
            ...prev,
            institutionTypeId: prev.institutionTypeId || nextTypes[0]?.id || "",
            institutionRegimePrimaryId: prev.institutionRegimePrimaryId || nextRegimes[0]?.id || ""
          }));
        }
      } catch (err) {
        if (!mounted) return;
        setError((err as Error)?.message || "No se pudo cargar catálogos iniciales.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isInstitutionMode]);

  useEffect(() => {
    setDocuments(buildBaseDocumentDrafts(mode));
    setOtherDocuments([]);
  }, [mode]);

  useEffect(() => {
    if (initialOperatingDefaults?.isOperatingCountryPinned) return;
    if (!countryContext?.countryId) return;
    setForm((prev) => (prev.geoCountryId ? prev : { ...prev, geoCountryId: countryContext.countryId }));
  }, [countryContext?.countryId, initialOperatingDefaults?.isOperatingCountryPinned]);

  useEffect(() => {
    if (!initialOperatingDefaults?.isOperatingCountryPinned) return;
    const countryId = initialOperatingDefaults.operatingCountryId;
    if (!countryId) return;

    if (initialOperatingDefaults.scopes.geo) {
      setForm((prev) =>
        applyDefaultsToDraft(prev, {
          geoCountryId: countryId
        })
      );
    }

    const defaultIso2 = initialOperatingDefaults.operatingCountryCode?.trim().toUpperCase();
    if (initialOperatingDefaults.scopes.phone && defaultIso2) {
      setContacts((prev) => ({
        ...prev,
        generalChannels: prev.generalChannels.map((row) => {
          if (row.kind === "EMAIL") return row;
          if (row.countryIso2.trim()) return row;
          return { ...row, countryIso2: defaultIso2 };
        })
      }));
    }
  }, [initialOperatingDefaults]);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === form.acquisitionSourceId) ?? null,
    [sources, form.acquisitionSourceId]
  );
  const sourceNeedsReferral = useMemo(() => isReferralAcquisitionSource(selectedSource), [selectedSource]);
  const sourceNeedsSocialDetail = useMemo(() => isSocialAcquisitionSource(selectedSource), [selectedSource]);
  const selectedDetail = useMemo(
    () => detailOptions.find((detail) => detail.id === form.acquisitionDetailOptionId) ?? null,
    [detailOptions, form.acquisitionDetailOptionId]
  );
  const sourceNeedsOtherNote = useMemo(
    () =>
      requiresAcquisitionOtherNote({
        sourceCode: selectedSource?.code,
        sourceName: selectedSource?.name,
        detailCode: selectedDetail?.code,
        detailName: selectedDetail?.name
      }),
    [selectedDetail, selectedSource]
  );
  const activityRequiresOtherNote = useMemo(
    () => (!isInstitutionMode && !isInsurerMode ? requiresEconomicActivityOtherNote(form.economicActivityId) : false),
    [form.economicActivityId, isInstitutionMode, isInsurerMode]
  );
  const legalFormRequiresOther = useMemo(
    () => (!isInstitutionMode ? requiresCompanyLegalFormOther(form.legalFormId) : false),
    [form.legalFormId, isInstitutionMode]
  );

  const normalizedGeneralChannels = useMemo(
    () =>
      normalizeCompanyGeneralChannels(contacts.generalChannels, {
        pbxCategoryOptions: pbxCategoryOptions.map((item) => ({ value: item.id, label: item.label, isActive: item.isActive }))
      }),
    [contacts.generalChannels, pbxCategoryOptions]
  );
  const normalizedContactPeople = useMemo(
    () => normalizeCompanyPersonContacts(contacts.people, { pbxChannels: normalizedGeneralChannels }),
    [contacts.people, normalizedGeneralChannels]
  );

  const generalChannelsValidationError = useMemo(
    () => validateCompanyGeneralChannels(normalizedGeneralChannels),
    [normalizedGeneralChannels]
  );
  const generalChannelsDraftValidationError = useMemo(
    () =>
      validateCompanyGeneralChannelDrafts(contacts.generalChannels, {
        contactPeople: contacts.people,
        pbxCategoryOptions: pbxCategoryOptions.map((item) => ({ value: item.id, label: item.label, isActive: item.isActive }))
      }),
    [contacts.generalChannels, contacts.people, pbxCategoryOptions]
  );
  const contactPeopleDraftValidationError = useMemo(
    () => validateCompanyContactPeopleDrafts(contacts.people, { generalChannels: contacts.generalChannels }),
    [contacts.generalChannels, contacts.people]
  );
  const contactPeopleValidationError = useMemo(
    () => validateCompanyContactPeople(normalizedContactPeople, { generalChannels: normalizedGeneralChannels }),
    [normalizedContactPeople, normalizedGeneralChannels]
  );
  const hasAnyCompanyChannel = useMemo(
    () =>
      hasAtLeastOneCompanyChannel({
        generalChannels: normalizedGeneralChannels,
        contactPeople: normalizedContactPeople
      }),
    [normalizedGeneralChannels, normalizedContactPeople]
  );

  const activityOtherNoteError = useMemo(() => {
    if (!activityRequiresOtherNote) return null;
    const note = form.economicActivityOtherNote.trim();
    if (!note) return "Actividad económica: al seleccionar 'Otro' debes agregar una nota.";
    if (note.length > 150) return "Actividad económica: la nota no puede exceder 150 caracteres.";
    return null;
  }, [activityRequiresOtherNote, form.economicActivityOtherNote]);
  const legalFormOtherError = useMemo(() => {
    if (!legalFormRequiresOther) return null;
    const note = form.legalFormOther.trim();
    if (!note) return "Forma jurídica: al seleccionar 'Otro' debes especificar el tipo.";
    if (note.length > 60) return "Forma jurídica: el detalle no puede exceder 60 caracteres.";
    return null;
  }, [legalFormRequiresOther, form.legalFormOther]);
  const billingEmailError = useMemo(() => {
    const candidate = form.billingEmail.trim();
    if (!candidate) return null;
    if (!isValidEmail(candidate)) return "Correo de facturación inválido.";
    return null;
  }, [form.billingEmail]);
  const normalizedWebsite = useMemo(() => normalizeCompanyWebsite(form.website), [form.website]);
  const websiteError = normalizedWebsite.error;
  const normalizedAuthorizationPortal = useMemo(
    () => normalizeCompanyWebsite(form.authorizationPortalUrl),
    [form.authorizationPortalUrl]
  );
  const authorizationPortalError = isInsurerMode ? normalizedAuthorizationPortal.error : null;
  const authorizationEmailError = useMemo(() => {
    if (!isInsurerMode) return null;
    const candidate = form.authorizationEmail.trim();
    if (!candidate) return null;
    if (!isValidEmail(candidate)) return "Correo de autorizaciones inválido.";
    return null;
  }, [form.authorizationEmail, isInsurerMode]);
  const claimsEmailError = useMemo(() => {
    if (!isInsurerMode) return null;
    const candidate = form.claimsEmail.trim();
    if (!candidate) return null;
    if (!isValidEmail(candidate)) return "Correo de siniestros inválido.";
    return null;
  }, [form.claimsEmail, isInsurerMode]);
  const paymentTermsError = useMemo(() => {
    if (!isInsurerMode) return null;
    const candidate = form.typicalPaymentTermsDays.trim();
    if (!candidate) return null;
    const parsed = Number(candidate);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 365) return "Días de pago inválidos (0-365).";
    return null;
  }, [form.typicalPaymentTermsDays, isInsurerMode]);
  const agreementDateError = useMemo(() => {
    if (!isInsurerMode) return null;
    const start = form.agreementStartDate.trim();
    const end = form.agreementEndDate.trim();
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "Fechas de convenio inválidas.";
    if (endDate.getTime() < startDate.getTime()) return "La fecha fin de convenio no puede ser anterior al inicio.";
    return null;
  }, [form.agreementEndDate, form.agreementStartDate, isInsurerMode]);
  const branchErrors = useMemo(() => {
    return branches.map((branch) => {
      const hasAnyData = Boolean(
        branch.name.trim() ||
          branch.address.trim() ||
          branch.geoCountryId.trim() ||
          branch.geoAdmin1Id.trim() ||
          branch.geoAdmin2Id.trim() ||
          branch.geoFreeState.trim() ||
          branch.geoFreeCity.trim()
      );
      if (!hasAnyData) return null;
      if (!branch.name.trim()) return "Nombre de sucursal requerido.";
      if (!branch.address.trim()) return "Dirección exacta requerida.";
      if (!branch.geoCountryId.trim()) return "Selecciona país.";
      if (branch.hasDivisionCatalog) {
        if (!branch.geoAdmin1Id.trim()) return "Selecciona departamento.";
        if (!branch.geoAdmin2Id.trim()) return "Selecciona municipio.";
      } else {
        if (!branch.geoFreeState.trim()) return "Selecciona departamento.";
        if (!branch.geoFreeCity.trim()) return "Selecciona municipio.";
      }
      return null;
    });
  }, [branches]);
  const firstBranchError = useMemo(() => branchErrors.find((item) => item) ?? null, [branchErrors]);
  const geoRequiredErrors = useMemo<GeoCascadeErrors>(() => {
    const nextErrors: GeoCascadeErrors = {};
    if (!form.geoCountryId.trim()) {
      nextErrors.geoCountryId = "Selecciona país";
      return nextErrors;
    }

    if (geoHasDivisionCatalog) {
      if (!form.geoAdmin1Id.trim()) {
        nextErrors.geoAdmin1Id = "Selecciona departamento";
      }
      if (!form.geoAdmin2Id.trim()) {
        nextErrors.geoAdmin2Id = "Selecciona municipio";
      }
      return nextErrors;
    }

    if (!form.geoFreeState.trim()) {
      nextErrors.geoAdmin1Id = "Selecciona departamento";
    }
    if (!form.geoFreeCity.trim()) {
      nextErrors.geoAdmin2Id = "Selecciona municipio";
    }
    return nextErrors;
  }, [form.geoAdmin1Id, form.geoAdmin2Id, form.geoCountryId, form.geoFreeCity, form.geoFreeState, geoHasDivisionCatalog]);

  useEffect(() => {
    let mounted = true;

    if (!sourceNeedsSocialDetail || !form.acquisitionSourceId) {
      setDetailOptions([]);
      setForm((prev) => ({ ...prev, acquisitionDetailOptionId: "" }));
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const result = await actionListClientAcquisitionDetailOptions({ sourceId: form.acquisitionSourceId });
        if (!mounted) return;
        setDetailOptions(result.items as AcquisitionDetail[]);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error)?.message || "No se pudo cargar detalles del canal.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [form.acquisitionSourceId, sourceNeedsSocialDetail]);

  useEffect(() => {
    if (!sourceNeedsReferral) {
      setReferrer(null);
    }
  }, [sourceNeedsReferral]);

  useEffect(() => {
    if (!sourceNeedsOtherNote && form.acquisitionOtherNote) {
      setForm((prev) => ({ ...prev, acquisitionOtherNote: "" }));
    }
  }, [sourceNeedsOtherNote, form.acquisitionOtherNote]);

  useEffect(() => {
    if (!activityRequiresOtherNote && form.economicActivityOtherNote) {
      setForm((prev) => ({ ...prev, economicActivityOtherNote: "" }));
    }
  }, [activityRequiresOtherNote, form.economicActivityOtherNote]);

  useEffect(() => {
    if (!legalFormRequiresOther && form.legalFormOther) {
      setForm((prev) => ({ ...prev, legalFormOther: "" }));
    }
  }, [legalFormRequiresOther, form.legalFormOther]);

  useEffect(() => {
    if (!isInstitutionMode) return;
    if (!form.companySizeRange && !form.legalFormId && !form.economicActivityId && !form.economicActivitySecondaryIds.length) return;
    setForm((prev) => ({
      ...prev,
      companySizeRange: "",
      legalFormId: "",
      legalFormOther: "",
      economicActivityId: "",
      economicActivitySecondaryIds: [],
      economicActivityOtherNote: ""
    }));
  }, [
    form.companySizeRange,
    form.economicActivityId,
    form.economicActivitySecondaryIds.length,
    form.legalFormId,
    isInstitutionMode
  ]);

  useEffect(() => {
    if (!isInsurerMode) return;
    if (!form.economicActivityId && !form.economicActivitySecondaryIds.length && !form.economicActivityOtherNote) return;
    setForm((prev) => ({
      ...prev,
      economicActivityId: "",
      economicActivitySecondaryIds: [],
      economicActivityOtherNote: ""
    }));
  }, [form.economicActivityId, form.economicActivityOtherNote, form.economicActivitySecondaryIds.length, isInsurerMode]);

  useEffect(() => {
    return () => {
      if (logo?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logo.previewUrl);
      }
    };
  }, [logo?.previewUrl]);

  useEffect(() => {
    if (!isPreflightOpen) return;
    const timeout = window.setTimeout(() => {
      preflightCloseButtonRef.current?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreflightOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isPreflightOpen]);

  function clearLogo() {
    setLogo((prev) => {
      if (prev?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    setLogoError(null);
  }

  async function uploadLogo(file: File) {
    const normalizedMime = file.type.toLowerCase();
    if (!COMPANY_LOGO_ALLOWED_MIME_TYPES.has(normalizedMime)) {
      setLogoError("Logo inválido. Solo JPG, PNG o WEBP.");
      return;
    }
    if (file.size > COMPANY_LOGO_MAX_SIZE_BYTES) {
      setLogoError("Logo inválido. Máximo 10MB.");
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setLogo((prev) => {
      if (prev?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return {
        assetId: "",
        url: "",
        previewUrl: localPreviewUrl,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size
      };
    });
    setLogoError(null);
    setIsLogoUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("scope", "clients/logos");
      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        assetId?: string;
        url?: string;
      };
      if (!response.ok || payload.ok === false || !payload.assetId || !payload.url) {
        throw new Error(payload.error || "No se pudo subir el logo.");
      }
      setLogo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          assetId: payload.assetId ?? "",
          url: payload.url ?? ""
        };
      });
    } catch (uploadError) {
      setLogoError((uploadError as Error)?.message || "No se pudo subir el logo.");
      setLogo((prev) => {
        if (prev?.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return null;
      });
    } finally {
      setIsLogoUploading(false);
    }
  }

  const canSubmit = useMemo(() => {
    if (!form.legalName.trim()) return false;
    if (!form.tradeName.trim()) return false;
    if (!isInstitutionMode && !form.nit.trim()) return false;
    if (!isInstitutionMode && !form.legalFormId.trim()) return false;
    if (!isInstitutionMode && !isInsurerMode && !form.economicActivityId.trim()) return false;
    if (isInstitutionMode && !form.institutionTypeId.trim()) return false;
    if (isInstitutionMode && !form.institutionRegimePrimaryId.trim()) return false;
    if (isInsurerMode && !form.insurerTypeId.trim()) return false;
    if (isInsurerMode && !form.insurerLinePrimaryCode.trim()) return false;
    if (!form.address.trim()) return false;
    if (Object.keys(geoRequiredErrors).length > 0) return false;
    if (!hasAnyCompanyChannel) return false;
    if (generalChannelsDraftValidationError) return false;
    if (contactPeopleDraftValidationError) return false;
    if (generalChannelsValidationError) return false;
    if (contactPeopleValidationError) return false;
    if (activityOtherNoteError) return false;
    if (legalFormOtherError) return false;

    if (sourceNeedsSocialDetail && !form.acquisitionDetailOptionId) return false;
    if (sourceNeedsOtherNote && form.acquisitionOtherNote.trim().length === 0) return false;
    if (sourceNeedsOtherNote && form.acquisitionOtherNote.trim().length > 150) return false;
    if (sourceNeedsReferral && !referrer?.id) return false;
    if (billingEmailError) return false;
    if (websiteError) return false;
    if (authorizationPortalError) return false;
    if (authorizationEmailError) return false;
    if (claimsEmailError) return false;
    if (paymentTermsError) return false;
    if (agreementDateError) return false;
    if (isLogoUploading) return false;
    if (logo && !logo.assetId) return false;
    if (firstBranchError) return false;

    return true;
  }, [
    activityOtherNoteError,
    agreementDateError,
    authorizationEmailError,
    authorizationPortalError,
    billingEmailError,
    claimsEmailError,
    firstBranchError,
    geoRequiredErrors,
    isLogoUploading,
    isInstitutionMode,
    isInsurerMode,
    legalFormOtherError,
    contactPeopleDraftValidationError,
    contactPeopleValidationError,
    form,
    generalChannelsDraftValidationError,
    generalChannelsValidationError,
    hasAnyCompanyChannel,
    logo,
    referrer?.id,
    sourceNeedsOtherNote,
    sourceNeedsReferral,
    sourceNeedsSocialDetail,
    paymentTermsError,
    websiteError
  ]);

  const sectionStatuses = useMemo(
    () =>
      isInstitutionMode
        ? buildInstitutionSectionStatus({
            nit: form.nit,
            legalName: form.legalName,
            tradeName: form.tradeName,
            institutionTypeId: form.institutionTypeId,
            institutionRegimePrimaryId: form.institutionRegimePrimaryId,
            address: form.address,
            geoCountryId: form.geoCountryId,
            geoAdmin1Id: form.geoAdmin1Id,
            geoAdmin2Id: form.geoAdmin2Id,
            geoFreeState: form.geoFreeState,
            geoFreeCity: form.geoFreeCity,
            geoHasDivisionCatalog,
            hasAnyCompanyChannel,
            generalChannelsDraftValidationError,
            contactPeopleDraftValidationError,
            generalChannelsValidationError,
            contactPeopleValidationError,
            preferredCurrencyCode: form.preferredCurrencyCode,
            acceptedCurrencyCodes: form.acceptedCurrencyCodes,
            billingEmail: form.billingEmail,
            commercialNote: form.commercialNote
          })
        : isInsurerMode
          ? buildInsurerSectionStatus({
              nit: form.nit,
              legalName: form.legalName,
              tradeName: form.tradeName,
              legalFormId: form.legalFormId,
              legalFormRequiresOther,
              legalFormOther: form.legalFormOther,
              insurerTypeId: form.insurerTypeId,
              insurerLinePrimaryCode: form.insurerLinePrimaryCode,
              address: form.address,
              geoCountryId: form.geoCountryId,
              geoAdmin1Id: form.geoAdmin1Id,
              geoAdmin2Id: form.geoAdmin2Id,
              geoFreeState: form.geoFreeState,
              geoFreeCity: form.geoFreeCity,
              geoHasDivisionCatalog,
              hasAnyCompanyChannel,
              generalChannelsDraftValidationError,
              contactPeopleDraftValidationError,
              generalChannelsValidationError,
              contactPeopleValidationError,
              preferredCurrencyCode: form.preferredCurrencyCode,
              acceptedCurrencyCodes: form.acceptedCurrencyCodes,
              billingEmail: form.billingEmail,
              commercialNote: form.commercialNote
            })
          : getCompanyFormSectionStatus({
              nit: form.nit,
              legalName: form.legalName,
              tradeName: form.tradeName,
              legalFormId: form.legalFormId,
              legalFormRequiresOther,
              legalFormOther: form.legalFormOther,
              economicActivityId: form.economicActivityId,
              activityRequiresOtherNote,
              economicActivityOtherNote: form.economicActivityOtherNote,
              address: form.address,
              geoCountryId: form.geoCountryId,
              geoAdmin1Id: form.geoAdmin1Id,
              geoAdmin2Id: form.geoAdmin2Id,
              geoFreeState: form.geoFreeState,
              geoFreeCity: form.geoFreeCity,
              geoHasDivisionCatalog,
              hasAnyCompanyChannel,
              generalChannelsDraftValidationError,
              contactPeopleDraftValidationError,
              generalChannelsValidationError,
              contactPeopleValidationError,
              preferredCurrencyCode: form.preferredCurrencyCode,
              acceptedCurrencyCodes: form.acceptedCurrencyCodes,
              billingEmail: form.billingEmail,
              commercialNote: form.commercialNote
            }),
    [
      activityRequiresOtherNote,
      contactPeopleDraftValidationError,
      contactPeopleValidationError,
      form.acceptedCurrencyCodes,
      form.address,
      form.billingEmail,
      form.commercialNote,
      form.economicActivityId,
      form.economicActivityOtherNote,
      form.geoAdmin1Id,
      form.geoAdmin2Id,
      form.geoCountryId,
      form.geoFreeCity,
      form.geoFreeState,
      form.institutionRegimePrimaryId,
      form.insurerTypeId,
      form.insurerLinePrimaryCode,
      form.institutionTypeId,
      form.legalFormId,
      form.legalFormOther,
      form.legalName,
      form.nit,
      form.preferredCurrencyCode,
      form.tradeName,
      generalChannelsDraftValidationError,
      generalChannelsValidationError,
      geoHasDivisionCatalog,
      hasAnyCompanyChannel,
      isInstitutionMode,
      isInsurerMode,
      legalFormRequiresOther
    ]
  );

  const missingRequiredSections = useMemo(
    () => getMissingRequiredCompanySections(sectionStatuses),
    [sectionStatuses]
  );

  const completedRequiredSections = useMemo(
    () => sectionStatuses.filter((item) => item.required && item.status === "complete").length,
    [sectionStatuses]
  );

  const totalRequiredSections = useMemo(
    () => sectionStatuses.filter((item) => item.required).length,
    [sectionStatuses]
  );

  function focusFieldInSection(fieldId: string | undefined, sectionId: CompanyFormSectionId) {
    const exactField = fieldId ? document.getElementById(fieldId) : null;
    if (exactField && "focus" in exactField) {
      (exactField as HTMLElement).focus();
      return;
    }

    const wrappedField = fieldId
      ? (document.querySelector(`[data-preflight-field='${fieldId}']`) as HTMLElement | null)
      : null;
    const wrappedFocusable = wrappedField?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    if (wrappedFocusable) {
      wrappedFocusable.focus();
      return;
    }

    const sectionElement = document.getElementById(SECTION_DOM_IDS[sectionId]);
    const sectionFocusable = sectionElement?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    if (sectionFocusable) {
      sectionFocusable.focus();
      return;
    }

    if (sectionElement) {
      sectionElement.focus();
    }
  }

  function scrollToSection(section: CompanyFormSectionStatus) {
    const sectionElement = document.getElementById(SECTION_DOM_IDS[section.sectionId]);
    sectionElement?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      focusFieldInSection(section.missingFields[0]?.fieldId, section.sectionId);
    }, 220);
  }

  function handleCreateAttempt(mode: "default" | "with_documents") {
    if (missingRequiredSections.length > 0) {
      setError(`Completa las secciones requeridas antes de crear la ${organizationLabel}.`);
      setIsPreflightOpen(true);
      return;
    }
    submit(mode);
  }

  const submit = (mode: "default" | "with_documents" = "default") => {
    if (missingRequiredSections.length > 0) {
      setError(`Completa las secciones requeridas antes de crear la ${organizationLabel}.`);
      setIsPreflightOpen(true);
      return;
    }
    if (isLogoUploading) {
      setError("Espera a que termine la subida del logo.");
      return;
    }
    if (Object.keys(geoRequiredErrors).length > 0) {
      setGeoErrors(geoRequiredErrors);
      return;
    }
    if (firstBranchError) {
      setError(firstBranchError);
      return;
    }
    if (!canSubmit) {
      setError(`Revisa campos incompletos o inválidos antes de crear la ${organizationLabel}.`);
      return;
    }

    startTransition(async () => {
      try {
        setGeoErrors({});
        setError(null);
        const websiteSelection = normalizeCompanyWebsite(form.website);
        if (websiteSelection.error) {
          throw new Error(websiteSelection.error);
        }
        const authorizationPortalSelection = isInsurerMode
          ? normalizeCompanyWebsite(form.authorizationPortalUrl)
          : { value: null as string | null, error: null as string | null };
        if (authorizationPortalSelection.error) {
          throw new Error(authorizationPortalSelection.error);
        }

        const primaryGeneralPhone = pickPrimaryGeneralPhone(normalizedGeneralChannels);
        const primaryGeneralEmail = pickPrimaryGeneralEmail(normalizedGeneralChannels);
        const primaryPersonPhone = pickPrimaryPersonPhone(normalizedContactPeople);
        const primaryPersonEmail = pickPrimaryPersonEmail(normalizedContactPeople);
        const currencySelection = resolveCurrencyPreferenceSelection({
          preferredCurrencyCode: form.preferredCurrencyCode,
          acceptedCurrencyCodes: form.acceptedCurrencyCodes
        });
        const insurerLineSelection = normalizeInsurerLineSelection({
          primaryCode: form.insurerLinePrimaryCode,
          secondaryCodes: form.insurerLineSecondaryCodes
        });

        const legacyPhones = normalizedGeneralChannels
          .filter((row) => row.kind !== "EMAIL")
          .map((row) => ({
            category: inferPhoneCategoryFromLabel(row.label, row.kind),
            value: row.value,
            countryIso2: row.countryIso2 || undefined,
            canCall: row.kind !== "WHATSAPP",
            canWhatsapp: row.kind === "WHATSAPP",
            isPrimary: row.isPrimary,
            isActive: true
          }));

        const legacyEmails = normalizedGeneralChannels
          .filter((row) => row.kind === "EMAIL")
          .map((row) => ({
            category: inferEmailCategoryFromLabel(row.label),
            value: row.value,
            isPrimary: row.isPrimary,
            isActive: true
          }));
        const preparedBranches = branches
          .filter((branch) =>
            Boolean(
              branch.name.trim() ||
                branch.address.trim() ||
                branch.geoCountryId.trim() ||
                branch.geoAdmin1Id.trim() ||
                branch.geoAdmin2Id.trim() ||
                branch.geoFreeState.trim() ||
                branch.geoFreeCity.trim()
            )
          )
          .map((branch) => ({
            name: branch.name,
            address: branch.address,
            geoCountryId: branch.geoCountryId || undefined,
            geoAdmin1Id: branch.geoAdmin1Id || undefined,
            geoAdmin2Id: branch.geoAdmin2Id || undefined,
            geoAdmin3Id: branch.geoAdmin3Id || undefined,
            geoPostalCode: branch.geoPostalCode || undefined,
            geoFreeState: branch.geoFreeState || undefined,
            geoFreeCity: branch.geoFreeCity || undefined
          }));

        const generalChannelsPayload = contacts.generalChannels.map((row) => ({
          id: row.id,
          ownerType: row.ownerType,
          ownerPersonId: row.ownerType === "PERSON" ? row.ownerPersonId ?? undefined : undefined,
          labelPreset: row.labelPreset,
          labelOther: row.labelPreset === "otro" ? row.labelOther : undefined,
          pbxAreaPreset: row.labelPreset === "pbx" ? row.pbxAreaPreset : undefined,
          pbxAreaOther: row.labelPreset === "pbx" && row.pbxAreaPreset === "otro" ? row.pbxAreaOther : undefined,
          kind: row.kind,
          phoneLineType: row.phoneLineType,
          label:
            resolveCompanyGeneralChannelLabel(
              {
                label: row.label,
                labelPreset: row.labelPreset,
                labelOther: row.labelOther,
                pbxAreaPreset: row.pbxAreaPreset,
                pbxAreaOther: row.pbxAreaOther
              },
              {
                pbxCategoryOptions: pbxCategoryOptions.map((item) => ({
                  value: item.id,
                  label: item.label,
                  isActive: item.isActive
                }))
              }
            ).label ?? row.label,
          value: row.value,
          extension: row.extension,
          countryCode: row.countryCode,
          countryIso2: row.countryIso2,
          isPrimary: row.isPrimary,
          isActive: row.isActive
        }));

        const contactPeoplePayload = contacts.people.map((row) => ({
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          departmentId: row.departmentId || undefined,
          departmentOther: row.departmentId === "otro" ? row.departmentOther : undefined,
          jobTitleId: row.jobTitleId || undefined,
          jobTitleOther: row.jobTitleId === "otro" ? row.jobTitleOther : undefined,
          employmentStatus: row.employmentStatus,
          linkedUserId: row.linkedUserId,
          linkedUserName: row.linkedUserName,
          linkedUserEmail: row.linkedUserEmail,
          department: row.department,
          role: row.role,
          isAreaPrimary: row.isAreaPrimary,
          notes: row.notes,
          phones: row.phones.map((phone) => ({
            mode: phone.mode,
            phoneType: phone.phoneType,
            labelPreset: phone.labelPreset,
            labelOther: phone.labelPreset === "otro" ? phone.labelOther : undefined,
            label: phone.label,
            value: phone.value,
            extension: phone.extension,
            pbxChannelId: phone.pbxChannelId,
            countryCode: phone.countryCode,
            countryIso2: phone.countryIso2,
            canCall: phone.canCall,
            canWhatsApp: phone.canWhatsApp,
            canSms: phone.canSms,
            isWhatsApp: phone.isWhatsApp,
            isPrimary: phone.isPrimary,
            isActive: phone.isActive
          })),
          emails: row.emails.map((email) => ({
            labelPreset: email.labelPreset,
            labelOther: email.labelPreset === "otro" ? email.labelOther : undefined,
            label: email.label,
            value: email.value,
            isPrimary: email.isPrimary,
            isActive: email.isActive
          }))
        }));

        const basePayload = {
          tradeName: form.tradeName,
          country: undefined,
          nit: form.nit || undefined,
          website: websiteSelection.value ?? undefined,
          logoUrl: logo?.url || undefined,
          logoAssetId: logo?.assetId || undefined,
          logoOriginalName: logo?.fileName || undefined,
          acquisitionSourceId: form.acquisitionSourceId || undefined,
          acquisitionDetailOptionId: sourceNeedsSocialDetail ? form.acquisitionDetailOptionId || undefined : undefined,
          acquisitionOtherNote: sourceNeedsOtherNote ? form.acquisitionOtherNote : undefined,
          referredByClientId: sourceNeedsReferral ? referrer?.id : undefined,
          preferredCurrencyCode: currencySelection.preferredCurrencyCode ?? undefined,
          acceptedCurrencyCodes: currencySelection.acceptedCurrencyCodes,
          billingEmail: form.billingEmail || undefined,
          commercialNote: form.commercialNote || undefined,
          phone: primaryGeneralPhone?.value || primaryPersonPhone?.value || undefined,
          phoneCountryIso2: primaryGeneralPhone?.countryIso2 || primaryPersonPhone?.countryIso2 || undefined,
          email: primaryGeneralEmail?.value || primaryPersonEmail?.value || undefined,
          phones: legacyPhones,
          emails: legacyEmails,
          generalChannels: generalChannelsPayload,
          contactPeople: contactPeoplePayload,
          useSameAddressForFiscal: form.useSameAddressForFiscal,
          address: form.address,
          geoCountryId: form.geoCountryId || undefined,
          geoAdmin1Id: form.geoAdmin1Id || undefined,
          geoAdmin2Id: form.geoAdmin2Id || undefined,
          geoAdmin3Id: form.geoAdmin3Id || undefined,
          geoPostalCode: form.geoPostalCode || undefined,
          geoFreeState: form.geoFreeState || undefined,
          geoFreeCity: form.geoFreeCity || undefined,
          branches: preparedBranches
        };

        const result = isInstitutionMode
          ? await actionCreateInstitutionClient({
              ...basePayload,
              name: form.legalName,
              institutionTypeId: form.institutionTypeId,
              institutionCategoryId: form.institutionRegimePrimaryId,
              institutionCategorySecondaryIds: form.institutionRegimeSecondaryIds.filter(
                (item) => item !== form.institutionRegimePrimaryId
              ),
              institutionSector: form.institutionSector || undefined
            })
          : isInsurerMode
            ? await actionCreateInsurerClient({
                ...basePayload,
                legalName: form.legalName,
                nit: form.nit,
                companySizeRange: form.companySizeRange || undefined,
                legalForm: form.legalFormId,
                legalFormOther: legalFormRequiresOther ? form.legalFormOther : undefined,
                insurerLinePrimaryCode: insurerLineSelection.primaryCode || undefined,
                insurerLineSecondaryCodes: insurerLineSelection.secondaryCodes,
                insurerTypeId: form.insurerTypeId,
                insurerScope: form.insurerScope || undefined,
                insurerCode: form.insurerCode || undefined,
                hasActiveAgreement: form.hasActiveAgreement,
                agreementStartDate: form.agreementStartDate || undefined,
                agreementEndDate: form.agreementEndDate || undefined,
                billingMethod: form.billingMethod || undefined,
                typicalPaymentTermsDays: form.typicalPaymentTermsDays ? Number(form.typicalPaymentTermsDays) : undefined,
                authorizationPortalUrl: authorizationPortalSelection.value ?? undefined,
                authorizationEmail: form.authorizationEmail || undefined,
                claimsEmail: form.claimsEmail || undefined,
                providerSupportPhone: form.providerSupportPhone || undefined,
                providerSupportWhatsApp: form.providerSupportWhatsApp || undefined
              })
          : await actionCreateCompanyClient({
              ...basePayload,
              legalName: form.legalName,
              nit: form.nit,
              companySizeRange: form.companySizeRange || undefined,
              legalForm: form.legalFormId,
              legalFormOther: legalFormRequiresOther ? form.legalFormOther : undefined,
              economicActivityId: form.economicActivityId,
              economicActivitySecondaryIds: form.economicActivitySecondaryIds.filter((item) => item !== form.economicActivityId),
              economicActivityOtherNote: activityRequiresOtherNote ? form.economicActivityOtherNote : undefined
            });

        if (mode === "with_documents") {
          router.push(
            isInstitutionMode
              ? `/admin/clientes/instituciones/${result.id}/documentos`
              : isInsurerMode
                ? `/admin/clientes/aseguradoras/${result.id}/documentos`
                : `/admin/clientes/empresas/${result.id}/documentos`
          );
        } else {
          router.push(`/admin/clientes/${result.id}?tab=contactos`);
        }
      } catch (err) {
        const message = (err as Error)?.message || `No se pudo crear la ${organizationLabel}.`;
        setError(message);
        const normalizedMessage = message.toLowerCase();
        if (normalizedMessage.includes("país")) {
          setGeoErrors((prev) => ({ ...prev, geoCountryId: "Selecciona país" }));
          return;
        }
        if (
          normalizedMessage.includes("departamento") ||
          normalizedMessage.includes("región") ||
          normalizedMessage.includes("region") ||
          normalizedMessage.includes("estado")
        ) {
          setGeoErrors((prev) => ({ ...prev, geoAdmin1Id: "Selecciona departamento" }));
          return;
        }
        if (normalizedMessage.includes("municipio") || normalizedMessage.includes("ciudad")) {
          setGeoErrors((prev) => ({ ...prev, geoAdmin2Id: "Selecciona municipio" }));
        }
      }
    });
  };

  function openCreatedCompany(tab: "contactos" | "documentos" = "contactos") {
    if (!createdClientId) return;
    router.push(`/admin/clientes/${createdClientId}?tab=${tab}`);
  }

  async function uploadDocumentAsset(file: File): Promise<UploadedAsset> {
    const normalizedMime = file.type.toLowerCase();
    if (!COMPANY_DOCUMENT_ALLOWED_MIME_TYPES.has(normalizedMime)) {
      throw new Error("Documento inválido. Solo PDF, JPG o PNG.");
    }
    if (file.size > COMPANY_DOCUMENT_MAX_SIZE_BYTES) {
      throw new Error("Documento inválido. Máximo 25MB.");
    }

    const localPreviewUrl = URL.createObjectURL(file);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload/image", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      assetId?: string;
      url?: string;
    };
    if (!response.ok || payload.ok === false || !payload.assetId || !payload.url) {
      URL.revokeObjectURL(localPreviewUrl);
      throw new Error(payload.error || "No se pudo subir el documento.");
    }

    return {
      assetId: payload.assetId,
      url: payload.url,
      previewUrl: localPreviewUrl,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size
    };
  }

  async function attachBaseDocumentFile(documentId: string, file: File) {
    try {
      setDocumentsError(null);
      setIsDocumentUploading(true);
      const asset = await uploadDocumentAsset(file);
      setDocuments((prev) =>
        prev.map((row) => {
          if (row.id !== documentId) return row;
          if (row.asset?.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(row.asset.previewUrl);
          }
          return {
            ...row,
            asset
          };
        })
      );
    } catch (uploadError) {
      setDocumentsError((uploadError as Error)?.message || "No se pudo subir el documento.");
    } finally {
      setIsDocumentUploading(false);
    }
  }

  async function attachOtherDocumentFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setDocumentsError(null);
    setIsDocumentUploading(true);
    try {
      const uploaded: CompanyDocumentDraft[] = [];
      for (const file of Array.from(fileList)) {
        const asset = await uploadDocumentAsset(file);
        uploaded.push({
          id: randomId("doc_other"),
          title: file.name.replace(/\.[^/.]+$/, "") || "Otro documento",
          hasExpiry: false,
          expiryDate: "",
          notes: "",
          asset
        });
      }
      setOtherDocuments((prev) => [...prev, ...uploaded]);
    } catch (uploadError) {
      setDocumentsError((uploadError as Error)?.message || "No se pudieron subir los documentos.");
    } finally {
      setIsDocumentUploading(false);
    }
  }

  function removeDocumentAsset(documentId: string, scope: "base" | "other") {
    if (scope === "base") {
      setDocuments((prev) =>
        prev.map((row) => {
          if (row.id !== documentId) return row;
          if (row.asset?.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(row.asset.previewUrl);
          }
          return {
            ...row,
            asset: null
          };
        })
      );
      return;
    }
    setOtherDocuments((prev) =>
      prev.filter((row) => {
        if (row.id !== documentId) return true;
        if (row.asset?.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(row.asset.previewUrl);
        }
        return false;
      })
    );
  }

  function updateDocumentDraft(documentId: string, scope: "base" | "other", patch: Partial<CompanyDocumentDraft>) {
    if (scope === "base") {
      setDocuments((prev) => prev.map((row) => (row.id === documentId ? { ...row, ...patch } : row)));
      return;
    }
    setOtherDocuments((prev) => prev.map((row) => (row.id === documentId ? { ...row, ...patch } : row)));
  }

  function removeOtherDocument(documentId: string) {
    setOtherDocuments((prev) =>
      prev.filter((row) => {
        if (row.id !== documentId) return true;
        if (row.asset?.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(row.asset.previewUrl);
        }
        return false;
      })
    );
  }

  function validateDocumentsBeforeSubmit() {
    const draftValidation = validateCompanyDocumentWizardDrafts([
      ...documents,
      ...otherDocuments
    ].map((row) => ({
      title: row.title,
      hasExpiry: row.hasExpiry,
      expiryDate: row.expiryDate,
      fileAssetId: row.asset?.assetId ?? null
    })));
    if (!draftValidation.ok) return draftValidation.error;
    return null;
  }

  function saveDocumentsAndFinish() {
    if (!createdClientId) return;
    if (isDocumentUploading) {
      setDocumentsError("Espera a que termine la subida de documentos.");
      return;
    }
    const validationError = validateDocumentsBeforeSubmit();
    if (validationError) {
      setDocumentsError(validationError);
      return;
    }

    startDocumentsTransition(async () => {
      try {
        setDocumentsError(null);
        const rowsToPersist = [...documents, ...otherDocuments].filter((row) => row.asset?.assetId && row.asset.url);
        for (const row of rowsToPersist) {
          await actionAddClientDocument({
            clientId: createdClientId,
            title: row.title.trim(),
            fileAssetId: row.asset?.assetId ?? undefined,
            fileUrl: row.asset?.url ?? undefined,
            originalName: row.asset?.fileName ?? undefined,
            expiresAt: row.hasExpiry && row.expiryDate ? row.expiryDate : undefined
          });
          if (row.notes.trim()) {
            await actionAddClientNote({
              clientId: createdClientId,
              title: `Documento: ${row.title.trim()}`,
              body: row.notes.trim()
            });
          }
        }
        setDocumentsSaved(true);
        openCreatedCompany("documentos");
      } catch (saveError) {
        setDocumentsError((saveError as Error)?.message || "No se pudieron guardar los documentos.");
      }
    });
  }

  if (createdClientId) {
    const allDocuments = [...documents, ...otherDocuments];
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">Crear cliente</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
            {isInstitutionMode ? "Institución creada" : isInsurerMode ? "Aseguradora creada" : "Empresa creada"}
          </h2>
          <p className="text-sm text-slate-600">
            {createdCompanyName
              ? `${createdCompanyName} se registró correctamente.`
              : `La ${organizationLabel} se registró correctamente.`}
          </p>
        </div>

        <section className="space-y-3 rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">Siguiente paso</p>
          <p className="text-sm text-slate-600">Puedes finalizar ahora o continuar con el wizard opcional de documentos base.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openCreatedCompany("contactos")}
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]"
            >
              Finalizar
            </button>
            <button
              type="button"
              onClick={() => setShowDocumentsStep((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-[#4aa59c]/40 bg-white px-5 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm"
            >
              {showDocumentsStep ? "Ocultar documentos" : "Continuar a documentos"}
            </button>
          </div>
        </section>

        {showDocumentsStep ? (
          <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">Paso 2 (opcional): Documentos base</p>
              <p className="text-xs text-slate-500">
                {isInstitutionMode
                  ? "Carga acta, nombramiento legal, registro/resolución y demás respaldos institucionales."
                  : isInsurerMode
                    ? "Carga convenio firmado, tarifario, manual y requisitos de autorización."
                    : "Carga patentes, DPI del representante, recibo y escritura. Vencimiento opcional por documento."}
              </p>
            </div>

            <div className="space-y-3">
              {documents.map((doc, index) => (
                <article key={doc.id} className="space-y-2 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                  <p className="text-xs font-semibold text-slate-700">Documento base #{index + 1}</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-12">
                    <input
                      value={doc.title}
                      onChange={(event) => updateDocumentDraft(doc.id, "base", { title: event.target.value })}
                      className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-2 lg:col-span-4"
                      placeholder="Título del documento"
                    />
                    <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#2e75ba] shadow-sm md:col-span-1 lg:col-span-3">
                      <Upload size={14} className="mr-1" />
                      {doc.asset ? "Reemplazar archivo" : "Subir archivo"}
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg,image/jpg"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void attachBaseDocumentFile(doc.id, file);
                        }}
                        disabled={isDocumentUploading || isDocumentsPending}
                      />
                    </label>
                    <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 md:col-span-1 lg:col-span-2">
                      <input
                        type="checkbox"
                        checked={doc.hasExpiry}
                        onChange={(event) =>
                          updateDocumentDraft(doc.id, "base", {
                            hasExpiry: event.target.checked,
                            expiryDate: event.target.checked ? doc.expiryDate : ""
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                      />
                      Tiene vencimiento
                    </label>
                    {doc.hasExpiry ? (
                      <input
                        type="date"
                        value={doc.expiryDate}
                        onChange={(event) => updateDocumentDraft(doc.id, "base", { expiryDate: event.target.value })}
                        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-1 lg:col-span-3"
                      />
                    ) : null}
                    {doc.asset ? (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 md:col-span-2 lg:col-span-12">
                        <p className="truncate">{doc.asset.fileName}</p>
                        <button
                          type="button"
                          onClick={() => removeDocumentAsset(doc.id, "base")}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                        >
                          <X size={12} />
                          Quitar
                        </button>
                      </div>
                    ) : null}
                    <textarea
                      value={doc.notes}
                      onChange={(event) => updateDocumentDraft(doc.id, "base", { notes: event.target.value.slice(0, 180) })}
                      placeholder="Notas (opcional)"
                      className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-2 lg:col-span-12"
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Otros documentos (opcional)</p>
                <label className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-3 text-xs font-semibold text-[#2e75ba]">
                  <Upload size={13} />
                  Subir múltiples
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(event) => void attachOtherDocumentFiles(event.target.files)}
                    disabled={isDocumentUploading || isDocumentsPending}
                  />
                </label>
              </div>

              {!otherDocuments.length ? <p className="text-xs text-slate-500">Sin documentos adicionales.</p> : null}

              {otherDocuments.map((doc) => (
                <div key={doc.id} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-2 lg:grid-cols-12">
                  <input
                    value={doc.title}
                    onChange={(event) => updateDocumentDraft(doc.id, "other", { title: event.target.value })}
                    className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-1 lg:col-span-4"
                    placeholder="Título"
                  />
                  <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 md:col-span-1 lg:col-span-2">
                    <input
                      type="checkbox"
                      checked={doc.hasExpiry}
                      onChange={(event) =>
                        updateDocumentDraft(doc.id, "other", {
                          hasExpiry: event.target.checked,
                          expiryDate: event.target.checked ? doc.expiryDate : ""
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                    />
                    Vence
                  </label>
                  {doc.hasExpiry ? (
                    <input
                      type="date"
                      value={doc.expiryDate}
                      onChange={(event) => updateDocumentDraft(doc.id, "other", { expiryDate: event.target.value })}
                      className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-1 lg:col-span-3"
                    />
                  ) : null}
                  <p className="truncate text-xs text-slate-600 md:col-span-1 lg:col-span-2">{doc.asset?.fileName ?? "Sin archivo"}</p>
                  <button
                    type="button"
                    onClick={() => removeOtherDocument(doc.id)}
                    className="inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-xs font-semibold text-rose-700 lg:col-span-1"
                  >
                    <X size={12} />
                    Quitar
                  </button>
                  <textarea
                    value={doc.notes}
                    onChange={(event) => updateDocumentDraft(doc.id, "other", { notes: event.target.value.slice(0, 180) })}
                    placeholder="Notas (opcional)"
                    className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-2 lg:col-span-12"
                  />
                </div>
              ))}
            </div>

            {documentsError ? <p className="text-xs text-rose-700">{documentsError}</p> : null}
            {documentsSaved ? <p className="text-xs text-emerald-700">Documentos guardados correctamente.</p> : null}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => openCreatedCompany("contactos")}
                disabled={isDocumentsPending}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm",
                  isDocumentsPending && "cursor-not-allowed opacity-60"
                )}
              >
                Omitir y finalizar
              </button>
              <button
                type="button"
                onClick={saveDocumentsAndFinish}
                disabled={isDocumentsPending || isDocumentUploading || allDocuments.every((row) => !row.asset?.assetId)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]",
                  (isDocumentsPending || isDocumentUploading || allDocuments.every((row) => !row.asset?.assetId)) &&
                    "cursor-not-allowed opacity-60"
                )}
              >
                Guardar documentos y finalizar
              </button>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">Crear cliente</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          {isInstitutionMode ? "Institución" : isInsurerMode ? "Aseguradora" : "Empresa"}
        </h2>
        <p className="text-sm text-slate-600">
          {isInstitutionMode
            ? "Alta institucional con identidad, régimen, ubicación y contactos por área."
            : isInsurerMode
              ? "Alta de aseguradora con perfil operativo, convenio y facturación sobre el mismo flujo empresarial."
            : "Alta empresarial con identidad fiscal, perfil comercial, ubicación y contactos por área."}
        </p>
      </div>

      <section
        id={SECTION_DOM_IDS.quick}
        data-company-section="quick"
        tabIndex={-1}
        className="scroll-mt-24 space-y-3 rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">Identificación rápida</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <input
            id="company-nit"
            value={form.nit}
            onChange={(e) => setForm((prev) => ({ ...prev, nit: e.target.value }))}
            placeholder={isInstitutionMode ? "Documento fiscal (NIT) (opcional)" : "Documento fiscal (NIT) *"}
            className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 lg:col-span-4"
          />

          <div className="space-y-1 lg:col-span-5">
            <div className="flex items-center gap-2">
              <input
                value={form.website}
                onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
                onBlur={() => {
                  const resolved = normalizeCompanyWebsite(form.website);
                  if (resolved.value) {
                    setForm((prev) => ({ ...prev, website: resolved.value ?? "" }));
                  }
                }}
                placeholder="Sitio web (opcional)"
                className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              />
              {normalizedWebsite.value ? (
                <a
                  href={normalizedWebsite.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#2e75ba] shadow-sm"
                >
                  <ExternalLink size={13} />
                  Abrir
                </a>
              ) : null}
            </div>
            {websiteError ? <p className="text-xs text-rose-700">{websiteError}</p> : null}
          </div>

          <div className="space-y-2 lg:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-600">Logo (≤10MB)</p>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isLogoUploading || isPending}
                className={cn(
                  "inline-flex h-10 items-center gap-1 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-3 text-xs font-semibold text-[#2e75ba]",
                  (isLogoUploading || isPending) && "cursor-not-allowed opacity-60"
                )}
              >
                <Upload size={13} />
                {logo ? "Reemplazar" : "Subir"}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadLogo(file);
                }}
                disabled={isLogoUploading || isPending}
              />
            </div>
            {logo ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Image
                    src={logo.previewUrl}
                    alt={`Logo ${organizationLabel}`}
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                  />
                  <p className="truncate text-xs text-slate-600">{logo.fileName}</p>
                </div>
                <button
                  type="button"
                  onClick={clearLogo}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                >
                  <X size={12} />
                  Quitar
                </button>
              </div>
            ) : null}
            {logoError ? <p className="text-xs text-rose-700">{logoError}</p> : null}
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <div
          id={SECTION_DOM_IDS.A}
          data-company-section="A"
          tabIndex={-1}
          className="scroll-mt-24 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">
            {isInstitutionMode
              ? "A) Identidad institucional y perfil"
              : isInsurerMode
                ? "A) Identidad fiscal y perfil de aseguradora"
                : "A) Identidad fiscal y perfil"}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="company-legal-name"
                value={form.legalName}
                onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value }))}
                placeholder={isInstitutionMode ? "Nombre legal *" : "Razón social *"}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              />
            </div>
            <input
              id="company-trade-name"
              value={form.tradeName}
              onChange={(e) => setForm((prev) => ({ ...prev, tradeName: e.target.value }))}
              placeholder={isInstitutionMode ? "Nombre público / institución *" : "Nombre comercial *"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            />

            {isInstitutionMode ? (
              <>
                <div data-preflight-field="institution-type">
                  <SearchableSelect
                    value={form.institutionTypeId}
                    onChange={(nextValue) =>
                      setForm((prev) => ({
                        ...prev,
                        institutionTypeId: nextValue
                      }))
                    }
                    options={institutionTypeOptions}
                    placeholder="Tipo de institución *"
                  />
                </div>

                <div data-preflight-field="institution-regime-primary">
                  <SearchableSelect
                    value={form.institutionRegimePrimaryId}
                    onChange={(nextValue) =>
                      setForm((prev) => ({
                        ...prev,
                        institutionRegimePrimaryId: nextValue,
                        institutionRegimeSecondaryIds: prev.institutionRegimeSecondaryIds.filter((id) => id !== nextValue)
                      }))
                    }
                    options={institutionRegimeOptions}
                    placeholder="Régimen institucional principal *"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs font-semibold text-slate-500">Regímenes secundarios (opcional)</p>
                  <SearchableMultiSelect
                    value={form.institutionRegimeSecondaryIds}
                    onChange={(next) =>
                      setForm((prev) => ({
                        ...prev,
                        institutionRegimeSecondaryIds: Array.from(new Set(next)).filter(
                          (id) => id !== prev.institutionRegimePrimaryId
                        )
                      }))
                    }
                    options={institutionRegimeOptions}
                    excludeIds={form.institutionRegimePrimaryId ? [form.institutionRegimePrimaryId] : undefined}
                    placeholder="Buscar y seleccionar regímenes secundarios"
                  />
                </div>

                <SearchableSelect
                  value={form.institutionSector}
                  onChange={(nextValue) =>
                    setForm((prev) => ({
                      ...prev,
                      institutionSector: (nextValue as FormState["institutionSector"]) || ""
                    }))
                  }
                  options={[
                    { id: "publico", label: "Sector público" },
                    { id: "privado", label: "Sector privado" },
                    { id: "mixto", label: "Sector mixto" }
                  ]}
                  placeholder="Sector (opcional)"
                />
              </>
            ) : (
              <>
                <SearchableSelect
                  value={form.companySizeRange}
                  onChange={(nextValue) =>
                    setForm((prev) => ({
                      ...prev,
                      companySizeRange: nextValue
                    }))
                  }
                  options={COMPANY_EMPLOYEE_RANGES.map((item) => ({ id: item.id, label: item.label }))}
                  placeholder="Tamaño de empresa (rango empleados)"
                />

                <div className="space-y-1" data-preflight-field="company-legal-form">
                  <SearchableSelect
                    value={form.legalFormId}
                    onChange={(nextValue) =>
                      setForm((prev) => ({
                        ...prev,
                        legalFormId: nextValue
                      }))
                    }
                    options={COMPANY_LEGAL_FORMS.map((item) => ({ id: item.id, label: item.label }))}
                    placeholder="Forma jurídica *"
                  />
                  {legalFormRequiresOther ? (
                    <input
                      id="company-legal-form-other"
                      value={form.legalFormOther}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          legalFormOther: event.target.value.slice(0, 60)
                        }))
                      }
                      placeholder="Especificar forma jurídica (máx 60)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                    />
                  ) : null}
                  {legalFormOtherError ? <p className="text-xs text-rose-700">{legalFormOtherError}</p> : null}
                </div>

                {isInsurerMode ? (
                  <>
                    <div data-preflight-field="insurer-line-primary" className="space-y-1">
                      <SearchableSelect
                        value={form.insurerLinePrimaryCode}
                        onChange={(nextValue) =>
                          setForm((prev) => ({
                            ...prev,
                            insurerLinePrimaryCode: nextValue,
                            insurerLineSecondaryCodes: prev.insurerLineSecondaryCodes.filter((id) => id !== nextValue)
                          }))
                        }
                        options={insurerLineOptions.filter((item) => item.isActive).map((item) => ({ id: item.id, label: item.label }))}
                        placeholder="Ramo principal del seguro (ej. Médico, Auto, Vida) *"
                      />
                      <p className="text-xs text-slate-500">Ramo principal del seguro (ej. Médico, Auto, Vida)</p>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <p className="text-xs font-semibold text-slate-500">Ramos adicionales (opcional)</p>
                      <SearchableMultiSelect
                        value={form.insurerLineSecondaryCodes}
                        onChange={(next) =>
                          setForm((prev) => ({
                            ...prev,
                            insurerLineSecondaryCodes: Array.from(new Set(next)).filter((id) => id !== prev.insurerLinePrimaryCode)
                          }))
                        }
                        options={insurerLineOptions.filter((item) => item.isActive).map((item) => ({ id: item.id, label: item.label }))}
                        excludeIds={form.insurerLinePrimaryCode ? [form.insurerLinePrimaryCode] : undefined}
                        placeholder="Buscar y seleccionar ramos adicionales"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div data-preflight-field="company-activity-primary">
                      <SearchableSelect
                        value={form.economicActivityId}
                        onChange={(nextValue) =>
                          setForm((prev) => ({
                            ...prev,
                            economicActivityId: nextValue,
                            economicActivitySecondaryIds: prev.economicActivitySecondaryIds.filter((id) => id !== nextValue)
                          }))
                        }
                        options={ECONOMIC_ACTIVITIES.map((item) => ({ id: item.id, label: item.label }))}
                        placeholder="Actividad económica principal *"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <p className="text-xs font-semibold text-slate-500">Actividades secundarias (opcional)</p>
                      <SearchableMultiSelect
                        value={form.economicActivitySecondaryIds}
                        onChange={(next) =>
                          setForm((prev) => ({
                            ...prev,
                            economicActivitySecondaryIds: Array.from(new Set(next)).filter((id) => id !== prev.economicActivityId)
                          }))
                        }
                        options={ECONOMIC_ACTIVITIES.map((item) => ({ id: item.id, label: item.label }))}
                        excludeIds={form.economicActivityId ? [form.economicActivityId] : undefined}
                        placeholder="Buscar y seleccionar actividades secundarias"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {isInsurerMode ? (
              <>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Perfil de aseguradora</p>
                </div>

                <div data-preflight-field="insurer-type">
                  <SearchableSelect
                    value={form.insurerTypeId}
                    onChange={(nextValue) =>
                      setForm((prev) => ({
                        ...prev,
                        insurerTypeId: nextValue
                      }))
                    }
                    options={INSURER_TYPES.map((item) => ({ id: item.id, label: item.label }))}
                    placeholder="Tipo de aseguradora *"
                  />
                </div>

                <SearchableSelect
                  value={form.insurerScope}
                  onChange={(nextValue) =>
                    setForm((prev) => ({
                      ...prev,
                      insurerScope: (nextValue as FormState["insurerScope"]) || ""
                    }))
                  }
                  options={INSURER_SCOPES.map((item) => ({ id: item.id, label: item.label }))}
                  placeholder="Alcance (local / regional / internacional)"
                />

                <input
                  value={form.insurerCode}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      insurerCode: event.target.value
                    }))
                  }
                  placeholder="Código interno de aseguradora (opcional)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-2"
                />

                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Convenio y operación</p>
                </div>

                <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.hasActiveAgreement}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        hasActiveAgreement: event.target.checked
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                  />
                  Convenio activo
                </label>

                <input
                  type="date"
                  value={form.agreementStartDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      agreementStartDate: event.target.value
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                />

                <input
                  type="date"
                  value={form.agreementEndDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      agreementEndDate: event.target.value
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                />

                <SearchableSelect
                  value={form.billingMethod}
                  onChange={(nextValue) =>
                    setForm((prev) => ({
                      ...prev,
                      billingMethod: (nextValue as FormState["billingMethod"]) || ""
                    }))
                  }
                  options={INSURER_BILLING_METHODS.map((item) => ({ id: item.id, label: item.label }))}
                  placeholder="Método de facturación (directo/reembolso/mixto)"
                />

                <div className="space-y-1">
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={form.typicalPaymentTermsDays}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        typicalPaymentTermsDays: event.target.value
                      }))
                    }
                    placeholder="Término de pago típico (días)"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                  />
                  {paymentTermsError ? <p className="text-xs text-rose-700">{paymentTermsError}</p> : null}
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={form.authorizationPortalUrl}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          authorizationPortalUrl: event.target.value
                        }))
                      }
                      onBlur={() => {
                        const resolved = normalizeCompanyWebsite(form.authorizationPortalUrl);
                        if (resolved.value) {
                          setForm((prev) => ({ ...prev, authorizationPortalUrl: resolved.value ?? "" }));
                        }
                      }}
                      placeholder="Portal de autorizaciones (URL)"
                      className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                    />
                    {normalizedAuthorizationPortal.value ? (
                      <a
                        href={normalizedAuthorizationPortal.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#2e75ba] shadow-sm"
                      >
                        <ExternalLink size={13} />
                        Abrir
                      </a>
                    ) : null}
                  </div>
                  {authorizationPortalError ? <p className="text-xs text-rose-700">{authorizationPortalError}</p> : null}
                </div>

                <div className="space-y-1">
                  <input
                    value={form.authorizationEmail}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        authorizationEmail: event.target.value
                      }))
                    }
                    placeholder="Email autorizaciones (opcional)"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                  />
                  {authorizationEmailError ? <p className="text-xs text-rose-700">{authorizationEmailError}</p> : null}
                </div>

                <div className="space-y-1">
                  <input
                    value={form.claimsEmail}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        claimsEmail: event.target.value
                      }))
                    }
                    placeholder="Email siniestros (opcional)"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                  />
                  {claimsEmailError ? <p className="text-xs text-rose-700">{claimsEmailError}</p> : null}
                </div>

                <input
                  value={form.providerSupportPhone}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      providerSupportPhone: event.target.value
                    }))
                  }
                  placeholder="Teléfono soporte a proveedores (opcional)"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                />

                <input
                  value={form.providerSupportWhatsApp}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      providerSupportWhatsApp: event.target.value
                    }))
                  }
                  placeholder="WhatsApp soporte a proveedores (opcional)"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                />

                {agreementDateError ? <p className="text-xs text-rose-700 md:col-span-2">{agreementDateError}</p> : null}
              </>
            ) : null}

            <select
              value={form.acquisitionSourceId}
              onChange={(e) => {
                const nextSourceId = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  acquisitionSourceId: nextSourceId,
                  acquisitionDetailOptionId: "",
                  acquisitionOtherNote: ""
                }));
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            >
              <option value="">¿Cómo nos conoció? (opcional)</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>

            {sourceNeedsSocialDetail && (
              <select
                value={form.acquisitionDetailOptionId}
                onChange={(e) => setForm((prev) => ({ ...prev, acquisitionDetailOptionId: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              >
                <option value="">¿Cuál red social? *</option>
                {detailOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}

            {!isInstitutionMode && !isInsurerMode && activityRequiresOtherNote && (
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-semibold text-slate-500">Especifica la actividad económica (obligatorio cuando seleccionas “Otro”).</p>
                <textarea
                  id="company-activity-other-note"
                  value={form.economicActivityOtherNote}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, 150);
                    setForm((prev) => ({ ...prev, economicActivityOtherNote: next }));
                  }}
                  placeholder="Describe actividad económica principal (máx 150 caracteres)"
                  className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-rose-700">{activityOtherNoteError || ""}</p>
                  <p className="text-right text-xs text-slate-500">{form.economicActivityOtherNote.length}/150</p>
                </div>
              </div>
            )}

            {sourceNeedsOtherNote && (
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-semibold text-slate-500">
                  {sourceNeedsSocialDetail ? "Describe la red social (obligatorio)" : "Describe cómo nos conoció (obligatorio)"}
                </p>
                <textarea
                  value={form.acquisitionOtherNote}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, 150);
                    setForm((prev) => ({ ...prev, acquisitionOtherNote: next }));
                  }}
                  placeholder={
                    sourceNeedsSocialDetail
                      ? "Ej: campaña Meta Ads, influencer local, otra red... (máx 150)"
                      : "Describe cómo nos conoció (máx 150)"
                  }
                  className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                />
                <p className="text-right text-xs text-slate-500">{form.acquisitionOtherNote.length}/150</p>
              </div>
            )}

            {sourceNeedsReferral && (
              <div className="md:col-span-2">
                <ClientProfileLookup
                  label="Cliente referente *"
                  types={[
                    ClientProfileType.PERSON,
                    ClientProfileType.COMPANY,
                    ClientProfileType.INSTITUTION,
                    ClientProfileType.INSURER
                  ]}
                  value={referrer}
                  onChange={setReferrer}
                  disabled={isPending}
                  placeholder="Buscar por nombre, documento, teléfono o email"
                />
              </div>
            )}
          </div>
        </div>

        <div
          id={SECTION_DOM_IDS.B}
          data-company-section="B"
          tabIndex={-1}
          className="scroll-mt-24 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">B) Ubicación</p>
          <p className="text-xs text-slate-500">
            {isInstitutionMode
              ? "Ingresa la dirección principal de la institución para facturación y reportería."
              : isInsurerMode
                ? "Ingresa la dirección principal de la aseguradora para facturación y reportería."
                : "Ingresa la dirección principal de la empresa para facturación y reportería."}
          </p>

          <div className="grid gap-3">
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.useSameAddressForFiscal}
                onChange={(e) => setForm((prev) => ({ ...prev, useSameAddressForFiscal: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
              />
              Usar esta misma dirección como fiscal (temporal)
            </label>

            <input
              id="company-address"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Ej: 2a calle 13-04 zona 14, Colonia Tecún Umán, Guatemala *"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            />

            <GeoCascadeFieldset
              idPrefix="company-main-location"
              value={geoValue}
              onChange={(next) => {
                setGeoErrors({});
                setForm((prev) => ({
                  ...prev,
                  geoCountryId: next.geoCountryId,
                  geoAdmin1Id: next.geoAdmin1Id,
                  geoAdmin2Id: next.geoAdmin2Id,
                  geoAdmin3Id: next.geoAdmin3Id,
                  geoPostalCode: next.geoPostalCode,
                  geoFreeState: next.geoFreeState ?? "",
                  geoFreeCity: next.geoFreeCity ?? ""
                }));
              }}
              errors={geoErrors}
              disabled={isPending}
              title="Ubicación principal"
              subtitle="País, departamento y municipio (obligatorio)."
              requireCountry
              requireAdmin1
              requireAdmin2
              onHasDivisionCatalogChange={setGeoHasDivisionCatalog}
            />

            <details className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-[#2e75ba]">Sucursales (opcional)</summary>
              <div className="mt-3 space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setBranches((prev) => [...prev, buildDefaultBranch()])}
                    disabled={isPending}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-3 py-1.5 text-xs font-semibold text-[#2e75ba]",
                      isPending && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <PlusCircle size={14} />
                    Agregar sucursal
                  </button>
                </div>

                {!branches.length ? (
                  <p className="text-xs text-slate-500">Sin sucursales cargadas. Este bloque es opcional.</p>
                ) : null}

                {branches.map((branch, index) => {
                  const branchGeoValue: GeoCascadeValue = {
                    geoCountryId: branch.geoCountryId,
                    geoAdmin1Id: branch.geoAdmin1Id,
                    geoAdmin2Id: branch.geoAdmin2Id,
                    geoAdmin3Id: branch.geoAdmin3Id,
                    geoPostalCode: branch.geoPostalCode,
                    geoFreeState: branch.geoFreeState,
                    geoFreeCity: branch.geoFreeCity
                  };
                  const branchErrorMessage = branchErrors[index] ?? null;

                  return (
                    <article key={branch.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-700">Sucursal #{index + 1}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setBranches((prev) => prev.filter((item) => item.id !== branch.id))
                          }
                          disabled={isPending}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700",
                            isPending && "cursor-not-allowed opacity-60"
                          )}
                        >
                          <X size={12} />
                          Quitar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-12">
                        <input
                          value={branch.name}
                          onChange={(event) =>
                            setBranches((prev) =>
                              prev.map((row) =>
                                row.id === branch.id
                                  ? {
                                      ...row,
                                      name: event.target.value
                                    }
                                  : row
                              )
                            )
                          }
                          placeholder="Nombre sucursal *"
                          disabled={isPending}
                          className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 lg:col-span-4"
                        />
                        <input
                          value={branch.address}
                          onChange={(event) =>
                            setBranches((prev) =>
                              prev.map((row) =>
                                row.id === branch.id
                                  ? {
                                      ...row,
                                      address: event.target.value
                                    }
                                  : row
                              )
                            )
                          }
                          placeholder="Dirección exacta *"
                          disabled={isPending}
                          className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 lg:col-span-8"
                        />
                      </div>

                      <GeoCascadeFieldset
                        value={branchGeoValue}
                        onChange={(next) =>
                          setBranches((prev) =>
                            prev.map((row) =>
                              row.id === branch.id
                                ? {
                                    ...row,
                                    geoCountryId: next.geoCountryId,
                                    geoAdmin1Id: next.geoAdmin1Id,
                                    geoAdmin2Id: next.geoAdmin2Id,
                                    geoAdmin3Id: next.geoAdmin3Id,
                                    geoPostalCode: next.geoPostalCode,
                                    geoFreeState: next.geoFreeState ?? "",
                                    geoFreeCity: next.geoFreeCity ?? ""
                                  }
                                : row
                            )
                          )
                        }
                        disabled={isPending}
                        title="Ubicación sucursal"
                        subtitle="País, departamento y municipio"
                        requireCountry
                        requireAdmin1
                        requireAdmin2
                        onHasDivisionCatalogChange={(hasDivisionCatalog) =>
                          setBranches((prev) =>
                            prev.map((row) =>
                              row.id === branch.id
                                ? {
                                    ...row,
                                    hasDivisionCatalog
                                  }
                                : row
                            )
                          )
                        }
                      />
                      {branchErrorMessage ? <p className="text-xs text-rose-700">{branchErrorMessage}</p> : null}
                    </article>
                  );
                })}
              </div>
            </details>
          </div>
        </div>

        <div
          id={SECTION_DOM_IDS.C}
          data-company-section="C"
          data-preflight-field="company-contacts-root"
          tabIndex={-1}
          className="scroll-mt-24 space-y-2"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">C) Contactos</p>
          <CompanyContactsEditor
            value={contacts}
            onChange={setContacts}
            departmentOptions={contactDepartmentOptions}
            jobTitleOptions={contactJobTitleOptions}
            jobTitleIdsByDepartment={jobTitleIdsByDepartment}
            pbxCategoryOptions={pbxCategoryOptions}
            pbxCategoriesSource={contactDirectories.pbxCategoriesSource}
            preferredGeoCountryId={form.geoCountryId || countryContext?.countryId || null}
            disabled={isPending}
          />
          {generalChannelsDraftValidationError ? <p className="text-xs text-rose-700">{generalChannelsDraftValidationError}</p> : null}
          {contactPeopleDraftValidationError ? <p className="text-xs text-rose-700">{contactPeopleDraftValidationError}</p> : null}
          {generalChannelsValidationError ? <p className="text-xs text-rose-700">{generalChannelsValidationError}</p> : null}
          {contactPeopleValidationError ? <p className="text-xs text-rose-700">{contactPeopleValidationError}</p> : null}
          {!hasAnyCompanyChannel ? (
            <p className="text-xs text-rose-700">Debes registrar al menos 1 canal (general o dentro de personas de contacto).</p>
          ) : null}
        </div>

        <div
          id={SECTION_DOM_IDS.D}
          data-company-section="D"
          tabIndex={-1}
          className="scroll-mt-24 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">D) Facturación y condiciones comerciales</p>
          <p className="text-xs text-slate-500">Perfil comercial del cliente. Estas monedas no cambian la moneda base contable del ERP.</p>

          <div className="grid gap-3 md:grid-cols-2">
            <SearchableSelect
              value={form.preferredCurrencyCode}
              onChange={(nextValue) =>
                setForm((prev) => {
                  const nextSelection = resolveCurrencyPreferenceSelection({
                    preferredCurrencyCode: nextValue,
                    acceptedCurrencyCodes: prev.acceptedCurrencyCodes
                  });
                  return {
                    ...prev,
                    preferredCurrencyCode: nextSelection.preferredCurrencyCode ?? "",
                    acceptedCurrencyCodes: nextSelection.acceptedCurrencyCodes
                  };
                })
              }
              options={ISO_CURRENCY_OPTIONS}
              placeholder="Moneda preferida (opcional)"
            />

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Monedas aceptadas (opcional)</p>
              <SearchableMultiSelect
                value={form.acceptedCurrencyCodes}
                onChange={(next) =>
                  setForm((prev) => {
                    const nextSelection = resolveCurrencyPreferenceSelection({
                      preferredCurrencyCode: prev.preferredCurrencyCode,
                      acceptedCurrencyCodes: next
                    });
                    return {
                      ...prev,
                      preferredCurrencyCode: nextSelection.preferredCurrencyCode ?? "",
                      acceptedCurrencyCodes: nextSelection.acceptedCurrencyCodes
                    };
                  })
                }
                options={ISO_CURRENCY_OPTIONS}
                placeholder="Buscar y seleccionar monedas aceptadas"
              />
            </div>

            <div className="space-y-1">
              <input
                value={form.billingEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, billingEmail: event.target.value }))}
                placeholder="Email de facturación (opcional)"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              />
              {billingEmailError ? <p className="text-xs text-rose-700">{billingEmailError}</p> : null}
            </div>

            <div className="space-y-1 md:col-span-2">
              <textarea
                value={form.commercialNote}
                onChange={(event) => setForm((prev) => ({ ...prev, commercialNote: event.target.value.slice(0, 300) }))}
                placeholder="Nota comercial (opcional)"
                className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              />
              <p className="text-right text-xs text-slate-500">{form.commercialNote.length}/300</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">
              Estado: {completedRequiredSections}/{totalRequiredSections} secciones completas
            </p>
            <p className="text-xs text-slate-500">Secciones requeridas para crear {organizationLabel}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sectionStatuses.map((section) => {
              const isComplete = section.status === "complete";
              const isIncomplete = section.status === "incomplete";
              const toneClass = isComplete
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : isIncomplete
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-sky-200 bg-sky-50 text-sky-700";
              const icon = isComplete ? "✅" : isIncomplete ? "⚠️" : "ℹ️";
              return (
                <button
                  key={section.sectionId}
                  type="button"
                  onClick={() => scrollToSection(section)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-90",
                    toneClass
                  )}
                >
                  <span aria-hidden>{icon}</span>
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => handleCreateAttempt("with_documents")}
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-[#4aa59c]/40 bg-white px-5 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm transition hover:border-[#4aadf5] hover:text-[#2e75ba]",
              isPending && "cursor-not-allowed opacity-60"
            )}
          >
            <Upload size={16} />
            Crear y subir documentos
          </button>
          <button
            type="button"
            onClick={() => handleCreateAttempt("default")}
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]",
              isPending && "cursor-not-allowed opacity-60"
            )}
          >
            <PlusCircle size={16} />
            {isInstitutionMode ? "Crear institución" : isInsurerMode ? "Crear aseguradora" : "Crear empresa"}
          </button>
        </div>

        {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      </section>

      {isPreflightOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/50 px-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-preflight-title"
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-md"
          >
            <h3 id="company-preflight-title" className="text-base font-semibold text-slate-900">
              Te faltan estas secciones para crear la {organizationLabel}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Completa cada sección requerida y vuelve a intentar.
            </p>

            <div className="mt-4 space-y-2">
              {missingRequiredSections.map((section) => (
                <article key={section.sectionId} className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{section.label}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPreflightOpen(false);
                        scrollToSection(section);
                      }}
                      className="inline-flex items-center rounded-full border border-[#4aa59c]/40 bg-white px-3 py-1 text-xs font-semibold text-[#2e75ba]"
                    >
                      Ir
                    </button>
                  </div>
                  {section.missingFields.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                      {section.missingFields.slice(0, 3).map((field) => (
                        <li key={`${section.sectionId}-${field.key}`}>{field.label}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                ref={preflightCloseButtonRef}
                type="button"
                onClick={() => setIsPreflightOpen(false)}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cerrar y corregir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
