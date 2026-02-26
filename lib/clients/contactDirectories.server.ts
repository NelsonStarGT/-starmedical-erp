import { Prisma } from "@prisma/client";
import { isPrismaSchemaMismatchError } from "@/lib/config-central/errors";
import {
  buildFallbackClientContactDirectories,
  normalizeContactDirectoryCode,
  type ClientContactDirectoriesSnapshot,
  type ClientContactDirectoryCorrelation,
  type ClientContactDirectoryItem
} from "@/lib/clients/contactDirectories";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { normalizeTenantId } from "@/lib/tenant";

const DIRECTORY_SEARCH_LIMIT = 500;

type DepartmentRow = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

type JobTitleRow = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

type CorrelationRow = {
  departmentId: string;
  jobTitleId: string;
};

type PbxCategoryRow = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

type ContactDirectoryDelegates = {
  department: {
    findMany: (args: unknown) => Promise<DepartmentRow[]>;
  } | null;
  jobTitle: {
    findMany: (args: unknown) => Promise<JobTitleRow[]>;
  } | null;
  correlation: {
    findMany: (args: unknown) => Promise<CorrelationRow[]>;
  } | null;
  pbxCategory: {
    findMany: (args: unknown) => Promise<PbxCategoryRow[]>;
  } | null;
};

function getDelegates(): ContactDirectoryDelegates {
  const source = prisma as unknown as {
    clientContactDepartmentDirectory?: {
      findMany?: (args: unknown) => Promise<DepartmentRow[]>;
    };
    clientContactJobTitleDirectory?: {
      findMany?: (args: unknown) => Promise<JobTitleRow[]>;
    };
    clientContactDepartmentJobTitle?: {
      findMany?: (args: unknown) => Promise<CorrelationRow[]>;
    };
    clientPbxCategoryDirectory?: {
      findMany?: (args: unknown) => Promise<PbxCategoryRow[]>;
    };
  };

  return {
    department: source.clientContactDepartmentDirectory?.findMany ? { findMany: source.clientContactDepartmentDirectory.findMany } : null,
    jobTitle: source.clientContactJobTitleDirectory?.findMany ? { findMany: source.clientContactJobTitleDirectory.findMany } : null,
    correlation: source.clientContactDepartmentJobTitle?.findMany ? { findMany: source.clientContactDepartmentJobTitle.findMany } : null,
    pbxCategory: source.clientPbxCategoryDirectory?.findMany ? { findMany: source.clientPbxCategoryDirectory.findMany } : null
  };
}

function mapDirectoryRows<Row extends { id: string; tenantId: string; code: string; name: string; description: string | null; sortOrder: number; isActive: boolean }>(
  rows: Row[]
): ClientContactDirectoryItem[] {
  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    code: normalizeContactDirectoryCode({ value: row.code, fallbackName: row.name }),
    name: row.name,
    description: row.description,
    sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : 100,
    isActive: Boolean(row.isActive)
  }));
}

function ensureOtherDirectoryItems(input: {
  tenantId: string;
  departments: ClientContactDirectoryItem[];
  jobTitles: ClientContactDirectoryItem[];
}) {
  const fallback = buildFallbackClientContactDirectories(input.tenantId);
  const departments = [...input.departments];
  const jobTitles = [...input.jobTitles];

  const fallbackDepartmentOther = fallback.departments.find((item) => item.id === "otro") ?? null;
  if (
    fallbackDepartmentOther &&
    !departments.some((item) => item.id === fallbackDepartmentOther.id || item.code.toLowerCase() === "otro")
  ) {
    departments.push(fallbackDepartmentOther);
  }

  const fallbackJobTitleOther = fallback.jobTitles.find((item) => item.id === "otro") ?? null;
  if (
    fallbackJobTitleOther &&
    !jobTitles.some((item) => item.id === fallbackJobTitleOther.id || item.code.toLowerCase() === "otro")
  ) {
    jobTitles.push(fallbackJobTitleOther);
  }

  departments.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"));
  jobTitles.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"));

  return {
    departments,
    jobTitles
  };
}

function mapCorrelationRows(rows: CorrelationRow[]): ClientContactDirectoryCorrelation[] {
  const grouped = new Map<string, Set<string>>();
  for (const row of rows) {
    const departmentId = row.departmentId.trim();
    const jobTitleId = row.jobTitleId.trim();
    if (!departmentId || !jobTitleId) continue;
    if (!grouped.has(departmentId)) grouped.set(departmentId, new Set<string>());
    grouped.get(departmentId)?.add(jobTitleId);
  }

  return Array.from(grouped.entries()).map(([departmentId, jobTitleIds]) => ({
    departmentId,
    jobTitleIds: Array.from(jobTitleIds)
  }));
}

