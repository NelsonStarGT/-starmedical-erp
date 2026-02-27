import { ClientProfileType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientCompletenessScore, type ClientCompletenessSnapshot } from "@/lib/clients/completeness";
import { INSURER_LINE_FALLBACK } from "@/lib/catalogs/insurerLines";
import { normalizeTenantId } from "@/lib/tenant";

export type ClientsListViewMode = "operativa" | "comercial";

export type ClientCommercialScoreFilter = "" | "LOW" | "MEDIUM" | "HIGH";

export type ClientCommercialSort =
  | "createdAt_desc"
  | "createdAt_asc"
  | "code_asc"
  | "code_desc"
  | "name_asc"
  | "name_desc"
  | "score_desc"
  | "score_asc"
  | "lastActivity_desc"
  | "lastActivity_asc";

export type ClientCommercialListQuery = {
  tenantId: unknown;
  q?: string;
  type?: ClientProfileType | "";
  statusId?: string;
  acquisitionSourceId?: string;
  activityOrLine?: string;
  location?: string;
  score?: ClientCommercialScoreFilter;
  dateFrom?: string;
  dateTo?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
  sort?: ClientCommercialSort;
};

export type ClientCommercialListItem = {
  id: string;
  clientCode: string | null;
  displayName: string;
  type: ClientProfileType;
  typeLabel: string;
  identifier: string | null;
  acquisitionChannel: string | null;
  activityOrLine: string | null;
  locationLabel: string | null;
  primaryContact: string | null;
  statusLabel: string | null;
  healthScore: number;
  lastActivityAt: Date;
  createdAt: Date;
  isArchived: boolean;
};

export type ClientCommercialListResult = {
  items: ClientCommercialListItem[];
  total: number;
  page: number;
  pageSize: number;
};

const INSURER_LINE_LABEL_BY_ID = new Map<string, string>(INSURER_LINE_FALLBACK.map((item) => [item.id, item.label]));

function normalizeSearch(value?: string | null) {
  return (value ?? "").trim();
}

