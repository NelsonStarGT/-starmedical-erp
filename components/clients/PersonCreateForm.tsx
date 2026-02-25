"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientCatalogType, ClientPhoneCategory, ClientPhoneRelationType, ClientProfileType, PatientSex } from "@prisma/client";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  IdCard,
  Loader2,
  MapPin,
  PlusCircle,
  Trash2,
  UserPlus
} from "lucide-react";
import { z } from "zod";
import {
  type ClientContactsDraft,
  default as ClientContactsEditor
} from "@/components/clients/ClientContactsEditor";
import {
  actionCheckPersonIdentityDocument,
  actionCreatePersonClient,
  actionListClientAcquisitionDetailOptions,
  actionListClientAcquisitionSources,
  actionListClientCatalogItems,
  actionListPersonIdentityDocumentTypes,
  actionSearchGeoCountries
} from "@/app/admin/clientes/actions";
import { ClientProfileLookup, type ClientProfileLookupItem } from "@/components/clients/ClientProfileLookup";
import GeoCascadeFieldset, { type GeoCascadeErrors, type GeoCascadeValue } from "@/components/clients/GeoCascadeFieldset";
import { useClientsCountryContext } from "@/components/clients/useClientsCountryContext";
import CountryPicker, { type CountryPickerOption } from "@/components/clients/CountryPicker";
import PhoneInput, { type PhoneInputMeta } from "@/components/ui/PhoneInput";
import {
  isReferralAcquisitionSource,
  isSocialAcquisitionSource,
  requiresAcquisitionOtherNote,
  validateAcquisitionConditionalFields
} from "@/lib/clients/acquisition";
import { CLIENT_TYPE_LABELS } from "@/lib/clients/constants";
import { sanitizePhoneInputValue } from "@/lib/clients/phoneValidation";
import { cn } from "@/lib/utils";

type FormState = {
  firstName: string;
  middleName: string;
  thirdName: string;
  lastName: string;
  secondLastName: string;
  thirdLastName: string;
  sex: "" | PatientSex;
  birthDate: string;
  bloodType: string;
  professionCatalogId: string;
  maritalStatusId: string;
  academicLevelId: string;
  guardianRelationshipTypeId: string;
  acquisitionSourceId: string;
  acquisitionDetailOptionId: string;
  acquisitionOtherNote: string;
  serviceSegments: ClientServiceSegment[];
  identityCountryId: string;
  identityDocumentTypeId: string;
  identityDocumentValue: string;
  phone: string;
  phoneCountryIso2: string;
  email: string;
  birthCountryId: string;
  birthSameAsIdentity: boolean;
  birthCity: string;
  residenceCountryId: string;
  residenceSameAsIdentity: boolean;
  hasResidenceRecord: boolean;
  addressGeneral: string;
  addressWork: string;
  geoCountryId: string;
  geoAdmin1Id: string;
  geoAdmin2Id: string;
  geoAdmin3Id: string;
  geoPostalCode: string;
  geoFreeState: string;
  geoFreeCity: string;
  workGeoCountryId: string;
  workGeoAdmin1Id: string;
  workGeoAdmin2Id: string;
  workGeoAdmin3Id: string;
  workGeoPostalCode: string;
  workGeoFreeState: string;
  workGeoFreeCity: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

type AffiliationDraft = {
  entityType: ClientProfileType;
  entityClientId: string;
  entityLabel: string;
};

type IdentityStatus = {
  state: "idle" | "checking" | "available" | "duplicate" | "invalid";
  message?: string;
  clientId?: string;
  label?: string;
};

type IdentityDocumentOption = {
  id: string;
  name: string;
  description: string | null;
  code: string;
  source: "catalog" | "fallback";
  sensitive: boolean;
  optional: boolean;
};

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

type AcquisitionSource = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  isActive: boolean;
};

type AcquisitionDetailOption = {
  id: string;
  sourceId: string;
  code: string;
  name: string;
  isActive: boolean;
};

type ClientServiceSegment = "PARTICULAR" | "COMPANY" | "INSTITUTION" | "INSURER";

type RelatedContactDraft = {
  id: string;
  relationshipTypeId: string;
  linkedPerson: ClientProfileLookupItem | null;
  name: string;
  phone: string;
};

type ProfilePhotoDraft = {
  assetId: string;
  previewUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type FormSectionKey =
  | "identity"
  | "phones"
  | "emails"
  | "acquisition"
  | "profile"
  | "residence"
  | "work"
  | "relations"
  | "affiliations";

type WizardStep = 1 | 2 | 3 | 4;

const step1Schema = z.object({
  firstName: z.string().trim().min(1, "Primer nombre requerido."),
  lastName: z.string().trim().min(1, "Primer apellido requerido."),
  phone: z.string().trim().min(1, "Teléfono requerido.")
});

const ENTITY_OPTIONS: Array<{ value: ClientProfileType; label: string }> = [
  { value: ClientProfileType.COMPANY, label: "Empresa" },
  { value: ClientProfileType.INSTITUTION, label: "Institución" },
  { value: ClientProfileType.INSURER, label: "Aseguradora" }
];

const AFFILIATION_TYPE_BY_SEGMENT: Partial<Record<ClientServiceSegment, ClientProfileType>> = {
  COMPANY: ClientProfileType.COMPANY,
  INSTITUTION: ClientProfileType.INSTITUTION,
  INSURER: ClientProfileType.INSURER
};

const CALENDAR_MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
] as const;

const CALENDAR_WEEK_DAYS_ES = ["L", "M", "X", "J", "V", "S", "D"] as const;

const WIZARD_STEPS: Array<{ step: WizardStep; title: string; subtitle: string }> = [
  { step: 1, title: "Identidad", subtitle: "Datos mínimos" },
  { step: 2, title: "Residencia", subtitle: "Vivienda y trabajo" },
  { step: 3, title: "Perfil", subtitle: "Clínico y segmentos" },
  { step: 4, title: "Adicional", subtitle: "Marketing y relaciones" }
];

const PHONE_CATEGORY_OPTIONS: Array<{ value: ClientPhoneCategory; label: string }> = [
  { value: ClientPhoneCategory.PRIMARY, label: "Principal" },
  { value: ClientPhoneCategory.MOBILE, label: "Móvil" },
  { value: ClientPhoneCategory.WORK, label: "Trabajo" },
  { value: ClientPhoneCategory.OTHER, label: "Otro" }
];

const DEFAULT_FORM: FormState = {
  firstName: "",
  middleName: "",
  thirdName: "",
  lastName: "",
  secondLastName: "",
  thirdLastName: "",
  sex: "",
  birthDate: "",
  bloodType: "",
  professionCatalogId: "",
  maritalStatusId: "",
  academicLevelId: "",
  guardianRelationshipTypeId: "",
  acquisitionSourceId: "",
  acquisitionDetailOptionId: "",
  acquisitionOtherNote: "",
  serviceSegments: ["PARTICULAR"],
  identityCountryId: "",
  identityDocumentTypeId: "",
  identityDocumentValue: "",
  phone: "",
  phoneCountryIso2: "",
  email: "",
  birthCountryId: "",
  birthSameAsIdentity: true,
  birthCity: "",
  residenceCountryId: "",
  residenceSameAsIdentity: true,
  hasResidenceRecord: false,
  addressGeneral: "",
  addressWork: "",
  geoCountryId: "",
  geoAdmin1Id: "",
  geoAdmin2Id: "",
  geoAdmin3Id: "",
  geoPostalCode: "",
  geoFreeState: "",
  geoFreeCity: "",
  workGeoCountryId: "",
  workGeoAdmin1Id: "",
  workGeoAdmin2Id: "",
  workGeoAdmin3Id: "",
  workGeoPostalCode: "",
  workGeoFreeState: "",
  workGeoFreeCity: ""
};

const PRIMARY_PHONE_ID = "phone_primary";

const DEFAULT_CONTACTS: ClientContactsDraft = {
  phones: [
    {
      id: PRIMARY_PHONE_ID,
      category: ClientPhoneCategory.PRIMARY,
      relationType: ClientPhoneRelationType.TITULAR,
      value: "",
      countryIso2: "",
      canCall: true,
      canWhatsapp: false,
      isPrimary: true,
      isActive: true
    }
  ],
  emails: []
};