export async function getClientContactDirectories(
  tenantIdInput: unknown,
  input?: {
    includeInactive?: boolean;
    q?: string;
  }
): Promise<ClientContactDirectoriesSnapshot> {
  const tenantId = normalizeTenantId(tenantIdInput);
  const includeInactive = Boolean(input?.includeInactive);
  const q = (input?.q ?? "").trim();
  const fallback = buildFallbackClientContactDirectories(tenantId);

  const delegates = getDelegates();
  if (!delegates.department || !delegates.jobTitle || !delegates.correlation) {
    return fallback;
  }

  try {
    const [departmentRows, jobTitleRows, pbxCategoryRows] = await Promise.all([
      delegates.department.findMany({
        where: {
          tenantId,
          ...(includeInactive ? {} : { isActive: true }),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
                  { code: { contains: q, mode: Prisma.QueryMode.insensitive } }
                ]
              }
            : {})
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: DIRECTORY_SEARCH_LIMIT,
        select: {
          id: true,
          tenantId: true,
          code: true,
          name: true,
          description: true,
          sortOrder: true,
          isActive: true
        }
      }),
      delegates.jobTitle.findMany({
        where: {
          tenantId,
          ...(includeInactive ? {} : { isActive: true }),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
                  { code: { contains: q, mode: Prisma.QueryMode.insensitive } }
                ]
              }
            : {})
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: DIRECTORY_SEARCH_LIMIT,
        select: {
          id: true,
          tenantId: true,
          code: true,
          name: true,
          description: true,
          sortOrder: true,
          isActive: true
        }
      }),
      delegates.pbxCategory
        ? delegates.pbxCategory.findMany({
            where: {
              tenantId,
              ...(includeInactive ? {} : { isActive: true }),
              ...(q
                ? {
                    OR: [
                      { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
                      { code: { contains: q, mode: Prisma.QueryMode.insensitive } }
                    ]
                  }
                : {})
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            take: DIRECTORY_SEARCH_LIMIT,
            select: {
              id: true,
              tenantId: true,
              code: true,
              name: true,
              description: true,
              sortOrder: true,
              isActive: true
            }
          })
        : Promise.resolve([])
    ]);

    const mappedDepartments = mapDirectoryRows(departmentRows);
    const mappedJobTitles = mapDirectoryRows(jobTitleRows);
    const mappedPbxCategories = mapDirectoryRows(pbxCategoryRows);

    const departmentsSource: "db" | "fallback" = mappedDepartments.length > 0 ? "db" : "fallback";
    const jobTitlesSource: "db" | "fallback" = mappedJobTitles.length > 0 ? "db" : "fallback";
    const pbxCategoriesSource: "db" | "fallback" = mappedPbxCategories.length > 0 ? "db" : "fallback";
    const dataSource: "db" | "fallback" =
      departmentsSource === "db" || jobTitlesSource === "db" || pbxCategoriesSource === "db"
        ? "db"
        : "fallback";
    const ensured = ensureOtherDirectoryItems({
      tenantId,
      departments: mappedDepartments.length > 0 ? mappedDepartments : fallback.departments,
      jobTitles: mappedJobTitles.length > 0 ? mappedJobTitles : fallback.jobTitles
    });
    const pbxCategories = mappedPbxCategories.length > 0 ? mappedPbxCategories : fallback.pbxCategories;

    const correlationRows = await delegates.correlation.findMany({
      where: {
        tenantId,
        isActive: true,
        departmentId: {
          in: ensured.departments.map((item) => item.id)
        },
        jobTitleId: {
          in: ensured.jobTitles.map((item) => item.id)
        }
      },
      select: {
        departmentId: true,
        jobTitleId: true
      }
    });

    return {
      source: dataSource,
      departments: ensured.departments,
      departmentsSource,
      jobTitles: ensured.jobTitles,
      jobTitlesSource,
      correlations: mapCorrelationRows(correlationRows),
      pbxCategories,
      pbxCategoriesSource
    };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("clients.contactDirectories.get", error);
      return fallback;
    }
    if (isPrismaSchemaMismatchError(error)) {
      return fallback;
    }
    throw error;
  }
}