function parseDateBoundary(value?: string, endOfDay = false) {
  const token = normalizeSearch(value);
  if (!token) return null;
  const parsed = new Date(token);
  if (Number.isNaN(parsed.getTime())) return null;
  if (endOfDay) parsed.setHours(23, 59, 59, 999);
  else parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function displayName(row: {
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
}) {
  if (row.type === ClientProfileType.PERSON) {
    return [row.firstName, row.middleName, row.lastName, row.secondLastName].filter(Boolean).join(" ").trim() || "Persona";
  }
  return row.companyName || row.tradeName || "Cliente";
}

function typeLabel(type: ClientProfileType) {
  if (type === ClientProfileType.PERSON) return "Persona";
  if (type === ClientProfileType.COMPANY) return "Empresa";
  if (type === ClientProfileType.INSTITUTION) return "Institución";
  return "Aseguradora";
}

function buildLocationLabel(input: {
  country: string | null;
  department: string | null;
  city: string | null;
  clientLocations: Array<{ country: string | null; department: string | null; city: string | null; isPrimary: boolean }>;
}) {
  const primaryLocation = input.clientLocations.find((item) => item.isPrimary) ?? input.clientLocations[0] ?? null;
  const country = primaryLocation?.country ?? input.country;
  const department = primaryLocation?.department ?? input.department;
  const city = primaryLocation?.city ?? input.city;
  const parts = [city, department, country].filter((value): value is string => Boolean(value && value.trim()));
  return parts.length ? parts.join(", ") : null;
}

function buildPrimaryContact(input: {
  clientContacts: Array<{ name: string; role: string | null; phone: string | null; email: string | null; isPrimary: boolean }>;
  phone: string | null;
  email: string | null;
  clientPhones: Array<{ number: string; e164: string | null; isPrimary: boolean }>;
  clientEmails: Array<{ valueRaw: string; valueNormalized: string; isPrimary: boolean }>;
}) {
  const primaryContact = input.clientContacts.find((item) => item.isPrimary) ?? input.clientContacts[0] ?? null;
  if (primaryContact) {
    const phone = primaryContact.phone?.trim() || null;
    const email = primaryContact.email?.trim() || null;
    const contactToken = phone || email || "Sin canal";
    return `${primaryContact.name} · ${contactToken}`;
  }

  const primaryPhone = input.clientPhones.find((item) => item.isPrimary) ?? input.clientPhones[0] ?? null;
  const primaryEmail = input.clientEmails.find((item) => item.isPrimary) ?? input.clientEmails[0] ?? null;
  const phone = primaryPhone?.e164 || primaryPhone?.number || input.phone;
  const email = primaryEmail?.valueNormalized || primaryEmail?.valueRaw || input.email;
  return phone || email || null;
}

function readInsurerLineLabel(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const lineCode = (metadata as Record<string, unknown>).insurerLinePrimaryCode;
  if (typeof lineCode !== "string") return null;
  const normalized = lineCode.trim().toLowerCase();
  if (!normalized) return null;
  return INSURER_LINE_LABEL_BY_ID.get(normalized) ?? normalized;
}

function buildActivityOrLine(row: {
  type: ClientProfileType;
  sector: { name: string } | null;
  institutionCategory: { name: string } | null;
  institutionType: { name: string } | null;
  companyRecord: { metadata: Prisma.JsonValue | null } | null;
}) {
  if (row.type === ClientProfileType.INSURER) {
    const insurerLine = readInsurerLineLabel(row.companyRecord?.metadata);
    return insurerLine ?? "—";
  }
  if (row.type === ClientProfileType.COMPANY) {
    return row.sector?.name ?? "—";
  }
  if (row.type === ClientProfileType.INSTITUTION) {
    return row.institutionCategory?.name ?? row.institutionType?.name ?? "—";
  }
  return "—";
}

function buildScoreBand(score: number): ClientCommercialScoreFilter {
  if (score < 50) return "LOW";
  if (score < 80) return "MEDIUM";
  return "HIGH";
}

function compareNullableString(a: string | null, b: string | null) {
  const left = a ?? "";
  const right = b ?? "";
  return left.localeCompare(right, "es", { sensitivity: "base" });
}

function applySort(items: ClientCommercialListItem[], sort: ClientCommercialSort) {
  const rows = [...items];
  rows.sort((left, right) => {
    if (sort === "createdAt_asc") return left.createdAt.getTime() - right.createdAt.getTime();
    if (sort === "createdAt_desc") return right.createdAt.getTime() - left.createdAt.getTime();
    if (sort === "code_asc") return compareNullableString(left.clientCode, right.clientCode);
    if (sort === "code_desc") return compareNullableString(right.clientCode, left.clientCode);
    if (sort === "name_asc") return left.displayName.localeCompare(right.displayName, "es", { sensitivity: "base" });
    if (sort === "name_desc") return right.displayName.localeCompare(left.displayName, "es", { sensitivity: "base" });
    if (sort === "score_asc") return left.healthScore - right.healthScore;
    if (sort === "score_desc") return right.healthScore - left.healthScore;
    if (sort === "lastActivity_asc") return left.lastActivityAt.getTime() - right.lastActivityAt.getTime();
    return right.lastActivityAt.getTime() - left.lastActivityAt.getTime();
  });
  return rows;
}

export async function listClientsCommercial(query: ClientCommercialListQuery): Promise<ClientCommercialListResult> {
  const tenantId = normalizeTenantId(query.tenantId);
  const q = normalizeSearch(query.q);
  const locationNeedle = normalizeSearch(query.location).toLowerCase();
  const activityNeedle = normalizeSearch(query.activityOrLine).toLowerCase();
  const dateFrom = parseDateBoundary(query.dateFrom);
  const dateTo = parseDateBoundary(query.dateTo, true);
  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 10), 200);
  const page = Math.max(query.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const includeArchived = Boolean(query.includeArchived);
  const andFilters: Prisma.ClientProfileWhereInput[] = [];

  if (q) {
    andFilters.push({
      OR: [
        { clientCode: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { middleName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { secondLastName: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { tradeName: { contains: q, mode: "insensitive" } },
        { nit: { contains: q, mode: "insensitive" } },
        { dpi: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { clientPhones: { some: { isActive: true, OR: [{ number: { contains: q, mode: "insensitive" } }, { e164: { contains: q, mode: "insensitive" } }] } } },
        { clientEmails: { some: { isActive: true, OR: [{ valueRaw: { contains: q, mode: "insensitive" } }, { valueNormalized: { contains: q.toLowerCase() } }] } } }
      ]
    });
  }

  if (locationNeedle) {
    andFilters.push({
      OR: [
        { country: { contains: locationNeedle, mode: "insensitive" } },
        { department: { contains: locationNeedle, mode: "insensitive" } },
        { city: { contains: locationNeedle, mode: "insensitive" } },
        {
          clientLocations: {
            some: {
              isActive: true,
              OR: [
                { country: { contains: locationNeedle, mode: "insensitive" } },
                { department: { contains: locationNeedle, mode: "insensitive" } },
                { city: { contains: locationNeedle, mode: "insensitive" } },
                { addressLine1: { contains: locationNeedle, mode: "insensitive" } }
              ]
            }
          }
        }
      ]
    });
  }

  const where: Prisma.ClientProfileWhereInput = {
    tenantId,
    ...(includeArchived ? {} : { deletedAt: null }),
    ...(query.type ? { type: query.type } : {}),
    ...(query.statusId ? { statusId: query.statusId } : {}),
    ...(query.acquisitionSourceId ? { acquisitionSourceId: query.acquisitionSourceId } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {})
          }
        }
      : {}),
    ...(andFilters.length ? { AND: andFilters } : {})
  };

  const rows = await prisma.clientProfile.findMany({
    where,
    select: {
      id: true,
      clientCode: true,
      type: true,
      firstName: true,
      middleName: true,
      lastName: true,
      secondLastName: true,
      companyName: true,
      tradeName: true,
      nit: true,
      dpi: true,
      phone: true,
      email: true,
      country: true,
      department: true,
      city: true,
      address: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      status: { select: { name: true } },
      acquisitionSource: { select: { name: true } },
      sector: { select: { name: true } },
      institutionCategory: { select: { name: true } },
      institutionType: { select: { name: true } },
      companyRecord: { select: { metadata: true } },
      clientPhones: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 5,
        select: {
          number: true,
          e164: true,
          isPrimary: true
        }
      },
      clientEmails: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 5,
        select: {
          valueRaw: true,
          valueNormalized: true,
          isPrimary: true
        }
      },
      clientLocations: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 5,
        select: {
          country: true,
          department: true,
          city: true,
          addressLine1: true,
          isPrimary: true
        }
      },
      clientContacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 5,
        select: {
          name: true,
          role: true,
          phone: true,
          email: true,
          isPrimary: true
        }
      },
      auditEvents: {
        orderBy: { timestamp: "desc" },
        take: 1,
        select: { timestamp: true }
      }
    }
  });

  const mapped = rows.map((row): ClientCommercialListItem => {
    const locationLabel = buildLocationLabel({
      country: row.country,
      department: row.department,
      city: row.city,
      clientLocations: row.clientLocations
    });
    const activityOrLine = buildActivityOrLine({
      type: row.type,
      sector: row.sector,
      institutionCategory: row.institutionCategory,
      institutionType: row.institutionType,
      companyRecord: row.companyRecord
    });
    const primaryContact = buildPrimaryContact({
      clientContacts: row.clientContacts,
      phone: row.phone,
      email: row.email,
      clientPhones: row.clientPhones,
      clientEmails: row.clientEmails
    });

    const snapshot: ClientCompletenessSnapshot = {
      type: row.type,
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
      secondLastName: row.secondLastName,
      dpi: row.dpi,
      phone: row.phone ?? row.clientPhones[0]?.number ?? null,
      companyName: row.companyName,
      tradeName: row.tradeName,
      nit: row.nit,
      address: row.address ?? row.clientLocations[0]?.addressLine1 ?? null,
      city: row.city ?? row.clientLocations[0]?.city ?? null,
      department: row.department ?? row.clientLocations[0]?.department ?? null,
      institutionTypeId: row.institutionType ? "set" : null
    };

    const healthScore = getClientCompletenessScore(snapshot);

    return {
      id: row.id,
      clientCode: row.clientCode,
      displayName: displayName(row),
      type: row.type,
      typeLabel: typeLabel(row.type),
      identifier: row.type === ClientProfileType.PERSON ? row.dpi : row.nit,
      acquisitionChannel: row.acquisitionSource?.name ?? null,
      activityOrLine,
      locationLabel,
      primaryContact,
      statusLabel: row.status?.name ?? null,
      healthScore,
      lastActivityAt: row.auditEvents[0]?.timestamp ?? row.updatedAt,
      createdAt: row.createdAt,
      isArchived: Boolean(row.deletedAt)
    };
  });

  const filteredByActivity = activityNeedle
    ? mapped.filter((row) => (row.activityOrLine || "").toLowerCase().includes(activityNeedle))
    : mapped;

  const filteredByScore = query.score
    ? filteredByActivity.filter((row) => buildScoreBand(row.healthScore) === query.score)
    : filteredByActivity;

  const sorted = applySort(filteredByScore, query.sort ?? "createdAt_desc");
  const total = sorted.length;
  const items = sorted.slice(offset, offset + pageSize);

  return {
    items,
    total,
    page,
    pageSize
  };
}