function calculateAgeYears(birthDateRaw: string) {
  if (!birthDateRaw) return null;
  const birthDate = new Date(`${birthDateRaw}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  const dayDiff = now.getDate() - birthDate.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age >= 0 ? age : null;
}

const DEFAULT_AFFILIATION: AffiliationDraft = {
  entityType: ClientProfileType.COMPANY,
  entityClientId: "",
  entityLabel: ""
};

const BLOOD_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tipo de sangre (opcional)" },
  { value: "A_POS", label: "A+" },
  { value: "A_NEG", label: "A-" },
  { value: "B_POS", label: "B+" },
  { value: "B_NEG", label: "B-" },
  { value: "AB_POS", label: "AB+" },
  { value: "AB_NEG", label: "AB-" },
  { value: "O_POS", label: "O+" },
  { value: "O_NEG", label: "O-" }
];

const SERVICE_SEGMENT_OPTIONS: Array<{ value: ClientServiceSegment; label: string }> = [
  { value: "PARTICULAR", label: "Particular" },
  { value: "COMPANY", label: "Empresa" },
  { value: "INSTITUTION", label: "Institución" },
  { value: "INSURER", label: "Aseguradora" }
];

const PROFILE_PHOTO_MAX_BYTES = 3 * 1024 * 1024;
const PROFILE_PHOTO_ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function PersonCreateForm() {
  const router = useRouter();
  const { country: countryContext } = useClientsCountryContext();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [contacts, setContacts] = useState<ClientContactsDraft>(DEFAULT_CONTACTS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [geoErrors, setGeoErrors] = useState<GeoCascadeErrors>({});
  const [error, setError] = useState<string | null>(null);

  const [identityStatus, setIdentityStatus] = useState<IdentityStatus>({ state: "idle" });
  const [lastCheckedIdentityKey, setLastCheckedIdentityKey] = useState("");

  const [affiliations, setAffiliations] = useState<AffiliationDraft[]>([]);
  const [affDraft, setAffDraft] = useState<AffiliationDraft>(DEFAULT_AFFILIATION);
  const [professionOptions, setProfessionOptions] = useState<CatalogItem[]>([]);
  const [maritalStatusOptions, setMaritalStatusOptions] = useState<CatalogItem[]>([]);
  const [academicLevelOptions, setAcademicLevelOptions] = useState<CatalogItem[]>([]);
  const [guardianRelationshipOptions, setGuardianRelationshipOptions] = useState<CatalogItem[]>([]);
  const [acquisitionSources, setAcquisitionSources] = useState<AcquisitionSource[]>([]);
  const [acquisitionDetails, setAcquisitionDetails] = useState<AcquisitionDetailOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<CountryPickerOption[]>([]);
  const [identityDocumentOptions, setIdentityDocumentOptions] = useState<IdentityDocumentOption[]>([]);
  const [referrer, setReferrer] = useState<ClientProfileLookupItem | null>(null);
  const [responsibleClient, setResponsibleClient] = useState<ClientProfileLookupItem | null>(null);
  const [relatedContacts, setRelatedContacts] = useState<RelatedContactDraft[]>([]);
  const [primaryPhoneMeta, setPrimaryPhoneMeta] = useState<PhoneInputMeta | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<ProfilePhotoDraft | null>(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>(1);
  const [openSections, setOpenSections] = useState<Record<FormSectionKey, boolean>>({
    identity: true,
    phones: true,
    emails: false,
    acquisition: false,
    profile: false,
    residence: true,
    work: false,
    relations: false,
    affiliations: false
  });

  const setSectionOpen = useCallback((section: FormSectionKey, open: boolean) => {
    setOpenSections((prev) => ({ ...prev, [section]: open }));
  }, []);

  const toggleSection = useCallback((section: FormSectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const sectionStepMap: Record<FormSectionKey, WizardStep> = {
    identity: 1,
    phones: 1,
    emails: 4,
    acquisition: 4,
    profile: 3,
    residence: 2,
    work: 2,
    relations: 4,
    affiliations: 4
  };

  const openAndGoToSection = useCallback((section: FormSectionKey) => {
    setStep(sectionStepMap[section]);
    setSectionOpen(section, true);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        const node = document.getElementById(`person-section-${section}`);
        node?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 40);
    }
  }, [sectionStepMap, setSectionOpen]);

  const geoValue: GeoCascadeValue = {
    geoCountryId: form.geoCountryId,
    geoAdmin1Id: form.geoAdmin1Id,
    geoAdmin2Id: form.geoAdmin2Id,
    geoAdmin3Id: form.geoAdmin3Id,
    geoPostalCode: form.geoPostalCode,
    geoFreeState: form.geoFreeState,
    geoFreeCity: form.geoFreeCity
  };
  const workGeoValue: GeoCascadeValue = {
    geoCountryId: form.workGeoCountryId,
    geoAdmin1Id: form.workGeoAdmin1Id,
    geoAdmin2Id: form.workGeoAdmin2Id,
    geoAdmin3Id: form.workGeoAdmin3Id,
    geoPostalCode: form.workGeoPostalCode,
    geoFreeState: form.workGeoFreeState,
    geoFreeCity: form.workGeoFreeCity
  };

  const isIdentityDuplicate = identityStatus.state === "duplicate";
  const isIdentityChecking = identityStatus.state === "checking";

  const step1ValidBySchema = useMemo(() => {
    const parsed = step1Schema.safeParse({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone
    });
    return parsed.success;
  }, [form.firstName, form.lastName, form.phone]);

  const selectedIdentityDocument = useMemo(
    () => identityDocumentOptions.find((item) => item.id === form.identityDocumentTypeId) ?? null,
    [form.identityDocumentTypeId, identityDocumentOptions]
  );
  const selectedIdentityDocumentSensitive = Boolean(selectedIdentityDocument?.sensitive);
  const isIdentityOptional = Boolean(selectedIdentityDocument?.optional);
  const hasIdentityValue = isIdentityOptional || Boolean(form.identityDocumentValue.trim());
  const selectedIdentityCountryOption = useMemo(
    () => countryOptions.find((item) => item.id === form.identityCountryId) ?? null,
    [countryOptions, form.identityCountryId]
  );
  const identityDocumentOptionsForUi = useMemo(() => {
    const identityIso2 = selectedIdentityCountryOption?.code?.trim().toUpperCase();
    if (identityIso2 !== "GT") return identityDocumentOptions;
    return identityDocumentOptions.filter((option) => option.code === "DPI" || option.code === "PASSPORT");
  }, [identityDocumentOptions, selectedIdentityCountryOption?.code]);
  const hasSelectedIdentityDocument = useMemo(
    () => identityDocumentOptionsForUi.some((item) => item.id === form.identityDocumentTypeId),
    [form.identityDocumentTypeId, identityDocumentOptionsForUi]
  );
  const canGoStep2 =
    step1ValidBySchema &&
    Boolean(form.identityCountryId) &&
    Boolean(form.identityDocumentTypeId) &&
    hasSelectedIdentityDocument &&
    hasIdentityValue &&
    Boolean(form.phoneCountryIso2.trim()) &&
    /^\d+$/.test(form.phone.trim()) &&
    (primaryPhoneMeta?.isValid ?? Boolean(form.phone.trim())) &&
    identityStatus.state !== "invalid" &&
    !isIdentityDuplicate &&
    !isIdentityChecking;
  const selectedAcquisitionSource = useMemo(
    () => acquisitionSources.find((source) => source.id === form.acquisitionSourceId) ?? null,
    [acquisitionSources, form.acquisitionSourceId]
  );
  const sourceNeedsSocialDetail = useMemo(
    () => isSocialAcquisitionSource(selectedAcquisitionSource),
    [selectedAcquisitionSource]
  );
  const selectedAcquisitionDetail = useMemo(
    () => acquisitionDetails.find((detail) => detail.id === form.acquisitionDetailOptionId) ?? null,
    [acquisitionDetails, form.acquisitionDetailOptionId]
  );
  const sourceNeedsOtherNote = useMemo(
    () =>
      requiresAcquisitionOtherNote({
        sourceCode: selectedAcquisitionSource?.code,
        sourceName: selectedAcquisitionSource?.name,
        detailCode: selectedAcquisitionDetail?.code,
        detailName: selectedAcquisitionDetail?.name
      }),
    [selectedAcquisitionDetail, selectedAcquisitionSource]
  );
  const sourceNeedsReferral = useMemo(
    () => isReferralAcquisitionSource(selectedAcquisitionSource),
    [selectedAcquisitionSource]
  );
  const ageYears = useMemo(() => calculateAgeYears(form.birthDate), [form.birthDate]);
  const isMinor = useMemo(() => (ageYears ?? 0) < 18 && ageYears !== null, [ageYears]);
  const primaryPhoneRow = useMemo(
    () => contacts.phones.find((row) => row.isPrimary && row.isActive !== false) ?? contacts.phones[0] ?? null,
    [contacts.phones]
  );
  const currentStepMeta = WIZARD_STEPS.find((item) => item.step === step) ?? WIZARD_STEPS[0];
  const stepProgress = (step / WIZARD_STEPS.length) * 100;
  const primaryPhoneSummary = useMemo(() => {
    const row = primaryPhoneRow;
    if (!row || !row.value.trim()) return null;
    return `${row.countryIso2 || "PAÍS"} ${row.value.trim()}`;
  }, [primaryPhoneRow]);
  const primaryCanCall = primaryPhoneRow?.canCall !== false;
  const primaryCanWhatsapp = primaryPhoneRow?.canWhatsapp === true;
  const residenceCountrySummary = useMemo(() => {
    if (!form.residenceCountryId) return null;
    return countryOptions.find((option) => option.id === form.residenceCountryId)?.name ?? null;
  }, [countryOptions, form.residenceCountryId]);
  const hasResidenceGeoSelection = useMemo(
    () =>
      Boolean(
        form.geoAdmin1Id ||
          form.geoAdmin2Id ||
          form.geoAdmin3Id ||
          form.geoFreeState ||
          form.geoFreeCity ||
          form.geoPostalCode
      ),
    [form.geoAdmin1Id, form.geoAdmin2Id, form.geoAdmin3Id, form.geoFreeState, form.geoFreeCity, form.geoPostalCode]
  );
  const hasResidenceAddress = Boolean(form.addressGeneral.trim());
  const hasResidenceCountrySelection = Boolean(!form.residenceSameAsIdentity && form.residenceCountryId);
  const hasResidenceDetails = hasResidenceGeoSelection || hasResidenceAddress || hasResidenceCountrySelection;
  const hasResidenceIntent = form.hasResidenceRecord || hasResidenceDetails;
  const affiliationEntityOptions = useMemo(() => {
    const allowed = form.serviceSegments
      .map((segment) => AFFILIATION_TYPE_BY_SEGMENT[segment])
      .filter((segment): segment is ClientProfileType => Boolean(segment));
    const allowedSet = new Set(allowed);
    if (!allowedSet.size) return ENTITY_OPTIONS;
    return ENTITY_OPTIONS.filter((option) => allowedSet.has(option.value));
  }, [form.serviceSegments]);

  const upsertPrimaryPhone = useCallback((patch: Partial<ClientContactsDraft["phones"][number]>) => {
    setContacts((prev) => {
      const nextPhones = prev.phones.length ? [...prev.phones] : [...DEFAULT_CONTACTS.phones];
      let primaryIndex = nextPhones.findIndex((row) => row.isPrimary && row.isActive !== false);
      if (primaryIndex < 0) primaryIndex = 0;
      const target = nextPhones[primaryIndex] ?? { ...DEFAULT_CONTACTS.phones[0] };
      nextPhones[primaryIndex] = {
        ...target,
        ...patch,
        relationType: patch.relationType ?? target.relationType ?? ClientPhoneRelationType.TITULAR,
        isPrimary: true,
        isActive: true
      };
      for (let index = 0; index < nextPhones.length; index += 1) {
        if (index === primaryIndex) continue;
        if (nextPhones[index]?.isPrimary) {
          nextPhones[index] = { ...nextPhones[index], isPrimary: false };
        }
      }
      return {
        ...prev,
        phones: nextPhones
      };
    });
  }, []);

  const runIdentityCheck = useCallback(
    async (candidate: string) => {
      const value = candidate.trim();
      if (!form.identityDocumentTypeId) {
        setIdentityStatus({ state: "idle" });
        return;
      }
      if (!value && isIdentityOptional) {
        setIdentityStatus({ state: "available", message: "Documento sensible opcional." });
        return;
      }
      if (!value) {
        setIdentityStatus({ state: "invalid", message: "Documento de identidad requerido." });
        return;
      }

      const identityKey = `${form.identityDocumentTypeId}|${form.identityCountryId}|${value}`;
      if (identityKey === lastCheckedIdentityKey) return;

      setIdentityStatus({ state: "checking", message: "Validando documento..." });
      try {
        const result = await actionCheckPersonIdentityDocument({
          value,
          documentTypeId: form.identityDocumentTypeId,
          countryId: form.identityCountryId || undefined
        });
        setLastCheckedIdentityKey(identityKey);
        if (result.exists && result.clientId) {
          setIdentityStatus({
            state: "duplicate",
            message: "Este documento ya existe en el sistema.",
            clientId: result.clientId,
            label: result.label ?? undefined
          });
        } else {
          setIdentityStatus({
            state: "available",
            message: selectedIdentityDocumentSensitive ? "Documento sensible válido." : "Documento disponible."
          });
        }
      } catch (err) {
        setIdentityStatus({
          state: "invalid",
          message: (err as Error)?.message || "No se pudo validar el documento."
        });
      }
    },
    [
      form.identityCountryId,
      form.identityDocumentTypeId,
      isIdentityOptional,
      lastCheckedIdentityKey,
      selectedIdentityDocumentSensitive
    ]
  );

  useEffect(() => {
    if (!form.identityDocumentTypeId) {
      setIdentityStatus({ state: "idle" });
      setLastCheckedIdentityKey("");
      return;
    }

    const value = form.identityDocumentValue.trim();
    if (!value && !isIdentityOptional) {
      setIdentityStatus({ state: "idle" });
      return;
    }
    if (!value && isIdentityOptional) {
      setIdentityStatus({ state: "available", message: "Documento sensible opcional." });
      return;
    }

    const timeout = setTimeout(() => {
      void runIdentityCheck(value);
    }, 450);

    return () => clearTimeout(timeout);
  }, [form.identityDocumentTypeId, form.identityDocumentValue, isIdentityOptional, runIdentityCheck]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [sourcesRes, professionsRes, maritalRes, academicRes, relationshipRes, countriesRes] = await Promise.all([
          actionListClientAcquisitionSources(),
          actionListClientCatalogItems({ type: ClientCatalogType.PERSON_PROFESSION }),
          actionListClientCatalogItems({ type: ClientCatalogType.MARITAL_STATUS }),
          actionListClientCatalogItems({ type: ClientCatalogType.ACADEMIC_LEVEL }),
          actionListClientCatalogItems({ type: ClientCatalogType.RELATIONSHIP_TYPE }),
          actionSearchGeoCountries({ limit: 400, onlyActive: true })
        ]);
        if (!mounted) return;
        setAcquisitionSources(sourcesRes.items as AcquisitionSource[]);
        setProfessionOptions(professionsRes.items as CatalogItem[]);
        setMaritalStatusOptions(maritalRes.items as CatalogItem[]);
        setAcademicLevelOptions(academicRes.items as CatalogItem[]);
        setGuardianRelationshipOptions(relationshipRes.items as CatalogItem[]);
        setCountryOptions(
          (countriesRes.items as Array<{ id: string; code: string; iso3?: string | null; name: string; isActive: boolean }>).map(
            (country) => ({
              id: country.id,
              code: country.code,
              iso3: country.iso3 ?? null,
              name: country.name,
              isActive: country.isActive
            })
          )
        );
      } catch (err) {
        if (!mounted) return;
        setError((err as Error)?.message || "No se pudo cargar catálogos de persona.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await actionListPersonIdentityDocumentTypes({
          countryId: form.identityCountryId || undefined
        });
        if (!mounted) return;
        const items = result.items as IdentityDocumentOption[];
        const filteredItems =
          (result.countryIso2 ?? "").trim().toUpperCase() === "GT"
            ? items.filter((option) => option.code === "DPI" || option.code === "PASSPORT")
            : items;
        setIdentityDocumentOptions(filteredItems);
        setForm((prev) => {
          if (prev.identityDocumentTypeId && filteredItems.some((item) => item.id === prev.identityDocumentTypeId)) {
            return prev;
          }
          const preferred = filteredItems.find((item) => !item.optional) ?? filteredItems[0];
          return {
            ...prev,
            identityDocumentTypeId: preferred?.id ?? ""
          };
        });
      } catch (err) {
        if (!mounted) return;
        setIdentityDocumentOptions([]);
        setError((err as Error)?.message || "No se pudo cargar tipos de documento.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [form.identityCountryId]);

  useEffect(() => {
    if (!countryContext?.countryId) return;
    setForm((prev) =>
      prev.identityCountryId && prev.birthCountryId && prev.residenceCountryId
        ? prev
        : {
            ...prev,
            identityCountryId: prev.identityCountryId || countryContext.countryId,
            birthCountryId: prev.birthCountryId || countryContext.countryId,
            residenceCountryId: prev.residenceCountryId || countryContext.countryId,
            geoCountryId: prev.geoCountryId || countryContext.countryId
          }
    );
  }, [countryContext?.countryId]);

  useEffect(() => {
    if (!form.residenceSameAsIdentity) return;
    if (!form.identityCountryId) return;

    setForm((prev) => ({
      ...prev,
      residenceCountryId: prev.identityCountryId,
      geoCountryId: prev.identityCountryId,
      geoAdmin1Id: "",
      geoAdmin2Id: "",
      geoAdmin3Id: "",
      geoPostalCode: "",
      geoFreeState: "",
      geoFreeCity: ""
    }));
  }, [form.identityCountryId, form.residenceSameAsIdentity]);

  useEffect(() => {
    if (!form.birthSameAsIdentity) return;
    if (!form.identityCountryId) return;
    setForm((prev) => {
      if (prev.birthCountryId === prev.identityCountryId) return prev;
      return {
        ...prev,
        birthCountryId: prev.identityCountryId
      };
    });
  }, [form.birthSameAsIdentity, form.identityCountryId]);

  useEffect(() => {
    if (!form.identityCountryId) return;
    if (form.phoneCountryIso2 || form.phone.trim()) return;
    const identityCountryCode = selectedIdentityCountryOption?.code?.trim().toUpperCase();
    if (!identityCountryCode) return;
    setForm((prev) => {
      if (prev.phoneCountryIso2 || prev.phone.trim()) return prev;
      return {
        ...prev,
        phoneCountryIso2: identityCountryCode
      };
    });
  }, [form.identityCountryId, form.phone, form.phoneCountryIso2, selectedIdentityCountryOption?.code]);

  useEffect(() => {
    const primaryPhone = contacts.phones.find((row) => row.isPrimary && row.isActive !== false) ?? contacts.phones[0] ?? null;
    if (!primaryPhone) return;
    const localNumber = primaryPhone.value.trim();
    const countryIso2 = primaryPhone.countryIso2 || "";
    setForm((prev) => {
      if (prev.phone === localNumber && prev.phoneCountryIso2 === countryIso2) return prev;
      return {
        ...prev,
        phone: localNumber,
        phoneCountryIso2: countryIso2
      };
    });
  }, [contacts.phones]);

  useEffect(() => {
    let mounted = true;

    if (!sourceNeedsSocialDetail || !form.acquisitionSourceId) {
      setAcquisitionDetails([]);
      setForm((prev) => ({ ...prev, acquisitionDetailOptionId: "" }));
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const result = await actionListClientAcquisitionDetailOptions({
          sourceId: form.acquisitionSourceId
        });
        if (!mounted) return;
        setAcquisitionDetails(result.items as AcquisitionDetailOption[]);
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
    if (!isMinor) {
      setResponsibleClient(null);
      if (form.guardianRelationshipTypeId) {
        setForm((prev) => ({ ...prev, guardianRelationshipTypeId: "" }));
      }
    }
  }, [isMinor, form.guardianRelationshipTypeId]);

  useEffect(() => {
    if (!sourceNeedsOtherNote && form.acquisitionOtherNote) {
      setForm((prev) => ({ ...prev, acquisitionOtherNote: "" }));
    }
  }, [sourceNeedsOtherNote, form.acquisitionOtherNote]);

  useEffect(() => {
    if (!affiliationEntityOptions.length) return;
    if (affiliationEntityOptions.some((option) => option.value === affDraft.entityType)) return;
    setAffDraft((prev) => ({
      ...prev,
      entityType: affiliationEntityOptions[0].value,
      entityClientId: "",
      entityLabel: ""
    }));
  }, [affDraft.entityType, affiliationEntityOptions]);

  useEffect(() => {
    return () => {
      if (profilePhoto?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(profilePhoto.previewUrl);
      }
    };
  }, [profilePhoto?.previewUrl]);

  function validateStep1() {
    const parsed = step1Schema.safeParse({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone
    });

    const nextErrors: FieldErrors = {};
    let firstInvalidSection: FormSectionKey = "identity";
    if (!form.identityCountryId) {
      nextErrors.geoCountryId = "Selecciona país de identificación.";
    }
    if (!form.identityDocumentTypeId) {
      nextErrors.identityDocumentTypeId = "Selecciona tipo de documento.";
    }
    if (form.identityDocumentTypeId && !hasSelectedIdentityDocument) {
      nextErrors.identityDocumentTypeId = "Para Guatemala solo se permite DPI o Pasaporte.";
    }
    if (!isIdentityOptional && !form.identityDocumentValue.trim()) {
      nextErrors.identityDocumentValue = "Documento de identidad requerido.";
    }
    const phoneValue = form.phone.trim();
    if (!phoneValue) {
      nextErrors.phone = "Teléfono requerido.";
      firstInvalidSection = "phones";
    } else if (!/^\d+$/.test(phoneValue)) {
      nextErrors.phone = "Teléfono principal inválido. Solo se permiten dígitos.";
      firstInvalidSection = "phones";
    } else if (!form.phoneCountryIso2.trim()) {
      nextErrors.phone = "Selecciona el código de país del teléfono principal.";
      firstInvalidSection = "phones";
    } else if (primaryPhoneMeta && !primaryPhoneMeta.isValid) {
      nextErrors.phone = primaryPhoneMeta.error ?? "Teléfono principal inválido.";
      firstInvalidSection = "phones";
    }

    if (parsed.success) {
      if (!Object.keys(nextErrors).length) {
        setErrors((prev) => ({
          ...prev,
          firstName: undefined,
          lastName: undefined,
          geoCountryId: undefined,
          identityDocumentTypeId: undefined,
          identityDocumentValue: undefined,
          phone: undefined
        }));
        return { ok: true, firstInvalidSection };
      }
    } else {
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FormState;
        nextErrors[key] = issue.message;
        if (key === "phone") firstInvalidSection = "phones";
      });
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return { ok: false, firstInvalidSection };
  }

  function validateStep2() {
    if (form.hasResidenceRecord && !hasResidenceDetails) {
      setError("Marca ubicación o dirección para registrar residencia.");
      openAndGoToSection("residence");
      return false;
    }
    if (hasResidenceIntent && !form.addressGeneral.trim()) {
      setError("Ingresa la dirección de vivienda.");
      setErrors((prev) => ({ ...prev, addressGeneral: "Dirección de vivienda requerida." }));
      openAndGoToSection("residence");
      return false;
    }
    setErrors((prev) => ({ ...prev, addressGeneral: undefined }));
    return true;
  }

  function goToNextStep() {
    setError(null);
    if (step === 1) {
      if (isPhotoUploading) {
        setError("Espera a que termine la subida de la foto.");
        openAndGoToSection("identity");
        return;
      }
      const validation = validateStep1();
      if (!validation.ok || isIdentityDuplicate || isIdentityChecking) {
        if (isIdentityChecking) {
          setError("Espera a que termine la validación del documento.");
        } else if (isIdentityDuplicate) {
          setError("Este documento ya existe. Revisa la identidad antes de continuar.");
        }
        openAndGoToSection(validation.firstInvalidSection);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    submit();
  }

  function goToPreviousStep() {
    setError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : 1));
  }

  function addAffiliation() {
    if (!affDraft.entityClientId) {
      setError("Selecciona una entidad antes de agregar.");
      return;
    }

    const duplicate = affiliations.some(
      (item) => item.entityType === affDraft.entityType && item.entityClientId === affDraft.entityClientId
    );
    if (duplicate) {
      setError("Esta afiliación ya fue agregada.");
      return;
    }

    setAffiliations((prev) => [...prev, affDraft]);
    setAffDraft(DEFAULT_AFFILIATION);
    setError(null);
  }

  function removeAffiliation(index: number) {
    setAffiliations((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleServiceSegment(segment: ClientServiceSegment) {
    setForm((prev) => {
      const current = prev.serviceSegments;
      if (current.includes(segment)) {
        const next = current.filter((item) => item !== segment);
        return {
          ...prev,
          serviceSegments: next.length ? next : ["PARTICULAR"]
        };
      }
      return {
        ...prev,
        serviceSegments: [...current, segment]
      };
    });
  }

  function addRelatedContact() {
    setRelatedContacts((prev) => [
      ...prev,
      {
        id: randomId("related"),
        relationshipTypeId: "",
        linkedPerson: null,
        name: "",
        phone: ""
      }
    ]);
  }

  function updateRelatedContact(id: string, patch: Partial<RelatedContactDraft>) {
    setRelatedContacts((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeRelatedContact(id: string) {
    setRelatedContacts((prev) => prev.filter((item) => item.id !== id));
  }

  function clearProfilePhoto() {
    setProfilePhoto((prev) => {
      if (prev?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
    setPhotoError(null);
  }

  async function uploadProfilePhoto(file: File) {
    if (!PROFILE_PHOTO_ALLOWED_TYPES.has(file.type.toLowerCase())) {
      setPhotoError("Solo se permiten imágenes JPG, PNG o WEBP.");
      return;
    }
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setPhotoError("La foto no puede exceder 3MB.");
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setProfilePhoto((prev) => {
      if (prev?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return {
        assetId: "",
        previewUrl: localPreviewUrl,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size
      };
    });
    setPhotoError(null);
    setIsPhotoUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("scope", "clients/photos");
      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        assetId?: string;
      };
      if (!response.ok || payload.ok === false || !payload.assetId) {
        throw new Error(payload.error || "No se pudo subir la foto.");
      }

      setProfilePhoto((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          assetId: payload.assetId ?? ""
        };
      });
    } catch (uploadError) {
      setPhotoError((uploadError as Error)?.message || "No se pudo subir la foto.");
      setProfilePhoto((prev) => {
        if (prev?.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return null;
      });
    } finally {
      setIsPhotoUploading(false);
    }
  }

  function submit() {
    if (isPhotoUploading) {
      setError("Espera a que termine la subida de la foto.");
      openAndGoToSection("identity");
      return;
    }
    const validation = validateStep1();
    if (!validation.ok || isIdentityDuplicate || isIdentityChecking) {
      if (isIdentityChecking) setError("Espera a que termine la validación del documento.");
      if (isIdentityDuplicate) setError("Este documento ya existe. Revisa la identidad antes de guardar.");
      openAndGoToSection(validation.firstInvalidSection);
      return;
    }

    const acquisitionValidation = validateAcquisitionConditionalFields({
      sourceCode: selectedAcquisitionSource?.code,
      sourceName: selectedAcquisitionSource?.name,
      detailCode: selectedAcquisitionDetail?.code,
      detailName: selectedAcquisitionDetail?.name,
      detailOptionId: form.acquisitionDetailOptionId,
      otherNote: form.acquisitionOtherNote
    });
    if (acquisitionValidation.detailError) {
      setError(acquisitionValidation.detailError);
      setErrors((prev) => ({
        ...prev,
        acquisitionDetailOptionId: acquisitionValidation.detailError ?? undefined,
        acquisitionOtherNote: undefined
      }));
      openAndGoToSection("acquisition");
      return;
    }
    if (acquisitionValidation.noteError) {
      setError(acquisitionValidation.noteError);
      setErrors((prev) => ({
        ...prev,
        acquisitionDetailOptionId: undefined,
        acquisitionOtherNote: acquisitionValidation.noteError ?? undefined
      }));
      openAndGoToSection("acquisition");
      return;
    }
    if (sourceNeedsReferral && !referrer?.id) {
      setError("Selecciona el cliente referente.");
      openAndGoToSection("acquisition");
      return;
    }
    const effectiveBirthCountryId = form.birthSameAsIdentity ? form.identityCountryId : form.birthCountryId;
    if (!effectiveBirthCountryId) {
      setError("Selecciona país de nacimiento.");
      setErrors((prev) => ({ ...prev, birthCountryId: "País de nacimiento requerido." }));
      openAndGoToSection("profile");
      return;
    }
    setErrors((prev) => ({ ...prev, birthCountryId: undefined }));
    if (isMinor && !responsibleClient?.id) {
      setError("Menor de edad: selecciona un responsable.");
      openAndGoToSection("relations");
      return;
    }

    if (form.hasResidenceRecord && !hasResidenceDetails) {
      setError("Marca ubicación o dirección para registrar residencia.");
      openAndGoToSection("residence");
      return;
    }
    if (hasResidenceIntent && !form.addressGeneral.trim()) {
      setError("Ingresa la dirección de vivienda.");
      setErrors((prev) => ({ ...prev, addressGeneral: "Dirección de vivienda requerida." }));
      openAndGoToSection("residence");
      return;
    }

    const normalizedRelatedContacts = relatedContacts
      .map((item) => ({
        relationshipTypeId: item.relationshipTypeId.trim(),
        linkedPersonClientId: item.linkedPerson?.id ?? "",
        name: item.name.trim(),
        phone: sanitizePhoneInputValue(item.phone)
      }))
      .filter((item) => item.relationshipTypeId || item.linkedPersonClientId || item.name || item.phone);
    const invalidRelated = normalizedRelatedContacts.find(
      (item) => !item.relationshipTypeId || (!item.linkedPersonClientId && !item.name)
    );
    if (invalidRelated) {
      setError("Completa tipo de relación y nombre/persona vinculada en Relaciones.");
      openAndGoToSection("relations");
      return;
    }

    setError(null);
    setGeoErrors({});

    startTransition(async () => {
      try {
        const phones = contacts.phones
          .map((row) => ({
            category: row.category,
            relationType: row.relationType,
            value: row.value.trim(),
            countryIso2: row.countryIso2 || form.phoneCountryIso2 || undefined,
            canCall: row.canCall,
            canWhatsapp: row.canWhatsapp,
            isPrimary: row.isPrimary,
            isActive: row.isActive
          }))
          .filter((row) => row.value.length > 0);
        const emails = contacts.emails
          .map((row) => ({
            category: row.category,
            value: row.value.trim().toLowerCase(),
            isPrimary: row.isPrimary,
            isActive: row.isActive
          }))
          .filter((row) => row.value.length > 0);
        const primaryPhone = phones.find((row) => row.isPrimary) ?? phones[0];
        const primaryEmail = emails.find((row) => row.isPrimary) ?? emails[0];
        const shouldPersistResidence = hasResidenceIntent;
        const residenceSameAsBirth = Boolean(
          shouldPersistResidence && form.birthCountryId && form.residenceCountryId && form.birthCountryId === form.residenceCountryId
        );

        const result = await actionCreatePersonClient({
          firstName: form.firstName,
          middleName: form.middleName,
          thirdName: form.thirdName || undefined,
          lastName: form.lastName,
          secondLastName: form.secondLastName,
          thirdLastName: form.thirdLastName || undefined,
          sex: form.sex || undefined,
          birthDate: form.birthDate || undefined,
          bloodType: form.bloodType || undefined,
          professionCatalogId: form.professionCatalogId || undefined,
          maritalStatusId: form.maritalStatusId || undefined,
          academicLevelId: form.academicLevelId || undefined,
          serviceSegments: form.serviceSegments,
          responsibleClientId: isMinor ? responsibleClient?.id : undefined,
          guardianRelationshipTypeId: isMinor ? form.guardianRelationshipTypeId || undefined : undefined,
          acquisitionSourceId: form.acquisitionSourceId || undefined,
          acquisitionDetailOptionId: sourceNeedsSocialDetail ? form.acquisitionDetailOptionId || undefined : undefined,
          acquisitionOtherNote: sourceNeedsOtherNote ? form.acquisitionOtherNote || undefined : undefined,
          referredByClientId: sourceNeedsReferral ? referrer?.id : undefined,
          identityCountryId: form.identityCountryId || undefined,
          identityDocumentTypeId: form.identityDocumentTypeId || undefined,
          identityDocumentValue: form.identityDocumentValue || undefined,
          phone: primaryPhone?.value || form.phone,
          phoneCountryIso2: primaryPhone?.countryIso2 || form.phoneCountryIso2 || undefined,
          email: primaryEmail?.value || form.email || undefined,
          photoAssetId: profilePhoto?.assetId || undefined,
          birthCountryId: effectiveBirthCountryId || undefined,
          birthCity: form.birthCity || undefined,
          residenceCountryId: shouldPersistResidence ? form.residenceCountryId || undefined : undefined,
          residenceSameAsBirth: shouldPersistResidence ? residenceSameAsBirth : undefined,
          phones,
          emails,
          addressGeneral: shouldPersistResidence ? form.addressGeneral || undefined : undefined,
          addressHome: shouldPersistResidence ? form.addressGeneral || undefined : undefined,
          addressWork: form.addressWork || undefined,
          geoCountryId: shouldPersistResidence ? form.geoCountryId || undefined : undefined,
          geoAdmin1Id: shouldPersistResidence ? form.geoAdmin1Id || undefined : undefined,
          geoAdmin2Id: shouldPersistResidence ? form.geoAdmin2Id || undefined : undefined,
          geoAdmin3Id: shouldPersistResidence ? form.geoAdmin3Id || undefined : undefined,
          geoPostalCode: shouldPersistResidence ? form.geoPostalCode || undefined : undefined,
          geoFreeState: shouldPersistResidence ? form.geoFreeState || undefined : undefined,
          geoFreeCity: shouldPersistResidence ? form.geoFreeCity || undefined : undefined,
          workGeoCountryId: form.workGeoCountryId || undefined,
          workGeoAdmin1Id: form.workGeoAdmin1Id || undefined,
          workGeoAdmin2Id: form.workGeoAdmin2Id || undefined,
          workGeoAdmin3Id: form.workGeoAdmin3Id || undefined,
          workGeoPostalCode: form.workGeoPostalCode || undefined,
          workGeoFreeState: form.workGeoFreeState || undefined,
          workGeoFreeCity: form.workGeoFreeCity || undefined,
          relatedContacts: normalizedRelatedContacts.map((item) => ({
            relationshipTypeId: item.relationshipTypeId || undefined,
            linkedPersonClientId: item.linkedPersonClientId || undefined,
            name: item.name || undefined,
            phone: item.phone || undefined
          })),
          affiliations: affiliations.map((item) => ({
            entityType: item.entityType,
            entityClientId: item.entityClientId
          }))
        });

        const nextTab = affiliations.length ? "afiliaciones" : "resumen";
        router.push(`/admin/clientes/${result.id}?tab=${nextTab}`);
      } catch (err) {
        const message = (err as Error)?.message || "No se pudo crear la persona.";
        setError(message);

        if (message.toLowerCase().includes("país")) {
          setGeoErrors((prev) => ({ ...prev, geoCountryId: message }));
          openAndGoToSection("residence");
        }
        if (message.toLowerCase().includes("teléfono")) {
          setErrors((prev) => ({ ...prev, phone: message }));
          openAndGoToSection("phones");
        }
        if (message.toLowerCase().includes("nacimiento")) {
          setErrors((prev) => ({ ...prev, birthCountryId: message }));
          openAndGoToSection("profile");
        }
      }
    });
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Crear cliente</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
              Persona
            </h2>
            <p className="text-xs text-slate-500">{currentStepMeta.title}: {currentStepMeta.subtitle}</p>
          </div>
          <p className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-slate-700">
            Paso {step} de {WIZARD_STEPS.length}
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-[#4aa59c] transition-all duration-300" style={{ width: `${stepProgress}%` }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {WIZARD_STEPS.map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setStep(item.step)}
              disabled={isPending}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                item.step === step
                  ? "border-[#4aa59c] bg-[#4aa59c]/15 text-[#2e75ba]"
                  : "border-slate-200 bg-white text-slate-500 hover:border-[#4aadf5]/60",
                isPending && "cursor-not-allowed opacity-60"
              )}
            >
              {item.step}. {item.title}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIdentityDocument ? (
            <span className="rounded-full border border-[#4aadf5]/40 bg-[#4aadf5]/10 px-2 py-0.5 text-xs font-semibold text-[#2e75ba]">
              Doc: {(selectedIdentityCountryOption?.code ?? "").toUpperCase()} {selectedIdentityDocument.name}
            </span>
          ) : null}
          {primaryPhoneSummary ? (
            <span className="rounded-full border border-[#4aa59c]/40 bg-[#4aa59c]/10 px-2 py-0.5 text-xs font-semibold text-[#2e75ba]">
              Tel: {primaryPhoneSummary}
            </span>
          ) : null}
          {residenceCountrySummary ? (
            <span className="rounded-full border border-slate-300 bg-[#F8FAFC] px-2 py-0.5 text-xs font-semibold text-slate-600">
              Residencia: {residenceCountrySummary}
            </span>
          ) : null}
        </div>
      </div>

      {step === 1 && !canGoStep2 ? (
        <p className="text-xs text-slate-500">
          Completa primer nombre, primer apellido, documento y un teléfono principal válido para continuar.
        </p>
      ) : null}
      {step === 1 && isPhotoUploading ? <p className="text-xs text-slate-500">Subiendo foto de perfil...</p> : null}

      <div className={cn("grid gap-4", step === 4 ? "lg:grid-cols-12" : "grid-cols-1")}>
        {(step === 1 || step === 4) ? (
          <div className={cn("space-y-4", step === 4 && "lg:col-span-7")}>
          {step === 1 ? (
            <CollapsibleSection
              id="person-section-identity"
              title="Identidad"
              subtitle="Nombres y documento. País operativo permanece oculto en /nuevo."
              open={openSections.identity}
              onToggle={() => toggleSection("identity")}
            >
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <InputField
                  value={form.firstName}
                  onChange={(firstName) => setForm((prev) => ({ ...prev, firstName }))}
                  placeholder="Primer nombre *"
                  error={errors.firstName}
                  bold
                />
                <InputField
                  value={form.middleName}
                  onChange={(middleName) => setForm((prev) => ({ ...prev, middleName }))}
                  placeholder="Segundo nombre (opcional)"
                />
                <InputField
                  value={form.thirdName}
                  onChange={(thirdName) => setForm((prev) => ({ ...prev, thirdName }))}
                  placeholder="Tercer nombre (opcional)"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <InputField
                  value={form.lastName}
                  onChange={(lastName) => setForm((prev) => ({ ...prev, lastName }))}
                  placeholder="Primer apellido *"
                  error={errors.lastName}
                  bold
                />
                <InputField
                  value={form.secondLastName}
                  onChange={(secondLastName) => setForm((prev) => ({ ...prev, secondLastName }))}
                  placeholder="Segundo apellido (opcional)"
                />
                <InputField
                  value={form.thirdLastName}
                  onChange={(thirdLastName) => setForm((prev) => ({ ...prev, thirdLastName }))}
                  placeholder="Apellido de casado/a (opcional)"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <CountryPicker
                label="País de identificación / operación *"
                value={form.identityCountryId}
                options={countryOptions}
                onChange={(identityCountryId) => {
                  setForm((prev) => ({
                    ...prev,
                    identityCountryId,
                    birthCountryId: prev.birthSameAsIdentity ? identityCountryId : prev.birthCountryId || identityCountryId,
                    residenceCountryId: prev.residenceSameAsIdentity
                      ? identityCountryId
                      : prev.residenceCountryId || identityCountryId,
                    geoCountryId:
                      prev.residenceSameAsIdentity || !prev.geoCountryId ? identityCountryId : prev.geoCountryId,
                    geoAdmin1Id: prev.residenceSameAsIdentity ? "" : prev.geoAdmin1Id,
                    geoAdmin2Id: prev.residenceSameAsIdentity ? "" : prev.geoAdmin2Id,
                    geoAdmin3Id: prev.residenceSameAsIdentity ? "" : prev.geoAdmin3Id,
                    geoPostalCode: prev.residenceSameAsIdentity ? "" : prev.geoPostalCode,
                    geoFreeState: prev.residenceSameAsIdentity ? "" : prev.geoFreeState,
                    geoFreeCity: prev.residenceSameAsIdentity ? "" : prev.geoFreeCity
                  }));
                  setIdentityStatus({ state: "idle" });
                  setLastCheckedIdentityKey("");
                  setErrors((prev) => ({
                    ...prev,
                    geoCountryId: undefined,
                    identityDocumentTypeId: undefined,
                    identityDocumentValue: undefined
                  }));
                }}
                error={errors.geoCountryId}
                disabled={isPending}
              />

              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500">Tipo de documento de identidad *</p>
                <select
                  value={form.identityDocumentTypeId}
                  onChange={(e) => {
                    const identityDocumentTypeId = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      identityDocumentTypeId,
                      identityDocumentValue: ""
                    }));
                    setIdentityStatus({ state: "idle" });
                    setLastCheckedIdentityKey("");
                    setErrors((prev) => ({
                      ...prev,
                      identityDocumentTypeId: undefined,
                      identityDocumentValue: undefined
                    }));
                  }}
                  className={cn(
                    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
                    errors.identityDocumentTypeId && "border-rose-300 focus:border-rose-300 focus:ring-rose-200"
                  )}
                  disabled={isPending || !identityDocumentOptionsForUi.length}
                >
                  <option value="">Selecciona documento</option>
                  {identityDocumentOptionsForUi.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                {errors.identityDocumentTypeId ? <p className="text-xs text-rose-700">{errors.identityDocumentTypeId}</p> : null}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500">
                  Número de identificación{isIdentityOptional ? " (opcional)" : " *"}
                </p>
                <IconInput
                  icon={<IdCard size={16} className="text-slate-400" />}
                  value={form.identityDocumentValue}
                  onChange={(identityDocumentValue) => {
                    setForm((prev) => ({ ...prev, identityDocumentValue }));
                    setErrors((prev) => ({ ...prev, identityDocumentValue: undefined }));
                    if (identityStatus.state !== "idle") {
                      setIdentityStatus({ state: "idle" });
                    }
                  }}
                  onBlur={() => {
                    if (!form.identityDocumentValue.trim() && isIdentityOptional) return;
                    void runIdentityCheck(form.identityDocumentValue);
                  }}
                  placeholder={selectedIdentityDocument?.name ? `${selectedIdentityDocument.name}${isIdentityOptional ? " (opcional)" : ""}` : "Documento"}
                  error={errors.identityDocumentValue}
                />
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Foto (opcional)</p>
                <p className="text-xs text-slate-500">JPG, PNG o WEBP · máximo 3MB</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                  {profilePhoto?.previewUrl ? (
                    <img src={profilePhoto.previewUrl} alt="Vista previa foto de perfil" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500">Sin foto</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isPending || isPhotoUploading}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-3 py-1.5 text-xs font-semibold text-[#2e75ba]",
                      (isPending || isPhotoUploading) && "cursor-not-allowed opacity-60"
                    )}
                  >
                    {isPhotoUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    {profilePhoto ? "Cambiar foto" : "Subir foto"}
                  </button>
                  {profilePhoto ? (
                    <button
                      type="button"
                      onClick={clearProfilePhoto}
                      disabled={isPending || isPhotoUploading}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700",
                        (isPending || isPhotoUploading) && "cursor-not-allowed opacity-60"
                      )}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isPending || isPhotoUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadProfilePhoto(file);
                  }}
                />
              </div>
              {photoError ? <p className="mt-2 text-xs text-rose-700">{photoError}</p> : null}
            </div>

            {identityStatus.state !== "idle" ? (
              <div className="mt-2 text-xs">
                {identityStatus.state === "duplicate" && identityStatus.clientId ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                    <p>{identityStatus.message}</p>
                    <p className="mt-1">{identityStatus.label || "Cliente existente"}</p>
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/clientes/${identityStatus.clientId}`)}
                      className="mt-1 font-semibold underline"
                    >
                      Abrir perfil
                    </button>
                  </div>
                ) : (
                  <p className={cn(identityStatus.state === "available" ? "text-emerald-700" : "text-slate-500")}>
                    {identityStatus.message}
                  </p>
                )}
              </div>
            ) : null}
            </CollapsibleSection>
          ) : null}

          {step === 1 ? (
            <CollapsibleSection
              id="person-section-phones"
              title="Teléfono principal"
              subtitle="Código país separado y número local solo dígitos."
              open={openSections.phones}
              onToggle={() => toggleSection("phones")}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500">Número principal *</p>
                  <PhoneInput
                    label=""
                    value={primaryPhoneRow?.value ?? ""}
                    preferredGeoCountryId={form.identityCountryId || form.geoCountryId || null}
                    localOnly
                    onChange={(nextValue, meta) => {
                      setPrimaryPhoneMeta(meta);
                      upsertPrimaryPhone({
                        value: nextValue,
                        countryIso2: meta.selectedIso2 ?? (primaryPhoneRow?.countryIso2 || form.phoneCountryIso2 || "")
                      });
                      if (nextValue.trim() && meta.isValid) {
                        setErrors((prev) => ({ ...prev, phone: undefined }));
                      }
                    }}
                    disabled={isPending}
                    placeholder="Solo número local"
                    error={errors.phone}
                    className="space-y-0"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500">Categoría</p>
                  <select
                    value={primaryPhoneRow?.category ?? ClientPhoneCategory.PRIMARY}
                    onChange={(event) => upsertPrimaryPhone({ category: event.target.value as ClientPhoneCategory })}
                    disabled={isPending}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                  >
                    {PHONE_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Uso del número</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextCanCall = !primaryCanCall;
                      if (!nextCanCall && !primaryCanWhatsapp) return;
                      upsertPrimaryPhone({ canCall: nextCanCall });
                    }}
                    disabled={isPending}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                      primaryCanCall
                        ? "border-[#4aa59c] bg-[#4aa59c]/12 text-[#2e75ba]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[#4aadf5]/50",
                      isPending && "cursor-not-allowed opacity-60"
                    )}
                  >
                    Llamar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextCanWhatsapp = !primaryCanWhatsapp;
                      if (!nextCanWhatsapp && !primaryCanCall) return;
                      upsertPrimaryPhone({ canWhatsapp: nextCanWhatsapp });
                    }}
                    disabled={isPending}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                      primaryCanWhatsapp
                        ? "border-[#4aa59c] bg-[#4aa59c]/12 text-[#2e75ba]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[#4aadf5]/50",
                      isPending && "cursor-not-allowed opacity-60"
                    )}
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
            </CollapsibleSection>
          ) : null}

          {step === 4 ? (
            <CollapsibleSection
              id="person-section-phones"
              title={`Teléfonos adicionales (opcional) (${Math.max(contacts.phones.length - 1, 0)})`}
              subtitle="Agregar 2°, 3°... y ajustar principal único."
              open={openSections.phones}
              onToggle={() => toggleSection("phones")}
            >
              <ClientContactsEditor
                value={contacts}
                onChange={(next) => {
                  setContacts(next);
                  const primaryEmail = next.emails.find((row) => row.isPrimary && row.value.trim()) ?? next.emails.find((row) => row.value.trim());
                  setForm((prev) => ({ ...prev, email: primaryEmail?.value.trim().toLowerCase() || "" }));
                  if (next.phones.some((row) => row.value.trim())) {
                    setErrors((prev) => ({ ...prev, phone: undefined }));
                  }
                }}
                preferredGeoCountryId={form.identityCountryId || form.geoCountryId || null}
                disabled={isPending}
                requirePhone
                showExtendedPhoneFields
                showEmails={false}
                title=""
                subtitle=""
                className="border-none bg-transparent p-0 shadow-none"
              />
            </CollapsibleSection>
          ) : null}

          {step === 4 ? (
            <CollapsibleSection
              id="person-section-emails"
              title={`Correos (${contacts.emails.length})`}
              subtitle="Opcional con principal único."
              open={openSections.emails}
              onToggle={() => toggleSection("emails")}
            >
            <ClientContactsEditor
              value={contacts}
              onChange={(next) => {
                setContacts(next);
                const primaryEmail = next.emails.find((row) => row.isPrimary && row.value.trim()) ?? next.emails.find((row) => row.value.trim());
                setForm((prev) => ({ ...prev, email: primaryEmail?.value.trim().toLowerCase() || "" }));
              }}
              preferredGeoCountryId={form.identityCountryId || form.geoCountryId || null}
              disabled={isPending}
              requirePhone={false}
              showPhones={false}
              title=""
              subtitle=""
              className="border-none bg-transparent p-0 shadow-none"
            />
            </CollapsibleSection>
          ) : null}

          {step === 4 ? (
            <CollapsibleSection
              id="person-section-acquisition"
              title="Cómo nos conoció"
              subtitle="Canal y detalle condicional."
              open={openSections.acquisition}
              onToggle={() => toggleSection("acquisition")}
            >
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500">Canal</p>
                <select
                  value={form.acquisitionSourceId}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      acquisitionSourceId: e.target.value,
                      acquisitionDetailOptionId: "",
                      acquisitionOtherNote: ""
                    }));
                    setErrors((prev) => ({
                      ...prev,
                      acquisitionSourceId: undefined,
                      acquisitionDetailOptionId: undefined,
                      acquisitionOtherNote: undefined
                    }));
                  }}
                  className={cn(
                    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
                    errors.acquisitionSourceId && "border-rose-300 focus:border-rose-300 focus:ring-rose-200"
                  )}
                >
                  <option value="">Selecciona un canal (opcional)</option>
                  {acquisitionSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </div>

              {sourceNeedsSocialDetail ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500">Red social</p>
                  <select
                    value={form.acquisitionDetailOptionId}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, acquisitionDetailOptionId: e.target.value }));
                      setErrors((prev) => ({
                        ...prev,
                        acquisitionDetailOptionId: undefined,
                        acquisitionOtherNote: undefined
                      }));
                    }}
                    className={cn(
                      "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
                      errors.acquisitionDetailOptionId && "border-rose-300 focus:border-rose-300 focus:ring-rose-200"
                    )}
                  >
                    <option value="">Selecciona una red social *</option>
                    {acquisitionDetails.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {sourceNeedsOtherNote ? (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-semibold text-slate-500">
                  {sourceNeedsSocialDetail ? "Describe la red social (obligatorio)" : "Describe cómo nos conoció (obligatorio)"}
                </p>
                <textarea
                  value={form.acquisitionOtherNote}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      acquisitionOtherNote: e.target.value.slice(0, 150)
                    }));
                    setErrors((prev) => ({ ...prev, acquisitionOtherNote: undefined }));
                  }}
                  placeholder="Máximo 150 caracteres"
                  className={cn(
                    "min-h-[72px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
                    errors.acquisitionOtherNote && "border-rose-300 focus:border-rose-300 focus:ring-rose-200"
                  )}
                />
                <p className="text-right text-xs text-slate-500">{form.acquisitionOtherNote.length}/150</p>
              </div>
            ) : null}

            {sourceNeedsReferral ? (
              <div className="mt-2">
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
                  placeholder="Buscar por nombre, documento o teléfono"
                />
              </div>
            ) : null}
            </CollapsibleSection>
          ) : null}
          </div>
        ) : null}

        {(step === 2 || step === 3 || step === 4) ? (
          <div className={cn("space-y-4", step === 4 && "lg:col-span-5")}>
          {step === 3 ? (
            <CollapsibleSection
              id="person-section-profile"
              title="Perfil clínico y segmentación (opcional)"
              subtitle="Datos clínicos y generales."
              open={openSections.profile}
              onToggle={() => toggleSection("profile")}
            >
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={form.sex}
                onChange={(e) => setForm((prev) => ({ ...prev, sex: (e.target.value as PatientSex | "") || "" }))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              >
                <option value="">Sexo (opcional)</option>
                <option value={PatientSex.F}>Femenino</option>
                <option value={PatientSex.M}>Masculino</option>
              </select>

              <BrandedDatePicker
                label="Fecha de nacimiento"
                value={form.birthDate}
                onChange={(birthDate) => {
                  setForm((prev) => ({ ...prev, birthDate }));
                  setErrors((prev) => ({ ...prev, birthDate: undefined }));
                }}
                disabled={isPending}
                error={errors.birthDate}
              />

              <input
                value={ageYears === null ? "Edad no disponible" : `${ageYears} años`}
                readOnly
                className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                aria-label="Edad calculada"
              />

              <select
                value={form.bloodType}
                onChange={(e) => setForm((prev) => ({ ...prev, bloodType: e.target.value }))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              >
                {BLOOD_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <select
                value={form.professionCatalogId}
                onChange={(e) => setForm((prev) => ({ ...prev, professionCatalogId: e.target.value }))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              >
                <option value="">Profesión (opcional)</option>
                {professionOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                value={form.maritalStatusId}
                onChange={(e) => setForm((prev) => ({ ...prev, maritalStatusId: e.target.value }))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              >
                <option value="">Estado civil (opcional)</option>
                {maritalStatusOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                value={form.academicLevelId}
                onChange={(e) => setForm((prev) => ({ ...prev, academicLevelId: e.target.value }))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              >
                <option value="">Nivel académico (opcional)</option>
                {academicLevelOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.birthSameAsIdentity}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      birthSameAsIdentity: checked,
                      birthCountryId: checked ? prev.identityCountryId : prev.birthCountryId
                    }));
                    if (checked && form.identityCountryId) {
                      setErrors((prev) => ({ ...prev, birthCountryId: undefined }));
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                  disabled={isPending}
                />
                Nacimiento = Identificación
              </label>
              <CountryPicker
                label="País de nacimiento"
                value={form.birthCountryId}
                options={countryOptions}
                onChange={(birthCountryId) => {
                  setForm((prev) => ({ ...prev, birthCountryId }));
                  if (birthCountryId) setErrors((prev) => ({ ...prev, birthCountryId: undefined }));
                }}
                disabled={isPending || form.birthSameAsIdentity}
                error={errors.birthCountryId}
              />
              {form.birthSameAsIdentity ? <p className="text-xs text-slate-500">Usando país de identificación.</p> : null}
              <InputField
                value={form.birthCity}
                onChange={(birthCity) => setForm((prev) => ({ ...prev, birthCity }))}
                placeholder="Ciudad de nacimiento (opcional)"
              />
            </div>

            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tipo(s) de persona de la institución</p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_SEGMENT_OPTIONS.map((option) => {
                  const checked = form.serviceSegments.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        checked
                          ? "border-[#4aa59c] bg-[#4aa59c]/15 text-[#2e75ba]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-[#4aa59c]/40"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleServiceSegment(option.value)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                        disabled={isPending}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </div>
            </CollapsibleSection>
          ) : null}

          {step === 2 ? (
            <CollapsibleSection
              id="person-section-residence"
              title="Residencia"
              subtitle="Ubicación estructurada y dirección de vivienda."
              open={openSections.residence}
              onToggle={() => toggleSection("residence")}
            >
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.residenceSameAsIdentity}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((prev) => ({
                    ...prev,
                    residenceSameAsIdentity: checked,
                    residenceCountryId: checked ? prev.identityCountryId : prev.residenceCountryId,
                    geoCountryId: checked ? prev.identityCountryId : prev.geoCountryId
                  }));
                }}
                className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                disabled={isPending}
              />
              Residencia = Identificación
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.hasResidenceRecord}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    hasResidenceRecord: event.target.checked
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                disabled={isPending}
              />
              Tengo residencia registrada
            </label>

            <CountryPicker
              label="País de residencia"
              value={form.residenceCountryId}
              options={countryOptions}
              onChange={(residenceCountryId) =>
                setForm((prev) => ({
                  ...prev,
                  hasResidenceRecord: true,
                  residenceCountryId,
                  geoCountryId: residenceCountryId,
                  geoAdmin1Id: "",
                  geoAdmin2Id: "",
                  geoAdmin3Id: "",
                  geoPostalCode: "",
                  geoFreeState: "",
                  geoFreeCity: ""
                }))
              }
              disabled={isPending || form.residenceSameAsIdentity}
            />
            {form.residenceSameAsIdentity ? <p className="text-xs text-slate-500">Usando país de identificación.</p> : null}

            <GeoCascadeFieldset
              value={geoValue}
              onChange={(next) =>
                setForm((prev) => ({
                  ...prev,
                  hasResidenceRecord:
                    prev.hasResidenceRecord ||
                    Boolean(
                      next.geoAdmin1Id ||
                        next.geoAdmin2Id ||
                        next.geoAdmin3Id ||
                        next.geoPostalCode ||
                        next.geoFreeState ||
                        next.geoFreeCity
                    ),
                  geoCountryId: next.geoCountryId,
                  geoAdmin1Id: next.geoAdmin1Id,
                  geoAdmin2Id: next.geoAdmin2Id,
                  geoAdmin3Id: next.geoAdmin3Id,
                  geoPostalCode: next.geoPostalCode,
                  geoFreeState: next.geoFreeState ?? "",
                  geoFreeCity: next.geoFreeCity ?? ""
                }))
              }
              errors={geoErrors}
              disabled={isPending}
              title="Ubicación de residencia"
              subtitle="País, departamento y municipio."
            />

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">
                Dirección de vivienda (texto libre){hasResidenceIntent ? " *" : " (opcional)"}
              </p>
              <IconInput
                icon={<MapPin size={16} className="text-slate-400" />}
                value={form.addressGeneral}
                onChange={(addressGeneral) => {
                  setForm((prev) => ({
                    ...prev,
                    hasResidenceRecord: prev.hasResidenceRecord || Boolean(addressGeneral.trim()),
                    addressGeneral
                  }));
                  setErrors((prev) => ({ ...prev, addressGeneral: undefined }));
                }}
                placeholder="Ej: 2a calle 13-04 zona 14, Ciudad de Guatemala"
                error={errors.addressGeneral}
              />
            </div>
            </CollapsibleSection>
          ) : null}

          {step === 2 ? (
            <CollapsibleSection
              id="person-section-work"
              title="Trabajo (opcional)"
              subtitle="Ubicación y dirección laboral."
              open={openSections.work}
              onToggle={() => toggleSection("work")}
            >
            <GeoCascadeFieldset
              value={workGeoValue}
              onChange={(next) =>
                setForm((prev) => ({
                  ...prev,
                  workGeoCountryId: next.geoCountryId,
                  workGeoAdmin1Id: next.geoAdmin1Id,
                  workGeoAdmin2Id: next.geoAdmin2Id,
                  workGeoAdmin3Id: next.geoAdmin3Id,
                  workGeoPostalCode: next.geoPostalCode,
                  workGeoFreeState: next.geoFreeState ?? "",
                  workGeoFreeCity: next.geoFreeCity ?? ""
                }))
              }
              disabled={isPending}
              title="Ubicación de trabajo"
              subtitle="País y divisiones administrativas."
            />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Dirección de trabajo (texto)</p>
              <IconInput
                icon={<MapPin size={16} className="text-slate-400" />}
                value={form.addressWork}
                onChange={(addressWork) => setForm((prev) => ({ ...prev, addressWork }))}
                placeholder="Ej: Oficinas administrativas, Zona 10"
              />
            </div>
            </CollapsibleSection>
          ) : null}

          {step === 4 ? (
            <CollapsibleSection
              id="person-section-relations"
              title={`Relaciones (opcional)${relatedContacts.length ? ` (${relatedContacts.length})` : ""}`}
              subtitle="Vínculos familiares o contactos relacionados."
              open={openSections.relations}
              onToggle={() => toggleSection("relations")}
            >
            {isMinor ? (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Menor de edad</p>
                <ClientProfileLookup
                  label="Responsable legal *"
                  types={[ClientProfileType.PERSON]}
                  value={responsibleClient}
                  onChange={setResponsibleClient}
                  disabled={isPending}
                  placeholder="Buscar responsable"
                />
                <select
                  value={form.guardianRelationshipTypeId}
                  onChange={(e) => setForm((prev) => ({ ...prev, guardianRelationshipTypeId: e.target.value }))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                >
                  <option value="">Parentesco (opcional)</option>
                  {guardianRelationshipOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={addRelatedContact}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-3 py-1.5 text-xs font-semibold text-[#2e75ba] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlusCircle size={14} />
                Agregar relación
              </button>
            </div>

            {relatedContacts.length === 0 ? (
              <p className="mt-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-500">Sin relaciones agregadas.</p>
            ) : null}

            <div className="mt-2 space-y-2">
              {relatedContacts.map((item, index) => (
                <div key={item.id} className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-600">Relación #{index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeRelatedContact(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                    >
                      <Trash2 size={13} />
                      Quitar
                    </button>
                  </div>
                  <select
                    value={item.relationshipTypeId}
                    onChange={(e) => updateRelatedContact(item.id, { relationshipTypeId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                    disabled={isPending}
                  >
                    <option value="">Tipo de relación *</option>
                    {guardianRelationshipOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>

                  <ClientProfileLookup
                    label="Persona vinculada (si ya existe)"
                    types={[ClientProfileType.PERSON]}
                    value={item.linkedPerson}
                    onChange={(linkedPerson) => updateRelatedContact(item.id, { linkedPerson })}
                    disabled={isPending}
                    placeholder="Buscar persona existente (opcional)"
                  />

                  <div className="grid gap-2 sm:grid-cols-2">
                    <InputField
                      value={item.name}
                      onChange={(name) => updateRelatedContact(item.id, { name })}
                      placeholder="Nombre del relacionado"
                    />
                    <InputField
                      value={item.phone}
                      onChange={(phone) => updateRelatedContact(item.id, { phone: sanitizePhoneInputValue(phone) })}
                      placeholder="Teléfono relacionado (opcional)"
                    />
                  </div>
                </div>
              ))}
            </div>
            </CollapsibleSection>
          ) : null}

          {step === 4 ? (
            <CollapsibleSection
              id="person-section-affiliations"
              title={`Afiliaciones${affiliations.length ? ` (${affiliations.length})` : ""}`}
              subtitle="Empresa, institución o aseguradora."
              open={openSections.affiliations}
              onToggle={() => toggleSection("affiliations")}
            >
            <div className="grid gap-2">
              {affiliationEntityOptions.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {affiliationEntityOptions.map((option) => {
                    const active = affDraft.entityType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setAffDraft({
                            entityType: option.value,
                            entityClientId: "",
                            entityLabel: ""
                          })
                        }
                        disabled={isPending}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                          active
                            ? "border-[#4aa59c] bg-[#4aa59c]/12 text-[#2e75ba]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-[#4aadf5]/50",
                          isPending && "cursor-not-allowed opacity-60"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <ClientProfileLookup
                label={`Buscar ${CLIENT_TYPE_LABELS[affDraft.entityType]?.toLowerCase() ?? "entidad"}`}
                types={[affDraft.entityType]}
                value={
                  affDraft.entityClientId
                    ? { id: affDraft.entityClientId, type: affDraft.entityType, label: affDraft.entityLabel }
                    : null
                }
                onChange={(item) => {
                  setAffDraft((prev) => ({
                    ...prev,
                    entityClientId: item?.id ?? "",
                    entityLabel: item?.label ?? ""
                  }));
                }}
                disabled={isPending}
                placeholder="Escribe para buscar..."
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addAffiliation}
                  disabled={!affDraft.entityClientId || isPending}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-3 py-1.5 text-xs font-semibold text-[#2e75ba] hover:border-[#4aa59c]",
                    (!affDraft.entityClientId || isPending) && "cursor-not-allowed opacity-60"
                  )}
                >
                  <PlusCircle size={14} />
                  Agregar
                </button>
              </div>
            </div>

            {affiliations.length > 0 ? (
              <div className="mt-2 space-y-2">
                {affiliations.map((item, index) => (
                  <div key={`${item.entityType}-${item.entityClientId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.entityLabel}</p>
                      <p className="text-xs text-slate-500">{CLIENT_TYPE_LABELS[item.entityType]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAffiliation(index)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                    >
                      <Trash2 size={13} />
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-500">Sin afiliaciones todavía.</p>
            )}
            </CollapsibleSection>
          ) : null}
          </div>
        ) : null}
      </div>

      {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="sticky bottom-0 z-20 border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/clientes/personas")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft size={16} />
              Cancelar
            </button>
            {step > 1 ? (
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={isPending}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700",
                  isPending && "cursor-not-allowed opacity-60"
                )}
              >
                Anterior
              </button>
            ) : null}
          </div>

          {step < 4 ? (
            <button
              type="button"
              onClick={goToNextStep}
              disabled={isPending || isPhotoUploading || (step === 1 && (isIdentityChecking || !canGoStep2))}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]",
                (isPending || isPhotoUploading || (step === 1 && (isIdentityChecking || !canGoStep2))) &&
                  "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
              )}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={isPending || isIdentityChecking || isPhotoUploading}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]",
                (isPending || isIdentityChecking || isPhotoUploading) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
              )}
            >
              <UserPlus size={16} />
              Crear persona
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        ¿Ya existe este cliente? Usa <Link href="/admin/clientes/personas" className="font-semibold text-[#2e75ba]">Personas</Link> para buscar y abrir el perfil.
      </p>
    </div>
  );
}

function CollapsibleSection({
  id,
  title,
  subtitle,
  open,
  onToggle,
  children
}: {
  id: string;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section id={id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <span className="mt-0.5 text-slate-500">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
      </button>
      {open ? <div className="mt-3 space-y-2">{children}</div> : null}
    </section>
  );
}

function parseIsoDate(value: string) {
  const normalized = (value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(value: string) {
  const date = parseIsoDate(value);
  if (!date) return "";
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function isSameDate(left: Date | null, right: Date | null) {
  if (!left || !right) return false;
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildCalendarCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekDayMondayBased = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((firstWeekDayMondayBased + daysInMonth) / 7) * 7;
  const startDate = new Date(year, month, 1 - firstWeekDayMondayBased);

  return Array.from({ length: totalCells }).map((_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      key: toIsoDate(date),
      date,
      inCurrentMonth: date.getMonth() === month
    };
  });
}

function BrandedDatePicker({
  label,
  value,
  onChange,
  disabled,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = parseIsoDate(value) ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!selectedDate) return;
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [value, selectedDate]);

  const monthLabel = `${CALENDAR_MONTHS_ES[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`;
  const cells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const display = formatDateDisplay(value);

  return (
    <div className="relative space-y-1" ref={containerRef}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
          !display && "text-slate-400",
          error && "border-rose-300 focus:border-rose-300 focus:ring-rose-200",
          disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
        )}
      >
        <span>{display || "dd/mm/aaaa"}</span>
        <CalendarDays size={16} className="text-[#2e75ba]" />
      </button>

      {open && !disabled ? (
        <div className="absolute z-40 mt-2 w-[296px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#4aadf5] hover:bg-[#4aadf5]/10"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-[#2e75ba]">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#4aadf5] hover:bg-[#4aadf5]/10"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {CALENDAR_WEEK_DAYS_ES.map((day) => (
              <span key={day} className="text-center text-[11px] font-semibold text-slate-500">
                {day}
              </span>
            ))}
            {cells.map((cell) => {
              const selected = isSameDate(cell.date, selectedDate);
              const isToday = isSameDate(cell.date, todayDate);
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    if (!cell.inCurrentMonth) return;
                    onChange(toIsoDate(cell.date));
                    setOpen(false);
                  }}
                  disabled={!cell.inCurrentMonth}
                  className={cn(
                    "h-9 w-9 rounded-full text-sm font-semibold transition",
                    selected
                      ? "bg-[#4aa59c] text-white"
                      : cell.inCurrentMonth
                        ? "text-slate-700 hover:bg-[#4aadf5]/20"
                        : "cursor-not-allowed text-slate-300",
                    !selected && isToday && cell.inCurrentMonth && "border border-[#4aadf5]/60 text-[#2e75ba]"
                  )}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

function InputField({
  value,
  onChange,
  placeholder,
  error,
  bold
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  bold?: boolean;
}) {
  return (
    <div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
          bold && "font-semibold",
          error && "border-rose-300 focus:border-rose-300 focus:ring-rose-200"
        )}
      />
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}

function IconInput({
  icon,
  value,
  onChange,
  placeholder,
  onBlur,
  error
}: {
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onBlur?: () => void;
  error?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-[#4aa59c] focus-within:ring-2 focus-within:ring-[#4aa59c]/25",
          error && "border-rose-300 focus-within:border-rose-300 focus-within:ring-rose-200"
        )}
      >
        {icon}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-700 outline-none"
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
