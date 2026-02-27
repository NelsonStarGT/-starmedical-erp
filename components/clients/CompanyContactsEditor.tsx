"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { PlusCircle, Trash2, UserRound } from "lucide-react";
import PhoneNumberField from "@/components/phone/PhoneNumberField";
import TenantUserLookup, { type TenantUserLookupItem } from "@/components/clients/TenantUserLookup";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { filterJobTitlesByDepartment } from "@/lib/clients/contactDirectories";
import {
  buildCompanyContactPersonSummary,
  buildCompanyPbxExtensionPreview,
  COMPANY_PBX_AREA_PRESET_OPTIONS,
  COMPANY_PERSON_PHONE_MODE_OPTIONS,
  COMPANY_CONTACT_DEPARTMENT_OPTIONS,
  COMPANY_CONTACT_JOB_TITLE_OPTIONS,
  COMPANY_GENERAL_CHANNEL_LABEL_PRESET_OPTIONS,
  COMPANY_PERSON_EMAIL_LABEL_PRESET_OPTIONS,
  COMPANY_PERSON_PHONE_LABEL_PRESET_OPTIONS,
  COMPANY_PERSON_PHONE_TYPE_OPTIONS,
  applyCompanyPersonLinkedUser,
  resolveCompanyContactDepartment,
  resolveCompanyContactJobTitle,
  resolveCompanyPersonEmailLabel,
  resolveCompanyPersonPhoneLabel,
  normalizeCompanyGeneralChannels,
  reassignCompanyChannelOwnersOnPersonRemoval,
  resolveCompanyGeneralChannelLabel,
  type CompanyPersonPhoneMode,
  type CompanyPbxAreaPreset,
  type CompanyPersonEmailLabelPreset,
  type CompanyPersonPhoneLabelPreset,
  type CompanyPersonPhoneType,
  type CompanyEmploymentStatus,
  type CompanyGeneralChannelKind,
  type CompanyGeneralChannelOwnerType,
  type CompanyGeneralChannelLabelPreset,
  type CompanyPbxCategoryOption
} from "@/lib/clients/companyProfile";
import { cn } from "@/lib/utils";

export type CompanyGeneralChannelDraft = {
  id: string;
  kind: CompanyGeneralChannelKind;
  ownerType: CompanyGeneralChannelOwnerType;
  ownerPersonId: string | null;
  phoneLineType: "movil" | "fijo";
  label: string;
  labelPreset: CompanyGeneralChannelLabelPreset;
  labelOther: string;
  pbxAreaPreset: CompanyPbxAreaPreset;
  pbxAreaOther: string;
  value: string;
  extension: string;
  countryCode: string;
  countryIso2: string;
  isPrimary: boolean;
  isActive: boolean;
};

export type CompanyPersonPhoneDraft = {
  id: string;
  mode: CompanyPersonPhoneMode;
  phoneType: CompanyPersonPhoneType;
  labelPreset: CompanyPersonPhoneLabelPreset;
  labelOther: string;
  label: string;
  value: string;
  extension: string;
  pbxChannelId: string | null;
  countryCode: string;
  countryIso2: string;
  canCall: boolean;
  canWhatsApp: boolean;
  canSms: boolean;
  isWhatsApp: boolean;
  isPrimary: boolean;
  isActive: boolean;
};

export type CompanyPersonEmailDraft = {
  id: string;
  labelPreset: CompanyPersonEmailLabelPreset;
  labelOther: string;
  label: string;
  value: string;
  isPrimary: boolean;
  isActive: boolean;
};

export type CompanyContactPersonDraft = {
  id: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  departmentOther: string;
  jobTitleId: string;
  jobTitleOther: string;
  employmentStatus: CompanyEmploymentStatus;
  linkedUserId: string | null;
  linkedUserName: string | null;
  linkedUserEmail: string | null;
  department: string;
  role: string;
  isAreaPrimary: boolean;
  notes: string;
  phones: CompanyPersonPhoneDraft[];
  emails: CompanyPersonEmailDraft[];
};

export type CompanyContactsDraft = {
  generalChannels: CompanyGeneralChannelDraft[];
  people: CompanyContactPersonDraft[];
};

const GENERAL_KIND_PRIMARY_LABELS: Record<CompanyGeneralChannelKind, string> = {
  PHONE: "teléfono",
  EMAIL: "correo",
  WHATSAPP: "whatsapp"
};

type GeneralContactType = "PBX" | "FIJO" | "MOVIL" | "WHATSAPP" | "EMAIL";

