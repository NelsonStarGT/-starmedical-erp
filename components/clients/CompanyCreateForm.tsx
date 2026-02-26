"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientProfileType } from "@prisma/client";
import { Building2, PlusCircle } from "lucide-react";
import {
  actionCreateCompanyClient,
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
import {
  isReferralAcquisitionSource,
  isSocialAcquisitionSource,
  requiresAcquisitionOtherNote
} from "@/lib/clients/acquisition";
import { cn } from "@/lib/utils";

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
  companySizeRange: string;
  legalFormId: string;
  legalFormOther: string;
  economicActivityId: string;
  economicActivitySecondaryIds: string[];
  economicActivityOtherNote: string;
  acquisitionSourceId: string;
  acquisitionDetailOptionId: string;
  acquisitionOtherNote: string;
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

export default function CompanyCreateForm({
  initialOperatingDefaults,
  initialContactDirectories
}: {
  initialOperatingDefaults?: OperatingCountryDefaultsSnapshot;
  initialContactDirectories?: ClientContactDirectoriesSnapshot;
}) {
  const router = useRouter();
  const { country: countryContext } = useClientsCountryContext();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [geoErrors, setGeoErrors] = useState<GeoCascadeErrors>({});
  const [sources, setSources] = useState<AcquisitionSource[]>([]);
  const [detailOptions, setDetailOptions] = useState<AcquisitionDetail[]>([]);
  const [referrer, setReferrer] = useState<ClientProfileLookupItem | null>(null);

  const [form, setForm] = useState<FormState>({
    legalName: "",
    tradeName: "",
    nit: "",
    companySizeRange: "",
    legalFormId: "",
    legalFormOther: "",
    economicActivityId: "",
    economicActivitySecondaryIds: [],
    economicActivityOtherNote: "",
    acquisitionSourceId: "",
    acquisitionDetailOptionId: "",
    acquisitionOtherNote: "",
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
        const sourcesRes = await actionListClientAcquisitionSources();
        if (!mounted) return;
        setSources(sourcesRes.items as AcquisitionSource[]);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error)?.message || "No se pudo cargar catálogos iniciales.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

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
    () => requiresEconomicActivityOtherNote(form.economicActivityId),
    [form.economicActivityId]
  );
  const legalFormRequiresOther = useMemo(
    () => requiresCompanyLegalFormOther(form.legalFormId),
    [form.legalFormId]
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

  const canSubmit = useMemo(() => {
    if (!form.legalName.trim()) return false;
    if (!form.tradeName.trim()) return false;
    if (!form.nit.trim()) return false;
    if (!form.legalFormId.trim()) return false;
    if (!form.economicActivityId.trim()) return false;
    if (!form.address.trim()) return false;
    if (!form.geoCountryId.trim()) return false;
    if (!form.geoAdmin1Id.trim() && !form.geoFreeState.trim()) return false;
    if (!form.geoAdmin2Id.trim() && !form.geoFreeCity.trim()) return false;
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

    return true;
  }, [
    activityOtherNoteError,
    legalFormOtherError,
    contactPeopleDraftValidationError,
    contactPeopleValidationError,
    form,
    generalChannelsDraftValidationError,
    generalChannelsValidationError,
    hasAnyCompanyChannel,
    referrer?.id,
    sourceNeedsOtherNote,
    sourceNeedsReferral,
    sourceNeedsSocialDetail
  ]);

  const submit = () => {
    if (!canSubmit) return;

    startTransition(async () => {
      try {
        setGeoErrors({});
        setError(null);

        const primaryGeneralPhone = pickPrimaryGeneralPhone(normalizedGeneralChannels);
        const primaryGeneralEmail = pickPrimaryGeneralEmail(normalizedGeneralChannels);
        const primaryPersonPhone = pickPrimaryPersonPhone(normalizedContactPeople);
        const primaryPersonEmail = pickPrimaryPersonEmail(normalizedContactPeople);

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

        const result = await actionCreateCompanyClient({
          legalName: form.legalName,
          tradeName: form.tradeName,
          country: undefined,
          nit: form.nit,
          companySizeRange: form.companySizeRange || undefined,
          legalForm: form.legalFormId,
          legalFormOther: legalFormRequiresOther ? form.legalFormOther : undefined,
          economicActivityId: form.economicActivityId,
          economicActivitySecondaryIds: form.economicActivitySecondaryIds.filter((item) => item !== form.economicActivityId),
          economicActivityOtherNote: activityRequiresOtherNote ? form.economicActivityOtherNote : undefined,
          acquisitionSourceId: form.acquisitionSourceId || undefined,
          acquisitionDetailOptionId: sourceNeedsSocialDetail ? form.acquisitionDetailOptionId || undefined : undefined,
          acquisitionOtherNote: sourceNeedsOtherNote ? form.acquisitionOtherNote : undefined,
          referredByClientId: sourceNeedsReferral ? referrer?.id : undefined,
          phone: primaryGeneralPhone?.value || primaryPersonPhone?.value || undefined,
          phoneCountryIso2: primaryGeneralPhone?.countryIso2 || primaryPersonPhone?.countryIso2 || undefined,
          email: primaryGeneralEmail?.value || primaryPersonEmail?.value || undefined,
          phones: legacyPhones,
          emails: legacyEmails,
          generalChannels: contacts.generalChannels.map((row) => ({
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
              resolveCompanyGeneralChannelLabel({
                label: row.label,
                labelPreset: row.labelPreset,
                labelOther: row.labelOther,
                pbxAreaPreset: row.pbxAreaPreset,
                pbxAreaOther: row.pbxAreaOther
              }, {
                pbxCategoryOptions: pbxCategoryOptions.map((item) => ({ value: item.id, label: item.label, isActive: item.isActive }))
              }).label ?? row.label,
            value: row.value,
            extension: row.extension,
            countryCode: row.countryCode,
            countryIso2: row.countryIso2,
            isPrimary: row.isPrimary,
            isActive: row.isActive
          })),
          contactPeople: contacts.people.map((row) => ({
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
          })),
          useSameAddressForFiscal: form.useSameAddressForFiscal,
          address: form.address,
          geoCountryId: form.geoCountryId || undefined,
          geoAdmin1Id: form.geoAdmin1Id || undefined,
          geoAdmin2Id: form.geoAdmin2Id || undefined,
          geoAdmin3Id: form.geoAdmin3Id || undefined,
          geoPostalCode: form.geoPostalCode || undefined,
          geoFreeState: form.geoFreeState || undefined,
          geoFreeCity: form.geoFreeCity || undefined
        });

        router.push(`/admin/clientes/${result.id}?tab=contactos`);
      } catch (err) {
        const message = (err as Error)?.message || "No se pudo crear la empresa.";
        setError(message);
        if (message.toLowerCase().includes("país")) {
          setGeoErrors((prev) => ({ ...prev, geoCountryId: message }));
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">Crear cliente</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Empresa
        </h2>
        <p className="text-sm text-slate-600">Alta empresarial con identidad fiscal, perfil comercial, ubicación y contactos por área.</p>
      </div>

      <section className="space-y-5 rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">A) Identidad fiscal y perfil</p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.legalName}
                onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value }))}
                placeholder="Razón social *"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              />
            </div>
            <input
              value={form.tradeName}
              onChange={(e) => setForm((prev) => ({ ...prev, tradeName: e.target.value }))}
              placeholder="Nombre comercial *"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            />

            <input
              value={form.nit}
              onChange={(e) => setForm((prev) => ({ ...prev, nit: e.target.value }))}
              placeholder="Documento fiscal (NIT) *"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            />

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

            <div className="space-y-1">
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

            {activityRequiresOtherNote && (
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-semibold text-slate-500">Especifica la actividad económica (obligatorio cuando seleccionas “Otro”).</p>
                <textarea
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

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">B) Ubicación</p>
          <p className="text-xs text-slate-500">Se usará como dirección operativa y puede marcarse temporalmente como fiscal.</p>

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
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Ej: 2a calle 13-04 zona 14, Colonia Tecún Umán, Guatemala *"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            />

            <GeoCascadeFieldset
              value={geoValue}
              onChange={(next) =>
                setForm((prev) => ({
                  ...prev,
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
              title="Ubicación principal"
              subtitle="País + divisiones administrativas; fallback texto libre si el país no tiene catálogo cargado."
              requireCountry
              requireAdmin1
              requireAdmin2
            />
          </div>
        </div>

        <div className="space-y-2">
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

        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]",
              (!canSubmit || isPending) && "cursor-not-allowed opacity-60"
            )}
          >
            <PlusCircle size={16} />
            Crear empresa
          </button>
        </div>

        {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      </section>
    </div>
  );
}
