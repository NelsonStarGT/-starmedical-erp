import {
  COMPANY_CONTACT_DEPARTMENTS,
  COMPANY_CONTACT_DEPARTMENT_OTHER_ID
} from "@/lib/catalogs/departments";
import {
  COMPANY_CONTACT_JOB_TITLES,
  COMPANY_CONTACT_JOB_TITLE_OTHER_ID
} from "@/lib/catalogs/jobTitles";
import { COMPANY_PBX_CATEGORY_FALLBACK, COMPANY_PBX_CATEGORY_SEED } from "@/lib/catalogs/pbxCategories";

export type ClientContactDirectoryItem = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type ClientContactDirectoryCorrelation = {
  departmentId: string;
  jobTitleIds: string[];
};

export type ClientContactDirectoriesSnapshot = {
  source: "db" | "fallback";
  departments: ClientContactDirectoryItem[];
  departmentsSource: "db" | "fallback";
  jobTitles: ClientContactDirectoryItem[];
  jobTitlesSource: "db" | "fallback";
  correlations: ClientContactDirectoryCorrelation[];
  pbxCategories: ClientContactDirectoryItem[];
  pbxCategoriesSource: "db" | "fallback";
};

const SORT_STEP = 10;

function normalizeToken(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeContactDirectoryCode(input: {
  value?: string | null;
  fallbackName?: string | null;
}) {
  const code = normalizeToken(input.value);
  if (code) return code.slice(0, 64);
  const fallback = normalizeToken(input.fallbackName);
  if (fallback) return fallback.slice(0, 64);
  return "";
}

export function resolveUniqueContactDirectoryCode(input: {
  baseCode: string;
  existingCodes: ReadonlyArray<string>;
  maxLength?: number;
}) {
  const maxLength = Number.isFinite(input.maxLength) ? Math.max(8, Math.floor(input.maxLength!)) : 64;
  const normalizedBase = normalizeContactDirectoryCode({ value: input.baseCode }).slice(0, maxLength);
  if (!normalizedBase) return "";

  const usedCodes = new Set(
    input.existingCodes
      .map((item) => normalizeContactDirectoryCode({ value: item }))
      .filter(Boolean)
  );

  if (!usedCodes.has(normalizedBase)) return normalizedBase;

  for (let suffix = 2; suffix <= 999; suffix += 1) {
    const suffixToken = `_${suffix}`;
    const baseLimit = Math.max(1, maxLength - suffixToken.length);
    const base = normalizedBase.slice(0, baseLimit).replace(/_+$/g, "");
    const candidate = `${base}${suffixToken}`;
    if (!usedCodes.has(candidate)) {
      return candidate;
    }
  }

  return "";
}

export function resolveMissingPbxCategoryDefaults(
  items: ReadonlyArray<{
    code?: string | null;
    name?: string | null;
  }>
) {
  const existingCodes = new Set(items.map((item) => normalizeContactDirectoryCode({ value: item.code })).filter(Boolean));
  const existingNames = new Set(items.map((item) => normalizeContactDirectoryCode({ value: item.name })).filter(Boolean));

  return COMPANY_PBX_CATEGORY_SEED.filter((item) => {
    const code = normalizeContactDirectoryCode({ value: item.id });
    const name = normalizeContactDirectoryCode({ value: item.label });
    if (existingCodes.has(code)) return false;
    if (existingNames.has(name)) return false;
    return true;
  });
}

export function resolveMissingDepartmentDefaults(
  items: ReadonlyArray<{
    code?: string | null;
    name?: string | null;
  }>
) {
  const existingCodes = new Set(items.map((item) => normalizeContactDirectoryCode({ value: item.code })).filter(Boolean));
  const existingNames = new Set(items.map((item) => normalizeContactDirectoryCode({ value: item.name })).filter(Boolean));

  return COMPANY_CONTACT_DEPARTMENTS.filter((item) => {
    const code = normalizeContactDirectoryCode({ value: item.id });
    const name = normalizeContactDirectoryCode({ value: item.label });
    if (existingCodes.has(code)) return false;
    if (existingNames.has(name)) return false;
    return true;
  });
}

export function resolveMissingJobTitleDefaults(
  items: ReadonlyArray<{
    code?: string | null;
    name?: string | null;
  }>
) {
  const existingCodes = new Set(items.map((item) => normalizeContactDirectoryCode({ value: item.code })).filter(Boolean));
  const existingNames = new Set(items.map((item) => normalizeContactDirectoryCode({ value: item.name })).filter(Boolean));

  return COMPANY_CONTACT_JOB_TITLES.filter((item) => {
    const code = normalizeContactDirectoryCode({ value: item.id });
    const name = normalizeContactDirectoryCode({ value: item.label });
    if (existingCodes.has(code)) return false;
    if (existingNames.has(name)) return false;
    return true;
  });
}

export function buildFallbackClientContactDirectories(tenantId = "global"): ClientContactDirectoriesSnapshot {
  return {
    source: "fallback",
    departments: COMPANY_CONTACT_DEPARTMENTS.map((item, index) => ({
      id: item.id,
      tenantId,
      code: item.id,
      name: item.label,
      description: null,
      sortOrder: (index + 1) * SORT_STEP,
      isActive: true
    })),
    departmentsSource: "fallback",
    jobTitles: COMPANY_CONTACT_JOB_TITLES.map((item, index) => ({
      id: item.id,
      tenantId,
      code: item.id,
      name: item.label,
      description: null,
      sortOrder: (index + 1) * SORT_STEP,
      isActive: true
    })),
    jobTitlesSource: "fallback",
    correlations: [],
    pbxCategories: COMPANY_PBX_CATEGORY_FALLBACK.map((item, index) => ({
      id: item.id,
      tenantId,
      code: item.id,
      name: item.label,
      description: null,
      sortOrder: (index + 1) * SORT_STEP,
      isActive: true
    })),
    pbxCategoriesSource: "fallback"
  };
}

export function toDirectorySelectOptions(items: ReadonlyArray<Pick<ClientContactDirectoryItem, "id" | "name">>) {
  return items.map((item) => ({ id: item.id, label: item.name }));
}

export function buildJobTitleIdsByDepartment(
  correlations: ReadonlyArray<ClientContactDirectoryCorrelation>
): Record<string, string[]> {
  return correlations.reduce<Record<string, string[]>>((acc, row) => {
    const key = row.departmentId.trim();
    if (!key) return acc;
    const uniqueIds = Array.from(new Set(row.jobTitleIds.map((item) => item.trim()).filter(Boolean)));
    if (uniqueIds.length > 0) {
      acc[key] = uniqueIds;
    }
    return acc;
  }, {});
}

export function filterJobTitlesByDepartment(
  jobTitleOptions: ReadonlyArray<{ id: string; label: string }>,
  departmentId: string,
  jobTitleIdsByDepartment: Readonly<Record<string, string[]>>
) {
  const normalizedDepartmentId = departmentId.trim();
  if (!normalizedDepartmentId || normalizedDepartmentId === COMPANY_CONTACT_DEPARTMENT_OTHER_ID) {
    return [...jobTitleOptions];
  }

  const allowedIds = jobTitleIdsByDepartment[normalizedDepartmentId] ?? [];
  if (!allowedIds.length) {
    return [...jobTitleOptions];
  }

  const allowedSet = new Set(allowedIds);
  return jobTitleOptions.filter((item) => item.id === COMPANY_CONTACT_JOB_TITLE_OTHER_ID || allowedSet.has(item.id));
}

export function getDirectoryItemLabelById(
  items: ReadonlyArray<Pick<ClientContactDirectoryItem, "id" | "name">>,
  id?: string | null
) {
  const normalized = id?.trim();
  if (!normalized) return null;
  return items.find((item) => item.id === normalized)?.name ?? null;
}