const GENERAL_CONTACT_TYPE_OPTIONS: ReadonlyArray<{ value: GeneralContactType; label: string }> = [
  { value: "PBX", label: "PBX" },
  { value: "FIJO", label: "Fijo" },
  { value: "MOVIL", label: "Móvil" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" }
] as const;

const GENERAL_ROW_INPUT_CLASSNAME =
  "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25";

function normalizeCountryIso2(value: string) {
  return value
    .replace(/[^a-z]/gi, "")
    .toUpperCase()
    .slice(0, 2);
}

function normalizeCountryCode(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "+502";
  return `+${digits.slice(0, 4)}`;
}

function toCountryIso2FromCode(countryCode: string, fallbackIso2: string) {
  void countryCode;
  return normalizeCountryIso2(fallbackIso2 || "");
}

function buildPbxOptionLabel(channel: CompanyGeneralChannelDraft) {
  const label = channel.label.trim() || "PBX";
  const countryCode = channel.countryCode.trim();
  const numberLocal = channel.value.trim();
  if (countryCode && numberLocal) return `${label} · ${countryCode} ${numberLocal}`;
  if (numberLocal) return `${label} · ${numberLocal}`;
  return `${label} · sin número`;
}

function normalizeGeneralChannelOwner(row: CompanyGeneralChannelDraft): CompanyGeneralChannelDraft {
  return {
    ...row,
    ownerType: "COMPANY",
    ownerPersonId: null
  };
}

function resolveGeneralContactType(row: CompanyGeneralChannelDraft): GeneralContactType {
  if (row.kind === "EMAIL") return "EMAIL";
  if (row.kind === "WHATSAPP") return "WHATSAPP";
  if (row.labelPreset === "pbx") return "PBX";
  if (row.phoneLineType === "fijo") return "FIJO";
  return "MOVIL";
}

function applyGeneralContactType(
  row: CompanyGeneralChannelDraft,
  type: GeneralContactType,
  options: {
    defaultPbxAreaPreset: CompanyPbxAreaPreset;
  }
): CompanyGeneralChannelDraft {
  const fallbackPreset = row.labelPreset === "pbx" ? "recepcion" : row.labelPreset;
  if (type === "EMAIL") {
    return {
      ...row,
      kind: "EMAIL",
      phoneLineType: "movil",
      labelPreset: fallbackPreset,
      pbxAreaPreset: options.defaultPbxAreaPreset,
      pbxAreaOther: "",
      extension: "",
      countryCode: "",
      countryIso2: ""
    };
  }
  if (type === "WHATSAPP") {
    return {
      ...row,
      kind: "WHATSAPP",
      phoneLineType: "movil",
      labelPreset: fallbackPreset,
      pbxAreaPreset: options.defaultPbxAreaPreset,
      pbxAreaOther: "",
      extension: ""
    };
  }
  if (type === "PBX") {
    return {
      ...row,
      kind: "PHONE",
      phoneLineType: "fijo",
      labelPreset: "pbx",
      labelOther: "",
      pbxAreaPreset: row.pbxAreaPreset || options.defaultPbxAreaPreset
    };
  }
  if (type === "FIJO") {
    return {
      ...row,
      kind: "PHONE",
      phoneLineType: "fijo",
      labelPreset: fallbackPreset,
      pbxAreaPreset: options.defaultPbxAreaPreset,
      pbxAreaOther: ""
    };
  }
  return {
    ...row,
    kind: "PHONE",
    phoneLineType: "movil",
    labelPreset: fallbackPreset,
    pbxAreaPreset: options.defaultPbxAreaPreset,
    pbxAreaOther: "",
    extension: ""
  };
}

function syncGeneralChannelLabel(
  row: CompanyGeneralChannelDraft,
  pbxCategoryOptions?: ReadonlyArray<CompanyPbxCategoryOption>
) {
  const resolved = resolveCompanyGeneralChannelLabel({
    label: row.label,
    labelPreset: row.labelPreset,
    labelOther: row.labelOther,
    pbxAreaPreset: row.pbxAreaPreset,
    pbxAreaOther: row.pbxAreaOther
  }, {
    pbxCategoryOptions
  });
  return {
    ...row,
    labelPreset: resolved.labelPreset ?? "otro",
    labelOther: resolved.labelPreset === "otro" ? resolved.labelOther ?? "" : "",
    pbxAreaPreset: resolved.labelPreset === "pbx" ? resolved.pbxAreaPreset ?? "central" : "central",
    pbxAreaOther: resolved.labelPreset === "pbx" && resolved.pbxAreaPreset === "otro" ? resolved.pbxAreaOther ?? "" : "",
    label: resolved.label ?? ""
  };
}

function normalizeGeneralChannel(
  row: CompanyGeneralChannelDraft,
  pbxCategoryOptions?: ReadonlyArray<CompanyPbxCategoryOption>
): CompanyGeneralChannelDraft {
  const countryCode = normalizeCountryCode(row.countryCode);
  const countryIso2 = toCountryIso2FromCode(countryCode, row.countryIso2 || "");
  const next = syncGeneralChannelLabel(
    normalizeGeneralChannelOwner({
      ...row,
      extension: row.kind === "PHONE" && row.labelPreset !== "pbx" && row.phoneLineType === "fijo" ? row.extension : "",
      countryCode: row.kind === "EMAIL" ? "" : countryCode,
      countryIso2: row.kind === "EMAIL" ? "" : countryIso2
    }),
    pbxCategoryOptions
  );
  return next;
}

function syncPersonPhoneLabel(row: CompanyPersonPhoneDraft) {
  const resolved = resolveCompanyPersonPhoneLabel({
    label: row.label,
    labelPreset: row.labelPreset,
    labelOther: row.labelOther,
    phoneType: row.phoneType
  });
  return {
    ...row,
    labelPreset: resolved.labelPreset ?? "otro",
    labelOther: resolved.labelPreset === "otro" ? resolved.labelOther ?? "" : "",
    label: resolved.label ?? ""
  };
}

function normalizePersonPhone(row: CompanyPersonPhoneDraft, pbxChannels: CompanyGeneralChannelDraft[]): CompanyPersonPhoneDraft {
  const mode: CompanyPersonPhoneMode = row.mode === "EXTENSION_PBX" ? "EXTENSION_PBX" : "DIRECTO";
  const defaultPbx = pbxChannels.find((item) => item.isPrimary) ?? pbxChannels[0] ?? null;
  const selectedPbx = (row.pbxChannelId ? pbxChannels.find((item) => item.id === row.pbxChannelId) : null) ?? defaultPbx;
  const normalizedCountryCode = normalizeCountryCode(row.countryCode);
  const nextFromMode = mode === "EXTENSION_PBX"
    ? {
        ...row,
        mode,
        phoneType: "fijo" as const,
        labelPreset: "pbx" as const,
        labelOther: "",
        label: "PBX/Central",
        value: "",
        countryCode: selectedPbx?.countryCode || normalizedCountryCode,
        countryIso2: selectedPbx?.countryIso2 || toCountryIso2FromCode(normalizedCountryCode, row.countryIso2),
        pbxChannelId: selectedPbx?.id ?? row.pbxChannelId ?? null,
        canCall: true,
        canWhatsApp: false,
        canSms: false,
        isWhatsApp: false
      }
    : {
        ...row,
        mode,
        countryCode: normalizedCountryCode,
        countryIso2: toCountryIso2FromCode(normalizedCountryCode, row.countryIso2),
        pbxChannelId: null
      };

  if (mode === "EXTENSION_PBX") {
    return {
      ...nextFromMode,
      extension: nextFromMode.extension,
      canCall: true,
      canWhatsApp: false,
      canSms: false,
      isWhatsApp: false
    };
  }

  const next = syncPersonPhoneLabel({
    ...nextFromMode
  });
  const isWhatsAppType = next.phoneType === "whatsapp";
  const showExtension = next.labelPreset === "pbx" || next.phoneType === "fijo";
  const canWhatsApp = isWhatsAppType ? true : Boolean(next.canWhatsApp);
  const canCall = isWhatsAppType ? Boolean(next.canCall) : next.canCall !== false;
  const canSms = isWhatsAppType ? false : Boolean(next.canSms);
  return {
    ...next,
    mode: "DIRECTO",
    pbxChannelId: null,
    isWhatsApp: isWhatsAppType,
    canCall,
    canWhatsApp,
    canSms,
    extension: isWhatsAppType || !showExtension ? "" : next.extension
  };
}

function syncPersonEmailLabel(row: CompanyPersonEmailDraft) {
  const resolved = resolveCompanyPersonEmailLabel({
    label: row.label,
    labelPreset: row.labelPreset,
    labelOther: row.labelOther
  });
  return {
    ...row,
    labelPreset: resolved.labelPreset ?? "otro",
    labelOther: resolved.labelPreset === "otro" ? resolved.labelOther ?? "" : "",
    label: resolved.label ?? ""
  };
}

function normalizePersonEmail(row: CompanyPersonEmailDraft): CompanyPersonEmailDraft {
  return syncPersonEmailLabel({
    ...row,
    value: normalizeEmail(row.value)
  });
}

function normalizePerson(person: CompanyContactPersonDraft, pbxChannels: CompanyGeneralChannelDraft[]): CompanyContactPersonDraft {
  const department = resolveCompanyContactDepartment({
    departmentId: person.departmentId,
    departmentOther: person.departmentOther,
    department: person.department
  });
  const jobTitle = resolveCompanyContactJobTitle({
    jobTitleId: person.jobTitleId,
    jobTitleOther: person.jobTitleOther,
    role: person.role
  });
  return {
    ...person,
    departmentId: department.departmentId ?? "",
    departmentOther: department.departmentId === "otro" ? department.departmentOther ?? "" : "",
    department: department.departmentLabel ?? "",
    jobTitleId: jobTitle.jobTitleId ?? "",
    jobTitleOther: jobTitle.jobTitleId === "otro" ? jobTitle.jobTitleOther ?? "" : "",
    role: jobTitle.jobTitleLabel ?? "",
    phones: enforceSinglePrimary(
      person.phones.map((phone) => normalizePersonPhone(phone, pbxChannels)),
      () => "PHONE"
    ),
    emails: enforceSinglePrimary(
      person.emails.map((email) => normalizePersonEmail(email)),
      () => "EMAIL"
    )
  };
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function enforceSinglePrimary<T extends { isPrimary: boolean }>(
  rows: T[],
  getGroup: (row: T) => string
): T[] {
  const groups = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const key = getGroup(row);
    const bucket = groups.get(key) ?? [];
    bucket.push(index);
    groups.set(key, bucket);
  });

  const next = rows.map((row) => ({ ...row }));
  for (const indexes of groups.values()) {
    const selected = indexes.find((index) => next[index]?.isPrimary) ?? indexes[0];
    indexes.forEach((index) => {
      if (!next[index]) return;
      next[index].isPrimary = index === selected;
    });
  }
  return next;
}

function buildDefaultGeneralChannel(input?: {
  isPrimary?: boolean;
  labelPreset?: CompanyGeneralChannelLabelPreset;
  phoneLineType?: "movil" | "fijo";
  pbxAreaPreset?: CompanyPbxAreaPreset;
  countryCode?: string;
  kind?: CompanyGeneralChannelKind;
  pbxCategoryOptions?: ReadonlyArray<CompanyPbxCategoryOption>;
}): CompanyGeneralChannelDraft {
  const isPrimary = input?.isPrimary ?? true;
  const labelPreset = input?.labelPreset ?? "pbx";
  const kind = input?.kind ?? "PHONE";
  const phoneLineType = input?.phoneLineType ?? (labelPreset === "pbx" ? "fijo" : "movil");
  const countryCode = normalizeCountryCode(input?.countryCode ?? "+502");
  const countryIso2 = toCountryIso2FromCode(countryCode, "GT");
  const pbxAreaPreset = input?.pbxAreaPreset ?? "central";
  const resolvedLabel = resolveCompanyGeneralChannelLabel(
    { labelPreset, pbxAreaPreset },
    { pbxCategoryOptions: input?.pbxCategoryOptions }
  );
  return {
    id: randomId("general"),
    kind,
    ownerType: "COMPANY",
    ownerPersonId: null,
    phoneLineType,
    label: resolvedLabel.label ?? "",
    labelPreset,
    labelOther: "",
    pbxAreaPreset: resolvedLabel.pbxAreaPreset ?? pbxAreaPreset,
    pbxAreaOther: "",
    value: "",
    extension: "",
    countryCode: kind === "EMAIL" ? "" : countryCode,
    countryIso2: kind === "EMAIL" ? "" : countryIso2,
    isPrimary,
    isActive: true
  };
}

function buildDefaultPersonPhone(isPrimary = true): CompanyPersonPhoneDraft {
  const resolvedLabel = resolveCompanyPersonPhoneLabel({
    phoneType: "movil",
    labelPreset: "trabajo"
  });
  return {
    id: randomId("person_phone"),
    mode: "DIRECTO",
    phoneType: "movil",
    labelPreset: "trabajo",
    labelOther: "",
    label: resolvedLabel.label ?? "",
    value: "",
    extension: "",
    pbxChannelId: null,
    countryCode: "+502",
    countryIso2: "GT",
    canCall: true,
    canWhatsApp: false,
    canSms: false,
    isWhatsApp: false,
    isPrimary,
    isActive: true
  };
}

