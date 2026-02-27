import { ClientProfileType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildClientCountryFilterWhere } from "@/lib/clients/countryFilter.server";
import { isPrismaMissingTableError } from "@/lib/prisma/errors.server";
import { INSURER_LINE_FALLBACK } from "@/lib/catalogs/insurerLines";
import {
  getPrimaryEmailValue,
  getPrimaryIdentifierValue,
  getPrimaryPhoneValue,
  getResidenceSnapshot
} from "@/lib/clients/readModel";

export type ClientsReportFilters = {
  tenantId: string;
  q?: string;
  type?: ClientProfileType | "ALL";
  from?: Date | null;
  to?: Date | null;
  countryId?: string;
  acquisitionSourceId?: string;
  acquisitionDetailOptionId?: string;
  referredOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type ClientsReportSummary = {
  totalInRange: number;
  newInRange: number;
  withDocumentPct: number;
  withPhonePct: number;
  withEmailPct: number;
  withBirthDatePct: number;
  byType: Array<{ type: ClientProfileType; total: number }>;
  bySource: Array<{ sourceName: string; total: number }>;
  byGeo: {
    countries: Array<{ label: string; source: "catalog" | "manual"; total: number }>;
    admin1: Array<{ label: string; source: "catalog" | "manual"; total: number }>;
    admin2: Array<{ label: string; source: "catalog" | "manual"; total: number }>;
  };
  insurersByLine: Array<{ line: string; total: number }>;
  referrals: {
    source: "live" | "compat";
    warning?: string;
    totalEdges: number;
    topReferrers: Array<{ referrerId: string; referrerLabel: string; total: number }>;
  };
};

export type ClientsReportRow = {
  id: string;
  createdAt: Date;
  type: ClientProfileType;
  displayName: string;
  identifier: string | null;
  country: string | null;
  department: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  acquisitionSource: string | null;
  acquisitionDetail: string | null;
  referredBy: string | null;
};

export type ClientsReportList = {
  items: ClientsReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function normalizeRange(filters: ClientsReportFilters) {
  const now = new Date();
  const from = filters.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const to = filters.to ?? now;
  return { from, to };
}

function normalizeType(type?: ClientProfileType | "ALL") {
  if (!type || type === "ALL") return undefined;
  return type;
}

function buildWhere(filters: ClientsReportFilters): Prisma.ClientProfileWhereInput {
  const { from, to } = normalizeRange(filters);
  const q = filters.q?.trim();
  const type = normalizeType(filters.type);

  const where: Prisma.ClientProfileWhereInput = {
    tenantId: filters.tenantId,
    deletedAt: null,
    createdAt: { gte: from, lte: to },
    ...(type ? { type } : {}),
    ...buildClientCountryFilterWhere(filters.countryId ?? null),
    ...(filters.acquisitionSourceId ? { acquisitionSourceId: filters.acquisitionSourceId } : {}),
    ...(filters.acquisitionDetailOptionId ? { acquisitionDetailOptionId: filters.acquisitionDetailOptionId } : {})
  };

  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { middleName: { contains: q, mode: "insensitive" } },
      { thirdName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { secondLastName: { contains: q, mode: "insensitive" } },
      { thirdLastName: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
      { tradeName: { contains: q, mode: "insensitive" } },
      { clientIdentifiers: { some: { isActive: true, value: { contains: q, mode: "insensitive" } } } },
      { nit: { contains: q, mode: "insensitive" } },
      {
        clientPhones: {
          some: {
            isActive: true,
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { e164: { contains: q, mode: "insensitive" } }
            ]
          }
        }
      },
      { clientEmails: { some: { isActive: true, valueNormalized: { contains: q.toLowerCase() } } } }
    ];
  }

  return where;
}

function buildSqlWhereClauses(filters: ClientsReportFilters) {
  const { from, to } = normalizeRange(filters);
  const clauses: Prisma.Sql[] = [
    Prisma.sql`cp."tenantId" = ${filters.tenantId}`,
    Prisma.sql`cp."deletedAt" IS NULL`,
    Prisma.sql`cp."createdAt" >= ${from}`,
    Prisma.sql`cp."createdAt" <= ${to}`
  ];

  const type = normalizeType(filters.type);
  if (type) {
    clauses.push(Prisma.sql`cp."type" = ${type}`);
  }

  if (filters.acquisitionSourceId) {
    clauses.push(Prisma.sql`cp."acquisitionSourceId" = ${filters.acquisitionSourceId}`);
  }

  if (filters.acquisitionDetailOptionId) {
    clauses.push(Prisma.sql`cp."acquisitionDetailOptionId" = ${filters.acquisitionDetailOptionId}`);
  }

  if (filters.countryId) {
    clauses.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "ClientLocation" AS clf
        WHERE clf."clientId" = cp."id"
          AND clf."isActive" = TRUE
          AND clf."isPrimary" = TRUE
          AND clf."geoCountryId" = ${filters.countryId}
      )
    `);
  }

  const q = filters.q?.trim();
  if (q) {
    const like = `%${q}%`;
    clauses.push(Prisma.sql`
      (
        cp."clientCode" ILIKE ${like}
        OR cp."firstName" ILIKE ${like}
        OR cp."middleName" ILIKE ${like}
        OR cp."lastName" ILIKE ${like}
        OR cp."secondLastName" ILIKE ${like}
        OR cp."companyName" ILIKE ${like}
        OR cp."tradeName" ILIKE ${like}
        OR cp."nit" ILIKE ${like}
      )
    `);
  }

  return clauses;
}

function toSafeNumber(value: number | bigint | null | undefined) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return 0;
}

function normalizeGeoBucketSource(value: string): "catalog" | "manual" {
  return value === "catalog" ? "catalog" : "manual";
}

function toDisplayName(row: {
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  thirdName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  thirdLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
}) {
  if (row.type === ClientProfileType.PERSON) {
    return [row.firstName, row.middleName, row.thirdName, row.lastName, row.secondLastName, row.thirdLastName]
      .filter(Boolean)
      .join(" ") || "Persona";
  }
  return row.tradeName || row.companyName || "Cliente";
}

type ClientReferralDelegate = {
  count: (args: Prisma.ClientReferralCountArgs) => Promise<number>;
  findMany: (args: Prisma.ClientReferralFindManyArgs) => Promise<Array<{
    referrerClientId: string;
    referredClientId: string;
    createdAt: Date;
    referrerClient: {
      type: ClientProfileType;
      firstName: string | null;
      middleName: string | null;
      thirdName: string | null;
      lastName: string | null;
      secondLastName: string | null;
      thirdLastName: string | null;
      companyName: string | null;
      tradeName: string | null;
    };
  }>>;
};

function getClientReferralDelegate(): ClientReferralDelegate | null {
  const delegate = (prisma as unknown as {
    clientReferral?: {
      count?: (args: Prisma.ClientReferralCountArgs) => Promise<number>;
      findMany?: (args: Prisma.ClientReferralFindManyArgs) => Promise<Array<{
        referrerClientId: string;
        referredClientId: string;
        createdAt: Date;
        referrerClient: {
          type: ClientProfileType;
          firstName: string | null;
          middleName: string | null;
          thirdName: string | null;
          lastName: string | null;
          secondLastName: string | null;
          thirdLastName: string | null;
          companyName: string | null;
          tradeName: string | null;
        };
      }>>;
    };
  }).clientReferral;

  if (!delegate?.count || !delegate?.findMany) return null;
  return {
    count: delegate.count,
    findMany: delegate.findMany
  };
}

async function getReferralSummary(filters: ClientsReportFilters): Promise<ClientsReportSummary["referrals"]> {
  const delegate = getClientReferralDelegate();
  if (!delegate) {
    return {
      source: "compat",
      warning: "Referidos no disponible (delegate Prisma no generado).",
      totalEdges: 0,
      topReferrers: []
    };
  }

  const whereClient = buildWhere(filters);

  try {
    const edges = await delegate.findMany({
      where: {
        referredClient: whereClient
      },
      select: {
        referrerClientId: true,
        referredClientId: true,
        createdAt: true,
        referrerClient: {
          select: {
            type: true,
            firstName: true,
            middleName: true,
            thirdName: true,
            lastName: true,
            secondLastName: true,
            thirdLastName: true,
            companyName: true,
            tradeName: true
          }
        }
      }
    });

    const counter = new Map<string, { total: number; label: string }>();
    for (const edge of edges) {
      const current = counter.get(edge.referrerClientId) ?? {
        total: 0,
        label: toDisplayName(edge.referrerClient)
      };
      current.total += 1;
      counter.set(edge.referrerClientId, current);
    }

    const topReferrers = [...counter.entries()]
      .map(([referrerId, value]) => ({ referrerId, referrerLabel: value.label, total: value.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      source: "live",
      totalEdges: edges.length,
      topReferrers
    };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      return {
        source: "compat",
        warning: "Referidos no disponible (migración pendiente).",
        totalEdges: 0,
        topReferrers: []
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("P2021") || message.includes("P2022")) {
      return {
        source: "compat",
        warning: "Referidos no disponible (DB no lista).",
        totalEdges: 0,
        topReferrers: []
      };
    }

    throw error;
  }
}

export async function getClientCountsByType(filters: ClientsReportFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.clientProfile.groupBy({ by: ["type"], where, _count: { _all: true } });
  return rows
    .map((row) => ({ type: row.type, total: row._count._all }))
    .sort((a, b) => b.total - a.total);
}

export async function getClientCountsByAcquisition(filters: ClientsReportFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.clientProfile.groupBy({ by: ["acquisitionSourceId"], where, _count: { _all: true } });
  const sourceIds = rows.map((row) => row.acquisitionSourceId).filter((value): value is string => Boolean(value));
  const sources = sourceIds.length
    ? await prisma.clientAcquisitionSource.findMany({
        where: { id: { in: sourceIds } },
        select: { id: true, name: true }
      })
    : [];
  const sourceMap = new Map(sources.map((source) => [source.id, source.name]));

  return rows
    .map((row) => ({
      sourceName: row.acquisitionSourceId ? sourceMap.get(row.acquisitionSourceId) ?? "Canal" : "Sin canal",
      total: row._count._all
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
}

type GeoBucketRow = {
  label: string;
  source: "catalog" | "manual";
  total: number;
};

export function mapGeoBucketRows(rows: Array<{ label: string | null; source: string; total: number | bigint }>): GeoBucketRow[] {
  return rows.map((row) => ({
    label: row.label?.trim() || "Manual entry",
    source: normalizeGeoBucketSource(row.source),
    total: toSafeNumber(row.total)
  }));
}

async function queryGeoBuckets(
  filters: ClientsReportFilters,
  level: "country" | "admin1" | "admin2"
): Promise<GeoBucketRow[]> {
  const clauses = buildSqlWhereClauses(filters);
  const whereSql = Prisma.sql`${Prisma.join(clauses, " AND ")}`;

  const labelSql =
    level === "country"
      ? Prisma.sql`COALESCE(NULLIF(TRIM(gco."name"), ''), NULLIF(TRIM(loc."country"), ''), 'Manual entry')`
      : level === "admin1"
        ? Prisma.sql`COALESCE(NULLIF(TRIM(ga1."name"), ''), NULLIF(TRIM(loc."department"), ''), NULLIF(TRIM(loc."freeState"), ''), 'Manual entry')`
        : Prisma.sql`COALESCE(NULLIF(TRIM(ga2."name"), ''), NULLIF(TRIM(loc."city"), ''), NULLIF(TRIM(loc."freeCity"), ''), 'Manual entry')`;

  const sourceSql =
    level === "country"
      ? Prisma.sql`CASE WHEN loc."geoCountryId" IS NULL THEN 'manual' ELSE 'catalog' END`
      : level === "admin1"
        ? Prisma.sql`CASE WHEN loc."geoAdmin1Id" IS NULL THEN 'manual' ELSE 'catalog' END`
        : Prisma.sql`CASE WHEN loc."geoAdmin2Id" IS NULL THEN 'manual' ELSE 'catalog' END`;

  const rows = await prisma.$queryRaw<Array<{ label: string | null; source: string; total: number | bigint }>>(Prisma.sql`
    SELECT
      ${labelSql} AS "label",
      ${sourceSql} AS "source",
      COUNT(*) AS "total"
    FROM "ClientProfile" AS cp
    LEFT JOIN LATERAL (
      SELECT
        cl."clientId",
        cl."country",
        cl."department",
        cl."city",
        cl."freeState",
        cl."freeCity",
        cl."geoCountryId",
        cl."geoAdmin1Id",
        cl."geoAdmin2Id"
      FROM "ClientLocation" AS cl
      WHERE cl."clientId" = cp."id"
        AND cl."isActive" = TRUE
      ORDER BY cl."isPrimary" DESC, cl."updatedAt" DESC, cl."createdAt" DESC
      LIMIT 1
    ) AS loc ON TRUE
    LEFT JOIN "GeoCountry" AS gco ON gco."id" = loc."geoCountryId"
    LEFT JOIN "GeoAdmin1" AS ga1 ON ga1."id" = loc."geoAdmin1Id"
    LEFT JOIN "GeoAdmin2" AS ga2 ON ga2."id" = loc."geoAdmin2Id"
    WHERE ${whereSql}
    GROUP BY "label", "source"
    ORDER BY "total" DESC, "label" ASC
    LIMIT 30
  `);

  return mapGeoBucketRows(rows);
}

export async function getClientCountsByGeo(filters: ClientsReportFilters) {
  const [countries, admin1, admin2] = await Promise.all([
    queryGeoBuckets(filters, "country"),
    queryGeoBuckets(filters, "admin1"),
    queryGeoBuckets(filters, "admin2")
  ]);

  return {
    countries,
    admin1,
    admin2
  };
}

export async function getInsurersByLine(filters: ClientsReportFilters) {
  const where: Prisma.ClientProfileWhereInput = {
    ...buildWhere(filters),
    type: ClientProfileType.INSURER
  };

  const [lineDirectoryRows, insurers] = await Promise.all([
    prisma.clientInsurerLineDirectory.findMany({
      where: { tenantId: filters.tenantId },
      select: { code: true, name: true }
    }),
    prisma.clientProfile.findMany({
      where,
      select: {
        companyRecord: {
          select: {
            metadata: true
          }
        }
      }
    })
  ]);

  const lineMap = new Map<string, string>();
  for (const item of INSURER_LINE_FALLBACK) {
    lineMap.set(item.id, item.label);
  }
  for (const item of lineDirectoryRows) {
    lineMap.set(item.code, item.name);
  }

  return summarizeInsurerLines(
    insurers.map((insurer) => insurer.companyRecord?.metadata as Record<string, unknown> | null | undefined),
    lineMap
  );
}

export function summarizeInsurerLines(
  metadataRows: Array<Record<string, unknown> | null | undefined>,
  lineMap: ReadonlyMap<string, string>
) {
  const counter = new Map<string, number>();
  for (const metadata of metadataRows) {
    const code = typeof metadata?.insurerLinePrimaryCode === "string" ? metadata.insurerLinePrimaryCode.trim().toLowerCase() : "";
    const label = code ? lineMap.get(code) ?? `Manual entry (${code})` : "Sin ramo";
    counter.set(label, (counter.get(label) ?? 0) + 1);
  }

  return [...counter.entries()]
    .map(([line, total]) => ({ line, total }))
    .sort((a, b) => b.total - a.total);
}

export async function getClientsReportSummary(filters: ClientsReportFilters): Promise<ClientsReportSummary> {
  const where = buildWhere(filters);

  const [
    totalInRange,
    withDocument,
    withPhone,
    withEmail,
    withBirthDate,
    byType,
    bySource,
    byGeo,
    insurersByLine,
    referralSummary
  ] = await Promise.all([
    prisma.clientProfile.count({ where }),
    prisma.clientProfile.count({
      where: {
        ...where,
        OR: [{ nit: { not: null } }, { clientIdentifiers: { some: { isActive: true } } }]
      }
    }),
    prisma.clientProfile.count({ where: { ...where, clientPhones: { some: { isActive: true } } } }),
    prisma.clientProfile.count({ where: { ...where, clientEmails: { some: { isActive: true } } } }),
    prisma.clientProfile.count({ where: { ...where, birthDate: { not: null } } }),
    getClientCountsByType(filters),
    getClientCountsByAcquisition(filters),
    getClientCountsByGeo(filters),
    getInsurersByLine(filters),
    getReferralSummary(filters)
  ]);

  return {
    totalInRange,
    newInRange: totalInRange,
    withDocumentPct: totalInRange ? Math.round((withDocument / totalInRange) * 100) : 0,
    withPhonePct: totalInRange ? Math.round((withPhone / totalInRange) * 100) : 0,
    withEmailPct: totalInRange ? Math.round((withEmail / totalInRange) * 100) : 0,
    withBirthDatePct: totalInRange ? Math.round((withBirthDate / totalInRange) * 100) : 0,
    byType,
    bySource,
    byGeo,
    insurersByLine,
    referrals: referralSummary
  };
}

export async function getClientsReportList(filters: ClientsReportFilters): Promise<ClientsReportList> {
  const where = buildWhere(filters);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 10), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const skip = (page - 1) * pageSize;

  const referralDelegate = getClientReferralDelegate();

  const [total, rows, referredMap] = await Promise.all([
    prisma.clientProfile.count({ where }),
    prisma.clientProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        type: true,
        firstName: true,
        middleName: true,
        thirdName: true,
        lastName: true,
        secondLastName: true,
        thirdLastName: true,
        companyName: true,
        tradeName: true,
        nit: true,
        clientIdentifiers: {
          where: { isActive: true },
          select: {
            value: true,
            isPrimary: true,
            isActive: true
          }
        },
        clientPhones: {
          where: { isActive: true },
          select: {
            number: true,
            e164: true,
            isPrimary: true,
            isActive: true
          }
        },
        clientEmails: {
          where: { isActive: true },
          select: {
            valueRaw: true,
            valueNormalized: true,
            isPrimary: true,
            isActive: true
          }
        },
        clientLocations: {
          where: { isActive: true },
          select: {
            type: true,
            isPrimary: true,
            isActive: true,
            address: true,
            addressLine1: true,
            country: true,
            department: true,
            city: true,
            freeState: true,
            freeCity: true,
            postalCode: true
          }
        },
        acquisitionSource: { select: { name: true } },
        acquisitionDetailOption: { select: { name: true } }
      }
    }),
    (async () => {
      if (!referralDelegate?.findMany) return new Map<string, string>();
      try {
        const edges = await referralDelegate.findMany({
          where: {
            referredClient: where
          },
          select: {
            referredClientId: true,
            referrerClient: {
              select: {
                type: true,
                firstName: true,
                middleName: true,
                thirdName: true,
                lastName: true,
                secondLastName: true,
                thirdLastName: true,
                companyName: true,
                tradeName: true
              }
            }
          }
        });

        const map = new Map<string, string>();
        for (const edge of edges) {
          if (!map.has(edge.referredClientId)) {
            map.set(edge.referredClientId, toDisplayName(edge.referrerClient));
          }
        }
        return map;
      } catch {
        return new Map<string, string>();
      }
    })()
  ]);

  const filteredRows = filters.referredOnly
    ? rows.filter((row) => Boolean(referredMap.get(row.id)))
    : rows;

  return {
    items: filteredRows.map((row) => {
      const primaryIdentifier = getPrimaryIdentifierValue(row.clientIdentifiers);
      const primaryPhone = getPrimaryPhoneValue(row.clientPhones);
      const primaryEmail = getPrimaryEmailValue(row.clientEmails);
      const residence = getResidenceSnapshot(row.clientLocations);
      return {
        id: row.id,
        createdAt: row.createdAt,
        type: row.type,
        displayName: toDisplayName(row),
        identifier: row.type === ClientProfileType.PERSON ? primaryIdentifier : row.nit,
        country: residence.country,
        department: residence.department,
        city: residence.city,
        phone: primaryPhone,
        email: primaryEmail,
        acquisitionSource: row.acquisitionSource?.name ?? null,
        acquisitionDetail: row.acquisitionDetailOption?.name ?? null,
        referredBy: referredMap.get(row.id) ?? null
      };
    }),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}