function buildDefaultPersonEmail(isPrimary = true): CompanyPersonEmailDraft {
  const resolvedLabel = resolveCompanyPersonEmailLabel({
    labelPreset: "trabajo"
  });
  return {
    id: randomId("person_email"),
    labelPreset: "trabajo",
    labelOther: "",
    label: resolvedLabel.label ?? "",
    value: "",
    isPrimary,
    isActive: true
  };
}

function buildDefaultPerson(): CompanyContactPersonDraft {
  return {
    id: randomId("person"),
    firstName: "",
    lastName: "",
    departmentId: "",
    departmentOther: "",
    jobTitleId: "",
    jobTitleOther: "",
    employmentStatus: "ACTIVE",
    linkedUserId: null,
    linkedUserName: null,
    linkedUserEmail: null,
    department: "",
    role: "",
    isAreaPrimary: false,
    notes: "",
    phones: [buildDefaultPersonPhone(true)],
    emails: []
  };
}

function ensureGeneralChannels(
  channels: CompanyGeneralChannelDraft[],
  options: {
    defaultPbxAreaPreset: CompanyPbxAreaPreset;
    pbxCategoryOptions?: ReadonlyArray<CompanyPbxCategoryOption>;
  }
): CompanyGeneralChannelDraft[] {
  const source = channels.map((row) => normalizeGeneralChannel(row, options.pbxCategoryOptions));
  const pbxRows = source.filter((row) => row.kind === "PHONE" && row.labelPreset === "pbx");
  const seeded = pbxRows.length
    ? source
    : [
        buildDefaultGeneralChannel({
          isPrimary: true,
          labelPreset: "pbx",
          pbxAreaPreset: options.defaultPbxAreaPreset,
          pbxCategoryOptions: options.pbxCategoryOptions
        }),
        ...source
      ];

  const withPhoneDefaults = seeded.map((row) =>
    row.kind === "PHONE" && row.labelPreset === "pbx"
      ? normalizeGeneralChannel(
          {
            ...row,
            kind: "PHONE",
            ownerType: "COMPANY",
            ownerPersonId: null,
            phoneLineType: "fijo",
            labelPreset: "pbx",
            labelOther: "",
            pbxAreaPreset: row.pbxAreaPreset || options.defaultPbxAreaPreset
          },
          options.pbxCategoryOptions
        )
      : normalizeGeneralChannel(row, options.pbxCategoryOptions)
  );

  const next = withPhoneDefaults.map((row) => ({ ...row }));
  const pbxIndexes = next
    .map((row, index) => (row.kind === "PHONE" && row.labelPreset === "pbx" ? index : -1))
    .filter((index) => index >= 0);
  const selectedPbxIndex = pbxIndexes.find((index) => next[index]?.isPrimary) ?? pbxIndexes[0] ?? -1;

  next.forEach((row, index) => {
    if (row.kind === "PHONE") {
      row.isPrimary = row.labelPreset === "pbx" ? index === selectedPbxIndex : false;
    }
  });

  const nonPhoneGroups = new Map<CompanyGeneralChannelKind, number[]>();
  next.forEach((row, index) => {
    if (row.kind === "PHONE") return;
    const group = nonPhoneGroups.get(row.kind) ?? [];
    group.push(index);
    nonPhoneGroups.set(row.kind, group);
  });
  for (const indexes of nonPhoneGroups.values()) {
    const selected = indexes.find((index) => next[index]?.isPrimary) ?? indexes[0];
    indexes.forEach((index) => {
      if (!next[index]) return;
      next[index].isPrimary = index === selected;
    });
  }

  return next;
}

function isSameGeneralChannels(left: CompanyGeneralChannelDraft[], right: CompanyGeneralChannelDraft[]) {
  if (left.length !== right.length) return false;
  return left.every((row, index) => {
    const candidate = right[index];
    if (!candidate) return false;
    return (
      row.id === candidate.id &&
      row.kind === candidate.kind &&
      row.ownerType === candidate.ownerType &&
      row.ownerPersonId === candidate.ownerPersonId &&
      row.phoneLineType === candidate.phoneLineType &&
      row.label === candidate.label &&
      row.labelPreset === candidate.labelPreset &&
      row.labelOther === candidate.labelOther &&
      row.pbxAreaPreset === candidate.pbxAreaPreset &&
      row.pbxAreaOther === candidate.pbxAreaOther &&
      row.value === candidate.value &&
      row.extension === candidate.extension &&
      row.countryCode === candidate.countryCode &&
      row.countryIso2 === candidate.countryIso2 &&
      row.isPrimary === candidate.isPrimary &&
      row.isActive === candidate.isActive
    );
  });
}

export const DEFAULT_COMPANY_CONTACTS: CompanyContactsDraft = {
  generalChannels: [buildDefaultGeneralChannel({ isPrimary: true, labelPreset: "pbx", pbxAreaPreset: "central" })],
  people: []
};

export default function CompanyContactsEditor({
  value,
  onChange,
  departmentOptions,
  jobTitleOptions,
  jobTitleIdsByDepartment,
  pbxCategoryOptions,
  pbxCategoriesSource,
  preferredGeoCountryId,
  disabled
}: {
  value: CompanyContactsDraft;
  onChange: (next: CompanyContactsDraft) => void;
  departmentOptions?: ReadonlyArray<{ id: string; label: string; isActive?: boolean }>;
  jobTitleOptions?: ReadonlyArray<{ id: string; label: string; isActive?: boolean }>;
  jobTitleIdsByDepartment?: Readonly<Record<string, string[]>>;
  pbxCategoryOptions?: ReadonlyArray<{ id: string; label: string; isActive?: boolean }>;
  pbxCategoriesSource?: "db" | "fallback";
  preferredGeoCountryId?: string | null;
  disabled?: boolean;
}) {
  const resolvedDepartmentOptions = useMemo(() => {
    const source = departmentOptions?.length
      ? departmentOptions
      : COMPANY_CONTACT_DEPARTMENT_OPTIONS.map((item) => ({ id: item.value, label: item.label, isActive: true }));
    const deduped = new Map<string, { id: string; label: string; isActive: boolean }>();
    for (const row of source) {
      const id = row.id.trim();
      if (!id) continue;
      const existing = deduped.get(id);
      const next = {
        id,
        label: row.label,
        isActive: row.isActive !== false
      };
      if (!existing) {
        deduped.set(id, next);
      } else if (!existing.isActive && next.isActive) {
        deduped.set(id, next);
      }
    }
    return Array.from(deduped.values());
  }, [departmentOptions]);

  const resolvedJobTitleOptions = useMemo(() => {
    const source = jobTitleOptions?.length
      ? jobTitleOptions
      : COMPANY_CONTACT_JOB_TITLE_OPTIONS.map((item) => ({ id: item.value, label: item.label, isActive: true }));
    const deduped = new Map<string, { id: string; label: string; isActive: boolean }>();
    for (const row of source) {
      const id = row.id.trim();
      if (!id) continue;
      const existing = deduped.get(id);
      const next = {
        id,
        label: row.label,
        isActive: row.isActive !== false
      };
      if (!existing) {
        deduped.set(id, next);
      } else if (!existing.isActive && next.isActive) {
        deduped.set(id, next);
      }
    }
    return Array.from(deduped.values());
  }, [jobTitleOptions]);

  const activeDepartmentOptions = useMemo(
    () => resolvedDepartmentOptions.filter((item) => item.isActive),
    [resolvedDepartmentOptions]
  );
  const activeJobTitleOptions = useMemo(
    () => resolvedJobTitleOptions.filter((item) => item.isActive),
    [resolvedJobTitleOptions]
  );
  const departmentOptionById = useMemo(
    () => new Map(resolvedDepartmentOptions.map((item) => [item.id, item] as const)),
    [resolvedDepartmentOptions]
  );
  const jobTitleOptionById = useMemo(
    () => new Map(resolvedJobTitleOptions.map((item) => [item.id, item] as const)),
    [resolvedJobTitleOptions]
  );

  const resolvedJobTitleIdsByDepartment = useMemo(() => {
    return jobTitleIdsByDepartment ?? {};
  }, [jobTitleIdsByDepartment]);

  const resolvedPbxCategoryOptions = useMemo(() => {
    const source = pbxCategoryOptions?.length
      ? pbxCategoryOptions
      : COMPANY_PBX_AREA_PRESET_OPTIONS.map((item) => ({ id: item.value, label: item.label, isActive: item.isActive !== false }));
    const deduped = new Map<string, { id: string; label: string; isActive: boolean }>();
    for (const row of source) {
      const id = row.id.trim();
      if (!id) continue;
      if (!deduped.has(id)) {
        deduped.set(id, {
          id,
          label: row.label,
          isActive: row.isActive !== false
        });
      }
    }
    if (deduped.size > 0) return Array.from(deduped.values());
    return COMPANY_PBX_AREA_PRESET_OPTIONS.map((item) => ({ id: item.value, label: item.label, isActive: true }));
  }, [pbxCategoryOptions]);

  const pbxCategoryResolverOptions = useMemo(
    () => resolvedPbxCategoryOptions.map((item) => ({ value: item.id, label: item.label, isActive: item.isActive })),
    [resolvedPbxCategoryOptions]
  );

  const defaultPbxAreaPreset = useMemo(() => {
    const firstActive = resolvedPbxCategoryOptions.find((item) => item.isActive);
    return firstActive?.id ?? resolvedPbxCategoryOptions[0]?.id ?? "central";
  }, [resolvedPbxCategoryOptions]);

  const pbxCategoryById = useMemo(
    () => new Map(resolvedPbxCategoryOptions.map((item) => [item.id, item] as const)),
    [resolvedPbxCategoryOptions]
  );
  const activePbxCategoryOptions = useMemo(
    () => resolvedPbxCategoryOptions.filter((item) => item.isActive),
    [resolvedPbxCategoryOptions]
  );

  const pbxChannels = value.generalChannels.filter((row) => row.kind === "PHONE" && row.labelPreset === "pbx");
  const defaultPbxChannel = pbxChannels.find((row) => row.isPrimary) ?? pbxChannels[0] ?? null;
  const hasDefinedPbxNumber = pbxChannels.some((row) => row.value.trim().length > 0);
  const normalizedGeneralChannels = useMemo(
    () => normalizeCompanyGeneralChannels(value.generalChannels, { pbxCategoryOptions: pbxCategoryResolverOptions }),
    [value.generalChannels, pbxCategoryResolverOptions]
  );

  function updateGeneralChannels(nextChannels: CompanyGeneralChannelDraft[]) {
    const ensuredChannels = ensureGeneralChannels(nextChannels, {
      defaultPbxAreaPreset,
      pbxCategoryOptions: pbxCategoryResolverOptions
    });
    const nextPbxChannels = ensuredChannels.filter((row) => row.kind === "PHONE" && row.labelPreset === "pbx");
    onChange({
      ...value,
      generalChannels: ensuredChannels,
      people: value.people.map((person) => normalizePerson(person, nextPbxChannels))
    });
  }

  useEffect(() => {
    const ensured = ensureGeneralChannels(value.generalChannels, {
      defaultPbxAreaPreset,
      pbxCategoryOptions: pbxCategoryResolverOptions
    });
    if (isSameGeneralChannels(value.generalChannels, ensured)) return;
    const ensuredPbxChannels = ensured.filter((row) => row.kind === "PHONE" && row.labelPreset === "pbx");
    onChange({
      ...value,
      generalChannels: ensured,
      people: value.people.map((person) => normalizePerson(person, ensuredPbxChannels))
    });
  }, [defaultPbxAreaPreset, onChange, pbxCategoryResolverOptions, value]);

  function updatePeople(nextPeople: CompanyContactPersonDraft[]) {
    const previousIds = new Set(value.people.map((person) => person.id));
    const nextIds = new Set(nextPeople.map((person) => person.id));
    const removedPersonIds = Array.from(previousIds).filter((id) => !nextIds.has(id));
    const reassignedChannels = removedPersonIds.length
      ? reassignCompanyChannelOwnersOnPersonRemoval(value.generalChannels, removedPersonIds)
      : value.generalChannels.map((row) => ({ ...row }));

    onChange({
      ...value,
      generalChannels: ensureGeneralChannels(reassignedChannels, {
        defaultPbxAreaPreset,
        pbxCategoryOptions: pbxCategoryResolverOptions
      }),
      people: nextPeople.map((person) => normalizePerson(person, pbxChannels))
    });
  }

  function setGeneralPrimary(targetId: string, kind: CompanyGeneralChannelKind) {
    if (kind === "PHONE") {
      updateGeneralChannels(
        value.generalChannels.map((row) => ({
          ...row,
          isPrimary: row.kind === "PHONE" && row.labelPreset === "pbx" ? row.id === targetId : row.isPrimary
        }))
      );
      return;
    }
    updateGeneralChannels(
      value.generalChannels.map((row) => ({
        ...row,
        isPrimary: row.kind === kind ? row.id === targetId : row.isPrimary
      }))
    );
  }

  function setPersonPhonePrimary(personId: string, phoneId: string) {
    updatePeople(
      value.people.map((person) => {
        if (person.id !== personId) return person;
        return {
          ...person,
          phones: person.phones.map((phone) => ({
            ...phone,
            isPrimary: phone.id === phoneId
          }))
        };
      })
    );
  }

  function setPersonEmailPrimary(personId: string, emailId: string) {
    updatePeople(
      value.people.map((person) => {
        if (person.id !== personId) return person;
        return {
          ...person,
          emails: person.emails.map((email) => ({
            ...email,
            isPrimary: email.id === emailId
          }))
        };
      })
    );
  }

  function personHasData(person: CompanyContactPersonDraft) {
    if (person.firstName.trim()) return true;
    if (person.lastName.trim()) return true;
    if (person.departmentId.trim()) return true;
    if (person.departmentOther.trim()) return true;
    if (person.jobTitleId.trim()) return true;
    if (person.jobTitleOther.trim()) return true;
    if (person.notes.trim()) return true;
    if (person.linkedUserId) return true;
    if (person.phones.some((row) => row.value.trim() || row.extension.trim() || row.labelOther.trim())) return true;
    if (person.emails.some((row) => row.value.trim() || row.labelOther.trim())) return true;
    return false;
  }

  const complementaryChannels = value.generalChannels;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">C0) Contactos generales de la empresa</p>
          <p className="text-xs text-slate-500">
            Canales de contacto de empresa por tipo (PBX/Fijo/Móvil/WhatsApp/Email).{" "}
            <Link
              href="/admin/clientes/configuracion?section=directorios"
              className="font-semibold text-[#2e75ba] underline decoration-[#2e75ba]/30 underline-offset-2"
            >
              Configurar etiquetas PBX
            </Link>
          </p>
        </div>
        {pbxCategoriesSource === "fallback" ? (
          <p className="text-[11px] text-slate-500">Usando categorías PBX por defecto. Puedes personalizarlas en Configuración.</p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              updateGeneralChannels([
                ...value.generalChannels,
                buildDefaultGeneralChannel({ isPrimary: false, labelPreset: "recepcion", kind: "PHONE" })
              ]);
            }}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-3 py-1.5 text-xs font-semibold text-[#2e75ba]",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <PlusCircle size={14} />
            Agregar contacto general
          </button>
        </div>
        <p className="rounded-lg border border-[#4aa59c]/20 bg-[#4aa59c]/5 px-3 py-2 text-xs text-slate-600">
          El Contacto #1 corresponde al canal general principal de la empresa.
        </p>

        {complementaryChannels.map((channel, rowIndex) => {
          const contactType = resolveGeneralContactType(channel);
          const hasSameKindPeers = complementaryChannels.some((row) => row.kind === channel.kind && row.id !== channel.id);
          const canChangePrimary = !disabled && hasSameKindPeers && (channel.kind !== "PHONE" || contactType === "PBX");
          const canRemove = !disabled && !channel.isPrimary;
          const selectableLabelOptions = COMPANY_GENERAL_CHANNEL_LABEL_PRESET_OPTIONS.filter((option) => option.value !== "pbx");
          const selectedCategory = pbxCategoryById.get(channel.pbxAreaPreset) ?? null;
          const selectedInactiveCategory = selectedCategory && !selectedCategory.isActive ? selectedCategory : null;
          const legacySelectedCategory =
            !selectedCategory && channel.pbxAreaPreset.trim()
              ? {
                  id: channel.pbxAreaPreset,
                  label: channel.pbxAreaOther.trim() || channel.pbxAreaPreset,
                  isActive: false
                }
              : null;
          const selectedOption = selectedInactiveCategory ?? legacySelectedCategory;
          const pbxAreaOptions = selectedOption
            ? [selectedOption, ...activePbxCategoryOptions]
            : activePbxCategoryOptions;
          const showExtension = contactType === "PBX" || contactType === "FIJO";

          return (
            <article key={channel.id} className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-600">
                  {rowIndex === 0 ? "Contacto #1 (empresa)" : `Contacto #${rowIndex + 1}`}
                </p>
                <button
                  type="button"
                  onClick={() => updateGeneralChannels(value.generalChannels.filter((row) => row.id !== channel.id))}
                  disabled={!canRemove}
                  title={!canRemove ? "No puedes eliminar un canal marcado como principal." : undefined}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700",
                    !canRemove && "cursor-not-allowed opacity-60"
                  )}
                >
                  <Trash2 size={13} />
                  Quitar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-12">
                <select
                  value={contactType}
                  onChange={(event) => {
                    const nextType = event.target.value as GeneralContactType;
                    updateGeneralChannels(
                      value.generalChannels.map((row) => {
                        if (row.id !== channel.id) return row;
                        return applyGeneralContactType(row, nextType, { defaultPbxAreaPreset });
                      })
                    );
                  }}
                  disabled={disabled}
                  className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-2")}
                >
                  {GENERAL_CONTACT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {contactType === "PBX" ? (
                  <select
                    value={channel.pbxAreaPreset}
                    onChange={(event) => {
                      const nextPreset = event.target.value as CompanyPbxAreaPreset;
                      updateGeneralChannels(
                        value.generalChannels.map((row) => {
                          if (row.id !== channel.id) return row;
                          const resolvedLabel = resolveCompanyGeneralChannelLabel({
                            labelPreset: "pbx",
                            pbxAreaPreset: nextPreset,
                            pbxAreaOther: nextPreset === "otro" ? row.pbxAreaOther : null
                          }, {
                            pbxCategoryOptions: pbxCategoryResolverOptions
                          });
                          return {
                            ...row,
                            kind: "PHONE",
                            phoneLineType: "fijo",
                            labelPreset: "pbx",
                            labelOther: "",
                            pbxAreaPreset: resolvedLabel.pbxAreaPreset ?? nextPreset,
                            pbxAreaOther: resolvedLabel.pbxAreaPreset === "otro" ? resolvedLabel.pbxAreaOther ?? row.pbxAreaOther : "",
                            label: resolvedLabel.label ?? row.label
                          };
                        })
                      );
                    }}
                    disabled={disabled}
                    className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-3")}
                  >
                    {pbxAreaOptions.map((option) => (
                      <option key={option.id} value={option.id} disabled={option.isActive === false && option.id !== channel.pbxAreaPreset}>
                        {option.label}
                        {option.isActive === false ? " (Inactiva)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={channel.labelPreset}
                    onChange={(event) => {
                      const nextPreset = event.target.value as CompanyGeneralChannelLabelPreset;
                      updateGeneralChannels(
                        value.generalChannels.map((row) => {
                          if (row.id !== channel.id) return row;
                          const resolvedLabel = resolveCompanyGeneralChannelLabel({
                            labelPreset: nextPreset,
                            labelOther: nextPreset === "otro" ? row.labelOther : null
                          }, {
                            pbxCategoryOptions: pbxCategoryResolverOptions
                          });
                          return {
                            ...row,
                            labelPreset: nextPreset,
                            labelOther: nextPreset === "otro" ? row.labelOther : "",
                            pbxAreaPreset: defaultPbxAreaPreset,
                            pbxAreaOther: "",
                            label: resolvedLabel.label ?? row.label
                          };
                        })
                      );
                    }}
                    disabled={disabled}
                    className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-3")}
                  >
                    {selectableLabelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {contactType === "PBX" && selectedOption ? (
                  <p className="md:col-span-2 lg:col-span-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                    Categoría PBX inactiva (se conserva por compatibilidad).
                  </p>
                ) : null}

                {channel.kind === "EMAIL" ? (
                  <input
                    value={channel.value}
                    onChange={(event) =>
                      updateGeneralChannels(
                        value.generalChannels.map((row) =>
                          row.id === channel.id
                            ? {
                                ...row,
                                value: normalizeEmail(event.target.value)
                              }
                            : row
                        )
                      )
                    }
                    disabled={disabled}
                    placeholder="correo@empresa.com"
                    className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-2 lg:col-span-5")}
                  />
                ) : (
                  <PhoneNumberField
                    label=""
                    value={channel.value}
                    preferredGeoCountryId={preferredGeoCountryId ?? null}
                    preferredCountryText={channel.countryIso2 || null}
                    localOnly
                    onChange={(nextValue, meta) =>
                      updateGeneralChannels(
                        value.generalChannels.map((row) =>
                          row.id === channel.id
                            ? {
                                ...row,
                                value: nextValue,
                                countryIso2: meta.selectedIso2 ?? row.countryIso2,
                                countryCode: meta.selectedDialCode ?? row.countryCode
                              }
                            : row
                        )
                      )
                    }
                    disabled={disabled}
                    placeholder="Número local"
                    className="min-w-0 space-y-0 md:col-span-2 lg:col-span-4"
                  />
                )}

                {showExtension ? (
                  <input
                    value={channel.extension}
                    onChange={(event) =>
                      updateGeneralChannels(
                        value.generalChannels.map((row) =>
                          row.id === channel.id
                            ? {
                                ...row,
                                extension: event.target.value
                              }
                            : row
                        )
                      )
                    }
                    disabled={disabled}
                    placeholder="Extensión"
                    className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-2")}
                  />
                ) : null}

                {contactType === "PBX" && channel.pbxAreaPreset === "otro" ? (
                  <div className="space-y-1 md:col-span-2 lg:col-span-12">
                    <input
                      value={channel.pbxAreaOther}
                      onChange={(event) =>
                        updateGeneralChannels(
                          value.generalChannels.map((row) => {
                            if (row.id !== channel.id) return row;
                            const pbxAreaOther = event.target.value.slice(0, 60);
                            const resolvedLabel = resolveCompanyGeneralChannelLabel({
                              labelPreset: "pbx",
                              pbxAreaPreset: "otro",
                              pbxAreaOther
                            }, {
                              pbxCategoryOptions: pbxCategoryResolverOptions
                            });
                            return {
                              ...row,
                              pbxAreaPreset: "otro",
                              pbxAreaOther,
                              label: resolvedLabel.label ?? row.label
                            };
                          })
                        )
                      }
                      disabled={disabled}
                      placeholder="Especificar área (máx 60)"
                      className={GENERAL_ROW_INPUT_CLASSNAME}
                    />
                    <p className="text-right text-[11px] text-slate-500">{channel.pbxAreaOther.length}/60</p>
                  </div>
                ) : null}

                {contactType !== "PBX" && channel.labelPreset === "otro" ? (
                  <div className="space-y-1 md:col-span-2 lg:col-span-12">
                    <input
                      value={channel.labelOther}
                      onChange={(event) =>
                        updateGeneralChannels(
                          value.generalChannels.map((row) => {
                            if (row.id !== channel.id) return row;
                            const labelOther = event.target.value.slice(0, 60);
                            const resolvedLabel = resolveCompanyGeneralChannelLabel({
                              labelPreset: "otro",
                              labelOther
                            }, {
                              pbxCategoryOptions: pbxCategoryResolverOptions
                            });
                            return {
                              ...row,
                              labelPreset: "otro",
                              labelOther,
                              label: resolvedLabel.label ?? ""
                            };
                          })
                        )
                      }
                      disabled={disabled}
                      placeholder="Especificar etiqueta (máx 60)"
                      className={GENERAL_ROW_INPUT_CLASSNAME}
                    />
                    <p className="text-right text-[11px] text-slate-500">{channel.labelOther.length}/60</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name={`general-primary-${channel.kind}`}
                      checked={channel.isPrimary}
                      onChange={() => setGeneralPrimary(channel.id, channel.kind)}
                      disabled={!canChangePrimary}
                      className="h-4 w-4 border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                    />
                    Principal ({GENERAL_KIND_PRIMARY_LABELS[channel.kind]})
                  </label>
                </div>
                <p className="text-[11px] font-semibold text-slate-500">
                  {channel.kind === "PHONE"
                    ? contactType === "PBX"
                      ? "Canal principal de telefonía de la empresa."
                      : "Extensión disponible solo para PBX o fijo."
                    : hasSameKindPeers
                      ? "Marca un único principal para este tipo."
                      : "Canal único: principal automático por tipo."}
                </p>
              </div>
            </article>
          );
        })}
        <p className="rounded-lg border border-[#4aa59c]/20 bg-[#4aa59c]/5 px-3 py-2 text-xs text-slate-600">
          {hasDefinedPbxNumber
            ? "Modo Extensión PBX disponible para personas de contacto."
            : "Define al menos un contacto tipo PBX con número para habilitar extensiones en C1."}
        </p>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">C1) Personas de contacto de la empresa</p>
          <p className="text-xs text-slate-500">Contactos profesionales por área/departamento con teléfonos y correos.</p>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => updatePeople([...value.people, buildDefaultPerson()])}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-3 py-1.5 text-xs font-semibold text-[#2e75ba]",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <PlusCircle size={14} />
            Agregar persona
          </button>
        </div>

        {!value.people.length ? (
          <p className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-500">
            Sin personas de contacto. Puedes guardar solo con C0 o agregar responsables por área.
          </p>
        ) : null}

        {value.people.map((person, index) => {
          const summary = buildCompanyContactPersonSummary(normalizePerson(person, pbxChannels), {
            pbxChannels: normalizedGeneralChannels
          });
          const selectedDepartment = person.departmentId ? departmentOptionById.get(person.departmentId) ?? null : null;
          const selectedJobTitle = person.jobTitleId ? jobTitleOptionById.get(person.jobTitleId) ?? null : null;
          const personDepartmentOptions = selectedDepartment && !selectedDepartment.isActive
            ? [selectedDepartment, ...activeDepartmentOptions]
            : activeDepartmentOptions;
          const personJobTitleActiveOptions = filterJobTitlesByDepartment(
            activeJobTitleOptions,
            person.departmentId,
            resolvedJobTitleIdsByDepartment
          );
          const personJobTitleOptions = selectedJobTitle && !selectedJobTitle.isActive
            ? [selectedJobTitle, ...personJobTitleActiveOptions]
            : personJobTitleActiveOptions;
          const isSelectedDepartmentInactive = Boolean(selectedDepartment && !selectedDepartment.isActive);
          const isSelectedJobTitleInactive = Boolean(selectedJobTitle && !selectedJobTitle.isActive);

          return (
            <article key={person.id} className="space-y-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600">
                      <UserRound size={14} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">Persona #{index + 1}</p>
                  </div>
                  <p className="text-xs text-slate-600">{summary.headline}</p>
                  {summary.chips.length ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {summary.chips.map((chip) => (
                        <span
                          key={`${person.id}-${chip}`}
                          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (personHasData(person) && typeof window !== "undefined") {
                      const confirmDelete = window.confirm("Esta persona tiene datos. ¿Deseas eliminarla?");
                      if (!confirmDelete) return;
                    }
                    updatePeople(value.people.filter((row) => row.id !== person.id));
                  }}
                  disabled={disabled}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                >
                  <Trash2 size={13} />
                  Eliminar persona
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-12">
              <input
                value={person.firstName}
                onChange={(event) =>
                  updatePeople(
                    value.people.map((row) =>
                      row.id === person.id
                        ? {
                            ...row,
                            firstName: event.target.value
                          }
                        : row
                    )
                  )
                }
                disabled={disabled}
                placeholder="Nombre *"
                className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-3")}
              />
              <input
                value={person.lastName}
                onChange={(event) =>
                  updatePeople(
                    value.people.map((row) =>
                      row.id === person.id
                        ? {
                            ...row,
                            lastName: event.target.value
                          }
                        : row
                    )
                  )
                }
                disabled={disabled}
                placeholder="Apellido *"
                className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-3")}
              />
              <div className="w-full min-w-0 space-y-1 md:col-span-1 lg:col-span-3">
                <SearchableSelect
                  value={person.departmentId}
                  onChange={(nextValue) =>
                    updatePeople(
                      value.people.map((row) => {
                        if (row.id !== person.id) return row;
                        const resolvedDepartment = resolveCompanyContactDepartment({
                          departmentId: nextValue
                        });
                        const selectedDepartmentLabel =
                          resolvedDepartment.departmentId === "otro"
                            ? null
                            : resolvedDepartment.departmentId
                              ? departmentOptionById.get(resolvedDepartment.departmentId)?.label ?? null
                              : null;
                        const departmentLabel =
                          selectedDepartmentLabel ??
                          resolvedDepartment.departmentLabel ??
                          resolvedDepartment.departmentOther ??
                          resolvedDepartment.departmentId ??
                          "";
                        const nextJobTitleOptions = filterJobTitlesByDepartment(
                          activeJobTitleOptions,
                          resolvedDepartment.departmentId ?? "",
                          resolvedJobTitleIdsByDepartment
                        );
                        const allowedJobTitleIds = new Set(nextJobTitleOptions.map((item) => item.id));
                        const keepCurrentJobTitle =
                          !row.jobTitleId ||
                          allowedJobTitleIds.has(row.jobTitleId) ||
                          (jobTitleOptionById.get(row.jobTitleId)?.isActive === false);
                        return {
                          ...row,
                          departmentId: resolvedDepartment.departmentId ?? "",
                          departmentOther: "",
                          department: departmentLabel,
                          jobTitleId: keepCurrentJobTitle ? row.jobTitleId : "",
                          jobTitleOther: keepCurrentJobTitle ? row.jobTitleOther : "",
                          role: keepCurrentJobTitle ? row.role : ""
                        };
                      })
                    )
                  }
                  options={personDepartmentOptions}
                  placeholder="Área / departamento *"
                  disabled={disabled}
                />
                {isSelectedDepartmentInactive ? (
                  <p className="text-[11px] font-semibold text-amber-700">Área inactiva (se conserva por compatibilidad).</p>
                ) : null}
                {person.departmentId === "otro" ? (
                  <input
                    value={person.departmentOther}
                    onChange={(event) =>
                      updatePeople(
                        value.people.map((row) =>
                          row.id === person.id
                            ? {
                                ...row,
                                departmentOther: event.target.value.slice(0, 60)
                              }
                            : row
                        )
                      )
                    }
                    disabled={disabled}
                    placeholder="Especificar área (máx 60)"
                    className={GENERAL_ROW_INPUT_CLASSNAME}
                  />
                ) : null}
              </div>
              <div className="w-full min-w-0 space-y-1 md:col-span-1 lg:col-span-3">
                <SearchableSelect
                  value={person.jobTitleId}
                  onChange={(nextValue) =>
                    updatePeople(
                      value.people.map((row) => {
                        if (row.id !== person.id) return row;
                        const resolvedTitle = resolveCompanyContactJobTitle({
                          jobTitleId: nextValue
                        });
                        const selectedJobTitleLabel =
                          resolvedTitle.jobTitleId === "otro"
                            ? null
                            : resolvedTitle.jobTitleId
                              ? personJobTitleOptions.find((item) => item.id === resolvedTitle.jobTitleId)?.label ?? null
                              : null;
                        const jobTitleLabel =
                          selectedJobTitleLabel ??
                          resolvedTitle.jobTitleLabel ??
                          resolvedTitle.jobTitleOther ??
                          resolvedTitle.jobTitleId ??
                          "";
                        return {
                          ...row,
                          jobTitleId: resolvedTitle.jobTitleId ?? "",
                          jobTitleOther: "",
                          role: jobTitleLabel
                        };
                      })
                    )
                  }
                  options={personJobTitleOptions}
                  placeholder="Cargo / puesto *"
                  disabled={disabled}
                />
                {isSelectedJobTitleInactive ? (
                  <p className="text-[11px] font-semibold text-amber-700">Cargo inactivo (se conserva por compatibilidad).</p>
                ) : null}
                {person.jobTitleId === "otro" ? (
                  <input
                    value={person.jobTitleOther}
                    onChange={(event) =>
                      updatePeople(
                        value.people.map((row) =>
                          row.id === person.id
                            ? {
                                ...row,
                                jobTitleOther: event.target.value.slice(0, 60)
                              }
                            : row
                        )
                      )
                    }
                    disabled={disabled}
                    placeholder="Especificar cargo (máx 60)"
                    className={GENERAL_ROW_INPUT_CLASSNAME}
                  />
                ) : null}
              </div>
              <select
                value={person.employmentStatus}
                onChange={(event) =>
                  updatePeople(
                    value.people.map((row) =>
                      row.id === person.id
                        ? {
                            ...row,
                            employmentStatus: event.target.value as CompanyEmploymentStatus
                          }
                        : row
                    )
                  )
                }
                disabled={disabled}
                className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-2 lg:col-span-3")}
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={person.isAreaPrimary}
                  onChange={() =>
                    updatePeople(
                      value.people.map((row) =>
                        row.id === person.id
                          ? {
                              ...row,
                              isAreaPrimary: !row.isAreaPrimary
                            }
                          : row
                      )
                    )
                  }
                  disabled={disabled}
                  className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                />
                Contacto principal del área
              </label>
              <p className="text-[11px] text-slate-500">Si hay teléfonos/correos, debe existir un principal por tipo.</p>
            </div>

            <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-2.5">
              <TenantUserLookup
                label="Vincular usuario del sistema (opcional)"
                value={
                  person.linkedUserId
                    ? {
                        id: person.linkedUserId,
                        name: person.linkedUserName || person.linkedUserEmail || person.linkedUserId,
                        email: person.linkedUserEmail || ""
                      }
                    : null
                }
                onChange={(item: TenantUserLookupItem | null) =>
                  updatePeople(
                    value.people.map((row) =>
                      row.id === person.id
                        ? applyCompanyPersonLinkedUser(row, item)
                        : row
                    )
                  )
                }
                disabled={disabled}
              />
              {person.linkedUserId ? (
                <p className="inline-flex items-center rounded-full bg-[#4aa59c]/10 px-2 py-1 text-[11px] font-semibold text-[#2e75ba]">
                  Vinculado a usuario: {person.linkedUserName || person.linkedUserEmail || person.linkedUserId}
                </p>
              ) : null}
            </div>

            <textarea
              value={person.notes}
              onChange={(event) =>
                updatePeople(
                  value.people.map((row) =>
                    row.id === person.id
                      ? {
                          ...row,
                          notes: event.target.value.slice(0, 180)
                        }
                      : row
                  )
                )
              }
              disabled={disabled}
              placeholder="Notas internas (opcional)"
              className="min-h-[68px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            />

            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Teléfonos internos</p>
                <button
                  type="button"
                  onClick={() =>
                    updatePeople(
                      value.people.map((row) => {
                        if (row.id !== person.id) return row;
                        return {
                          ...row,
                          phones: [...row.phones, buildDefaultPersonPhone(row.phones.length === 0)]
                        };
                      })
                    )
                  }
                  disabled={disabled}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-2 py-1 text-xs font-semibold text-[#2e75ba]",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                >
                  <PlusCircle size={13} />
                  Agregar teléfono
                </button>
              </div>

              {!person.phones.length ? <p className="text-xs text-slate-500">Sin teléfonos.</p> : null}

              {person.phones.map((phone) => {
                const isExtensionMode = phone.mode === "EXTENSION_PBX";
                const showExtension = isExtensionMode || phone.labelPreset === "pbx" || phone.phoneType === "fijo";
                const hasPeerPhone = person.phones.some((item) => item.id !== phone.id);
                const selectedPbx =
                  (phone.pbxChannelId ? pbxChannels.find((item) => item.id === phone.pbxChannelId) : null) ??
                  defaultPbxChannel ??
                  null;
                const pbxPreview = buildCompanyPbxExtensionPreview({
                  pbxLabel: selectedPbx?.label ?? null,
                  pbxCountryCode: selectedPbx?.countryCode || selectedPbx?.countryIso2 || null,
                  pbxValue: selectedPbx?.value ?? null,
                  extension: phone.extension
                });

                return (
                  <div key={phone.id} className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-2">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-12">
                      <select
                        value={phone.mode}
                        onChange={(event) =>
                          updatePeople(
                            value.people.map((row) => {
                              if (row.id !== person.id) return row;
                              return {
                                ...row,
                                phones: row.phones.map((item) => {
                                  if (item.id !== phone.id) return item;
                                  const nextMode = event.target.value as CompanyPersonPhoneMode;
                                  if (nextMode === "EXTENSION_PBX") {
                                    const fallbackPbx =
                                      pbxChannels.find((candidate) => candidate.isPrimary && candidate.value.trim()) ??
                                      pbxChannels.find((candidate) => candidate.value.trim()) ??
                                      defaultPbxChannel ??
                                      null;
                                    return {
                                      ...item,
                                      mode: "EXTENSION_PBX",
                                      phoneType: "fijo",
                                      labelPreset: "pbx",
                                      labelOther: "",
                                      label: "PBX/Central",
                                      value: "",
                                      pbxChannelId: fallbackPbx?.id ?? null,
                                      canCall: true,
                                      canWhatsApp: false,
                                      canSms: false,
                                      isWhatsApp: false
                                    };
                                  }
                                  return {
                                    ...item,
                                    mode: "DIRECTO",
                                    pbxChannelId: null,
                                    canCall: item.canCall !== false
                                  };
                                })
                              };
                            })
                          )
                        }
                        disabled={disabled}
                        className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-2")}
                      >
                        {COMPANY_PERSON_PHONE_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} disabled={option.value === "EXTENSION_PBX" && !hasDefinedPbxNumber}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      {isExtensionMode ? (
                        <>
                          <select
                            value={phone.pbxChannelId ?? selectedPbx?.id ?? ""}
                            onChange={(event) =>
                              updatePeople(
                                value.people.map((row) => {
                                  if (row.id !== person.id) return row;
                                  return {
                                    ...row,
                                    phones: row.phones.map((item) =>
                                      item.id === phone.id
                                        ? {
                                            ...item,
                                            pbxChannelId: event.target.value || null
                                          }
                                        : item
                                    )
                                  };
                                })
                              )
                            }
                            disabled={disabled || !hasDefinedPbxNumber}
                            className={cn(
                              GENERAL_ROW_INPUT_CLASSNAME,
                              "md:col-span-2 lg:col-span-4",
                              !hasDefinedPbxNumber && "cursor-not-allowed border-rose-200 bg-slate-100 text-rose-700"
                            )}
                          >
                            {!hasDefinedPbxNumber ? (
                              <option value="">Define un PBX en C0</option>
                            ) : null}
                            {pbxChannels.map((pbxChannelRow) => (
                              <option key={pbxChannelRow.id} value={pbxChannelRow.id}>
                                {buildPbxOptionLabel(pbxChannelRow)}
                              </option>
                            ))}
                          </select>
                          <input
                            value={phone.extension}
                            onChange={(event) =>
                              updatePeople(
                                value.people.map((row) => {
                                  if (row.id !== person.id) return row;
                                  return {
                                    ...row,
                                    phones: row.phones.map((item) =>
                                      item.id === phone.id
                                        ? {
                                            ...item,
                                            extension: event.target.value
                                          }
                                        : item
                                    )
                                  };
                                })
                              )
                            }
                            disabled={disabled}
                            placeholder="Extensión"
                            className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-3")}
                          />
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 md:col-span-2 lg:col-span-3">
                            {pbxPreview ? `Preview: ${pbxPreview}` : "Preview: PBX + ext"}
                          </div>
                        </>
                      ) : (
                        <>
                          <select
                            value={phone.phoneType}
                            onChange={(event) =>
                              updatePeople(
                                value.people.map((row) => {
                                  if (row.id !== person.id) return row;
                                  return {
                                    ...row,
                                    phones: row.phones.map((item) => {
                                      if (item.id !== phone.id) return item;
                                      const nextType = event.target.value as CompanyPersonPhoneType;
                                      const autoPreset = nextType === "whatsapp" ? "whatsapp" : item.labelPreset;
                                      const resolvedLabel = resolveCompanyPersonPhoneLabel({
                                        labelPreset: autoPreset,
                                        labelOther: autoPreset === "otro" ? item.labelOther : null,
                                        phoneType: nextType
                                      });
                                      return {
                                        ...item,
                                        phoneType: nextType,
                                        isWhatsApp: nextType === "whatsapp",
                                        canWhatsApp: nextType === "whatsapp" ? true : item.canWhatsApp,
                                        canSms: nextType === "whatsapp" ? false : item.canSms,
                                        canCall: nextType === "whatsapp" ? item.canCall : true,
                                        labelPreset: resolvedLabel.labelPreset ?? autoPreset,
                                        labelOther: resolvedLabel.labelPreset === "otro" ? item.labelOther : "",
                                        label: resolvedLabel.label ?? item.label,
                                        extension:
                                          nextType === "whatsapp" || (resolvedLabel.labelPreset !== "pbx" && nextType !== "fijo")
                                            ? ""
                                            : item.extension
                                      };
                                    })
                                  };
                                })
                              )
                            }
                            disabled={disabled}
                            className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-2")}
                          >
                            {COMPANY_PERSON_PHONE_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={phone.labelPreset}
                            onChange={(event) =>
                              updatePeople(
                                value.people.map((row) => {
                                  if (row.id !== person.id) return row;
                                  return {
                                    ...row,
                                    phones: row.phones.map((item) => {
                                      if (item.id !== phone.id) return item;
                                      const nextPreset = event.target.value as CompanyPersonPhoneLabelPreset;
                                      const resolvedLabel = resolveCompanyPersonPhoneLabel({
                                        labelPreset: nextPreset,
                                        labelOther: nextPreset === "otro" ? item.labelOther : null,
                                        phoneType: item.phoneType
                                      });
                                      return {
                                        ...item,
                                        labelPreset: nextPreset,
                                        labelOther: nextPreset === "otro" ? item.labelOther : "",
                                        label: resolvedLabel.label ?? item.label,
                                        canWhatsApp: item.phoneType === "whatsapp" ? true : item.canWhatsApp,
                                        extension:
                                          item.phoneType === "whatsapp" || (nextPreset !== "pbx" && item.phoneType !== "fijo")
                                            ? ""
                                            : item.extension
                                      };
                                    })
                                  };
                                })
                              )
                            }
                            disabled={disabled}
                            className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-2")}
                          >
                            {COMPANY_PERSON_PHONE_LABEL_PRESET_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <PhoneNumberField
                            label=""
                            value={phone.value}
                            preferredGeoCountryId={preferredGeoCountryId ?? null}
                            preferredCountryText={phone.countryIso2 || null}
                            localOnly
                            onChange={(nextValue, meta) =>
                              updatePeople(
                                value.people.map((row) => {
                                  if (row.id !== person.id) return row;
                                  return {
                                    ...row,
                                    phones: row.phones.map((item) =>
                                      item.id === phone.id
                                        ? {
                                            ...item,
                                            value: nextValue,
                                            countryIso2: meta.selectedIso2 ?? item.countryIso2,
                                            countryCode: meta.selectedDialCode ?? item.countryCode
                                          }
                                        : item
                                    )
                                  };
                                })
                              )
                            }
                            disabled={disabled}
                            placeholder="Número local"
                            className="min-w-0 space-y-0 md:col-span-2 lg:col-span-6"
                          />

                          {showExtension ? (
                            <input
                              value={phone.extension}
                              onChange={(event) =>
                                updatePeople(
                                  value.people.map((row) => {
                                    if (row.id !== person.id) return row;
                                    return {
                                      ...row,
                                      phones: row.phones.map((item) =>
                                        item.id === phone.id
                                          ? {
                                              ...item,
                                              extension: event.target.value
                                            }
                                          : item
                                      )
                                    };
                                  })
                                )
                              }
                              disabled={disabled}
                              placeholder="Ext."
                              className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-2")}
                            />
                          ) : (
                            <div className="hidden lg:block lg:col-span-2" />
                          )}

                          {phone.labelPreset === "otro" ? (
                            <div className="space-y-1 md:col-span-2 lg:col-span-12">
                              <input
                                value={phone.labelOther}
                                onChange={(event) =>
                                  updatePeople(
                                    value.people.map((row) => {
                                      if (row.id !== person.id) return row;
                                      return {
                                        ...row,
                                        phones: row.phones.map((item) => {
                                          if (item.id !== phone.id) return item;
                                          const labelOther = event.target.value.slice(0, 60);
                                          const resolvedLabel = resolveCompanyPersonPhoneLabel({
                                            labelPreset: "otro",
                                            labelOther,
                                            phoneType: item.phoneType
                                          });
                                          return {
                                            ...item,
                                            labelPreset: "otro",
                                            labelOther,
                                            label: resolvedLabel.label ?? ""
                                          };
                                        })
                                      };
                                    })
                                  )
                                }
                                disabled={disabled}
                                placeholder="Especificar etiqueta (máx 60)"
                                className={GENERAL_ROW_INPUT_CLASSNAME}
                              />
                              <p className="text-right text-[11px] text-slate-500">{phone.labelOther.length}/60</p>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>

                    {!hasDefinedPbxNumber && isExtensionMode ? (
                      <p className="text-xs text-rose-700">Define un PBX en C0 para usar extensiones.</p>
                    ) : null}

                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-12">
                      <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 md:col-span-1 lg:col-span-2">
                        <input
                          type="checkbox"
                          checked={phone.canCall}
                          onChange={() =>
                            updatePeople(
                              value.people.map((row) => {
                                if (row.id !== person.id) return row;
                                return {
                                  ...row,
                                  phones: row.phones.map((item) =>
                                    item.id === phone.id
                                      ? {
                                          ...item,
                                          canCall: !item.canCall
                                        }
                                      : item
                                  )
                                };
                              })
                            )
                          }
                          disabled={disabled}
                          className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                        />
                        Llamadas
                      </label>
                      {!isExtensionMode ? (
                        <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 md:col-span-1 lg:col-span-2">
                          <input
                            type="checkbox"
                            checked={phone.canWhatsApp}
                            onChange={() =>
                              updatePeople(
                                value.people.map((row) => {
                                  if (row.id !== person.id) return row;
                                  return {
                                    ...row,
                                    phones: row.phones.map((item) =>
                                      item.id === phone.id
                                        ? {
                                            ...item,
                                            canWhatsApp: !item.canWhatsApp
                                          }
                                        : item
                                    )
                                  };
                                })
                              )
                            }
                            disabled={disabled || phone.phoneType === "whatsapp"}
                            className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                          />
                          WhatsApp
                        </label>
                      ) : (
                        <div className="md:col-span-1 lg:col-span-2" />
                      )}
                      {!isExtensionMode ? (
                        <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 md:col-span-1 lg:col-span-2">
                          <input
                            type="checkbox"
                            checked={phone.canSms}
                            onChange={() =>
                              updatePeople(
                                value.people.map((row) => {
                                  if (row.id !== person.id) return row;
                                  return {
                                    ...row,
                                    phones: row.phones.map((item) =>
                                      item.id === phone.id
                                        ? {
                                            ...item,
                                            canSms: !item.canSms
                                          }
                                        : item
                                    )
                                  };
                                })
                              )
                            }
                            disabled={disabled || phone.phoneType === "whatsapp"}
                            className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                          />
                          SMS
                        </label>
                      ) : (
                        <div className="md:col-span-1 lg:col-span-2" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input
                          type="radio"
                          name={`person-phone-primary-${person.id}`}
                          checked={phone.isPrimary}
                          onChange={() => setPersonPhonePrimary(person.id, phone.id)}
                          disabled={disabled || !hasPeerPhone}
                          className="h-4 w-4 border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                        />
                        Principal (teléfono)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updatePeople(
                            value.people.map((row) => {
                              if (row.id !== person.id) return row;
                              return {
                                ...row,
                                phones: row.phones.filter((item) => item.id !== phone.id)
                              };
                            })
                          )
                        }
                        disabled={disabled}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700",
                          disabled && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <Trash2 size={12} />
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Correos internos</p>
                <button
                  type="button"
                  onClick={() =>
                    updatePeople(
                      value.people.map((row) => {
                        if (row.id !== person.id) return row;
                        return {
                          ...row,
                          emails: [...row.emails, buildDefaultPersonEmail(row.emails.length === 0)]
                        };
                      })
                    )
                  }
                  disabled={disabled}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-2 py-1 text-xs font-semibold text-[#2e75ba]",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                >
                  <PlusCircle size={13} />
                  Agregar correo
                </button>
              </div>

              {!person.emails.length ? <p className="text-xs text-slate-500">Sin correos.</p> : null}

              {person.emails.map((email) => {
                const hasPeerEmail = person.emails.some((item) => item.id !== email.id);
                return (
                  <div key={email.id} className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-2">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-12">
                      <input
                        value={email.value}
                        onChange={(event) =>
                          updatePeople(
                            value.people.map((row) => {
                              if (row.id !== person.id) return row;
                              return {
                                ...row,
                                emails: row.emails.map((item) =>
                                  item.id === email.id
                                    ? {
                                        ...item,
                                        value: normalizeEmail(event.target.value)
                                      }
                                    : item
                                )
                              };
                            })
                          )
                        }
                        disabled={disabled}
                        placeholder="correo@empresa.com"
                        className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-2 lg:col-span-6")}
                      />
                      <select
                        value={email.labelPreset}
                        onChange={(event) =>
                          updatePeople(
                            value.people.map((row) => {
                              if (row.id !== person.id) return row;
                              return {
                                ...row,
                                emails: row.emails.map((item) => {
                                  if (item.id !== email.id) return item;
                                  const nextPreset = event.target.value as CompanyPersonEmailLabelPreset;
                                  const resolvedLabel = resolveCompanyPersonEmailLabel({
                                    labelPreset: nextPreset,
                                    labelOther: nextPreset === "otro" ? item.labelOther : null
                                  });
                                  return {
                                    ...item,
                                    labelPreset: nextPreset,
                                    labelOther: nextPreset === "otro" ? item.labelOther : "",
                                    label: resolvedLabel.label ?? item.label
                                  };
                                })
                              };
                            })
                          )
                        }
                        disabled={disabled}
                        className={cn(GENERAL_ROW_INPUT_CLASSNAME, "md:col-span-1 lg:col-span-4")}
                      >
                        {COMPANY_PERSON_EMAIL_LABEL_PRESET_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 md:col-span-1 lg:col-span-2">
                        <input
                          type="radio"
                          name={`person-email-primary-${person.id}`}
                          checked={email.isPrimary}
                          onChange={() => setPersonEmailPrimary(person.id, email.id)}
                          disabled={disabled || !hasPeerEmail}
                          className="h-4 w-4 border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                        />
                        Principal
                      </label>

                      {email.labelPreset === "otro" ? (
                        <div className="space-y-1 md:col-span-2 lg:col-span-12">
                          <input
                            value={email.labelOther}
                            onChange={(event) =>
                              updatePeople(
                                value.people.map((row) => {
                                  if (row.id !== person.id) return row;
                                  return {
                                    ...row,
                                    emails: row.emails.map((item) => {
                                      if (item.id !== email.id) return item;
                                      const labelOther = event.target.value.slice(0, 60);
                                      const resolvedLabel = resolveCompanyPersonEmailLabel({
                                        labelPreset: "otro",
                                        labelOther
                                      });
                                      return {
                                        ...item,
                                        labelPreset: "otro",
                                        labelOther,
                                        label: resolvedLabel.label ?? ""
                                      };
                                    })
                                  };
                                })
                              )
                            }
                            disabled={disabled}
                            placeholder="Especificar etiqueta (máx 60)"
                            className={GENERAL_ROW_INPUT_CLASSNAME}
                          />
                          <p className="text-right text-[11px] text-slate-500">{email.labelOther.length}/60</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          updatePeople(
                            value.people.map((row) => {
                              if (row.id !== person.id) return row;
                              return {
                                ...row,
                                emails: row.emails.filter((item) => item.id !== email.id)
                              };
                            })
                          )
                        }
                        disabled={disabled}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700",
                          disabled && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <Trash2 size={12} />
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
