import { ClientPhoneCategory, ClientProfileType, Prisma } from "@prisma/client";
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
    countries: Array<{
      label: string;
      source: "catalog" | "manual";
      total: number;
      countryId: string | null;
      countryIso2: string | null;
    }>;
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
  hasPrimaryLocation: boolean;
  hasPrimaryContact: boolean;
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

export type ClientsBirthdaysFilters = {
  tenantId: string;
  countryId?: string;
  q?: string;
  type?: ClientProfileType | "ALL";
  month?: number | null;
  nextDays?: number | null;
  limit?: number;
  referenceDate?: Date;
};

export type ClientsBirthdayRow = {
  id: string;
  displayName: string;
  type: ClientProfileType;
  birthDate: Date;
  nextBirthday: Date;
  daysUntil: number;
  age: number | null;
  phone: string | null;
  phoneHref: string | null;
  whatsappHref: string | null;
  email: string | null;
  emailHref: string | null;
};

export type ClientsBirthdayResult = {
  items: ClientsBirthdayRow[];
  total: number;
  month: number | null;
  nextDays: number | null;
  referenceDate: Date;
};

function atStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function atEndOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function normalizeReportRange(filters: ClientsReportFilters) {
  const now = new Date();
  const to = filters.to ? atEndOfDay(filters.to) : atEndOfDay(now);
  const from = filters.from
    ? atStartOfDay(filters.from)
    : (() => {
        const base = atStartOfDay(to);
        base.setDate(base.getDate() - 29);
        return base;
      })();
  return { from, to };
}

type ClientsReportListOptions = {
  pageSizeMax?: number;
};

export function normalizeReportListPagination(filters: ClientsReportFilters, options?: ClientsReportListOptions) {
  const pageSizeMax = Math.max(options?.pageSizeMax ?? 100, 10);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 10), pageSizeMax);
  const page = Math.max(filters.page ?? 1, 1);
  return { pageSize, page, skip: (page - 1) * pageSize };
}

function normalizeType(type?: ClientProfileType | "ALL") {
  if (!type || type === "ALL") return undefined;
  return type;
}

function buildReferredOnlyWhere(filters: ClientsReportFilters): Prisma.ClientProfileWhereInput {
  if (!filters.referredOnly) return {};
  return {
    referralsReceived: {
      some: {
        referrerClient: {
          tenantId: filters.tenantId
        }
      }
    }
  };
}

export function buildWhere(filters: ClientsReportFilters): Prisma.ClientProfileWhereInput {
  const { from, to } = normalizeReportRange(filters);
  const q = filters.q?.trim();
  const type = normalizeType(filters.type);

  const where: Prisma.ClientProfileWhereInput = {
    tenantId: filters.tenantId,
    deletedAt: null,
    createdAt: { gte: from, lte: to },
    ...(type ? { type } : {}),
    ...buildClientCountryFilterWhere(filters.countryId ?? null),
    ...buildReferredOnlyWhere(filters),
    ...(filters.acquisitionSourceId ? { acquisitionSourceId: filters.acquisitionSourceId } : {}),
    ...(filters.acquisitionDetailOptionId ? { acquisitionDetailOptionId: filters.acquisitionDetailOptionId } : {})
  };

  if (q) {
    where.OR = [
      { clientCode: { contains: q, mode: "insensitive" } },
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
      { dpi: { contains: q, mode: "insensitive" } },
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

export function buildSqlWhereClauses(filters: ClientsReportFilters) {
  const { from, to } = normalizeReportRange(filters);
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

  if (filters.referredOnly) {
    clauses.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "ClientReferral" AS cr
        INNER JOIN "ClientProfile" AS rp ON rp."id" = cr."referrerClientId"
        WHERE cr."referredClientId" = cp."id"
          AND rp."tenantId" = ${filters.tenantId}
      )
    `);
  }

  const q = filters.q?.trim();
  if (q) {
    const like = `%${q}%`;
    const emailLike = `%${q.toLowerCase()}%`;
    clauses.push(Prisma.sql`
      (
        cp."clientCode" ILIKE ${like}
        OR cp."firstName" ILIKE ${like}
        OR cp."middleName" ILIKE ${like}
        OR cp."thirdName" ILIKE ${like}
        OR cp."lastName" ILIKE ${like}
        OR cp."secondLastName" ILIKE ${like}
        OR cp."thirdLastName" ILIKE ${like}
        OR cp."companyName" ILIKE ${like}
        OR cp."tradeName" ILIKE ${like}
        OR cp."nit" ILIKE ${like}
        OR cp."dpi" ILIKE ${like}
        OR EXISTS (
          SELECT 1
          FROM "ClientIdentifier" AS ci
          WHERE ci."clientId" = cp."id"
            AND ci."isActive" = TRUE
            AND ci."value" ILIKE ${like}
        )
        OR EXISTS (
          SELECT 1
          FROM "ClientPhone" AS cph
          WHERE cph."clientId" = cp."id"
            AND cph."isActive" = TRUE
            AND (cph."number" ILIKE ${like} OR cph."e164" ILIKE ${like})
        )
        OR EXISTS (
          SELECT 1
          FROM "ClientEmail" AS ce
          WHERE ce."clientId" = cp."id"
            AND ce."isActive" = TRUE
            AND ce."valueNormalized" LIKE ${emailLike}
        )
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

function stripToDigits(value: string) {
  return value.replace(/\D+/g, "");
}

function buildTelHref(value: string | null) {
  if (!value) return null;
  const compact = value.replace(/\s+/g, "").trim();
  return compact ? `tel:${compact}` : null;
}

function toWhatsAppDigits(phone: { e164: string | null; countryCode: string | null; number: string }) {
  const e164Digits = stripToDigits(phone.e164 || "");
  if (e164Digits) return e164Digits;

  const countryCodeDigits = stripToDigits(phone.countryCode || "");
  const numberDigits = stripToDigits(phone.number);
  if (!numberDigits) return null;

  if (countryCodeDigits && !numberDigits.startsWith(countryCodeDigits)) {
    return `${countryCodeDigits}${numberDigits}`;
  }

  return numberDigits;
}

function resolveBirthdayPhone(rows: Array<{
  number: string;
  e164: string | null;
  countryCode: string | null;
  category: ClientPhoneCategory;
  canWhatsapp: boolean;
  isPrimary: boolean;
}>) {
  const primary = rows.find((item) => item.isPrimary) ?? rows[0] ?? null;
  const whatsappCandidate =
    rows.find(
      (item) =>
        item.category === ClientPhoneCategory.WHATSAPP ||
        item.category === ClientPhoneCategory.MOBILE ||
        item.canWhatsapp
    ) ?? null;

  const value = primary?.e164?.trim() || primary?.number?.trim() || null;
  const whatsappDigits = whatsappCandidate ? toWhatsAppDigits(whatsappCandidate) : null;

  return {
    value,
    phoneHref: buildTelHref(value),
    whatsappHref: whatsappDigits ? `https://wa.me/${whatsappDigits}` : null
  };
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function resolveBirthdayDayForYear(monthIndex: number, day: number, year: number) {
  const lastDayInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(day, lastDayInMonth);
}

function calculateNextBirthday(birthDate: Date, referenceDate: Date) {
  const monthIndex = birthDate.getMonth();
  const birthDay = birthDate.getDate();
  const referenceDay = startOfLocalDay(referenceDate);

  let candidateYear = referenceDay.getFullYear();
  let candidate = new Date(
    candidateYear,
    monthIndex,
    resolveBirthdayDayForYear(monthIndex, birthDay, candidateYear)
  );

  if (candidate.getTime() < referenceDay.getTime()) {
    candidateYear += 1;
    candidate = new Date(
      candidateYear,
      monthIndex,
      resolveBirthdayDayForYear(monthIndex, birthDay, candidateYear)
    );
  }

  return candidate;
}

function calculateAgeYears(birthDate: Date, referenceDate: Date) {
  const today = startOfLocalDay(referenceDate);
  let years = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
  return years >= 0 ? years : null;
}

function normalizeBirthdaysMonth(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null;
  const next = Number(value);
  return next >= 1 && next <= 12 ? next : null;
}

function normalizeBirthdaysNextDays(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null;
  const next = Number(value);
  return next >= 1 && next <= 90 ? next : null;
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
  countryId: string | null;
  countryIso2: string | null;
};

export function mapGeoBucketRows(
  rows: Array<{
    label: string | null;
    source: string;
    total: number | bigint;
    countryId?: string | null;
    countryIso2?: string | null;
  }>
): GeoBucketRow[] {
  return rows.map((row) => ({
    label: row.label?.trim() || "Manual entry",
    source: normalizeGeoBucketSource(row.source),
    total: toSafeNumber(row.total),
    countryId: typeof row.countryId === "string" ? row.countryId : null,
    countryIso2: typeof row.countryIso2 === "string" ? row.countryIso2 : null
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

  const { countryIdSql, countryIso2Sql } = buildGeoBucketCountryProjectionSql(level);

  const rows = await prisma.$queryRaw<Array<{
    label: string | null;
    source: string;
    total: number | bigint;
    countryId: string | null;
    countryIso2: string | null;
  }>>(Prisma.sql`
    SELECT
      ${labelSql} AS "label",
      ${sourceSql} AS "source",
      ${countryIdSql} AS "countryId",
      ${countryIso2Sql} AS "countryIso2",
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

export function buildGeoBucketCountryProjectionSql(level: "country" | "admin1" | "admin2") {
  if (level === "country") {
    return {
      countryIdSql: Prisma.sql`MIN(loc."geoCountryId")`,
      countryIso2Sql: Prisma.sql`MIN(gco."iso2")`
    };
  }

  return {
    countryIdSql: Prisma.sql`NULL`,
    countryIso2Sql: Prisma.sql`NULL`
  };
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

export async function getClientsReportList(
  filters: ClientsReportFilters,
  options?: ClientsReportListOptions
): Promise<ClientsReportList> {
  const where = buildWhere(filters);
  const { pageSize, page, skip } = normalizeReportListPagination(filters, options);

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

  return {
    items: rows.map((row) => {
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
        hasPrimaryLocation: row.clientLocations.some((location) => location.isPrimary),
        hasPrimaryContact: Boolean(primaryPhone || primaryEmail),
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

export function projectClientsBirthdaysRows(
  rows: Array<{
    id: string;
    type: ClientProfileType;
    firstName: string | null;
    middleName: string | null;
    thirdName: string | null;
    lastName: string | null;
    secondLastName: string | null;
    thirdLastName: string | null;
    companyName: string | null;
    tradeName: string | null;
    birthDate: Date;
    clientPhones: Array<{
      number: string;
      e164: string | null;
      countryCode: string | null;
      category: ClientPhoneCategory;
      canWhatsapp: boolean;
      isPrimary: boolean;
      isActive: boolean;
    }>;
    clientEmails: Array<{
      valueRaw: string;
      valueNormalized: string;
      isPrimary: boolean;
      isActive: boolean;
    }>;
  }>,
  options?: {
    month?: number | null;
    nextDays?: number | null;
    referenceDate?: Date;
    limit?: number;
  }
): ClientsBirthdayResult {
  const month = normalizeBirthdaysMonth(options?.month);
  const nextDays = normalizeBirthdaysNextDays(options?.nextDays);
  const referenceDate = startOfLocalDay(options?.referenceDate ?? new Date());
  const limit = Math.min(Math.max(options?.limit ?? 300, 1), 1_000);

  const processed = rows
    .map((row) => {
      const nextBirthday = calculateNextBirthday(row.birthDate, referenceDate);
      const daysUntil = Math.round(
        (startOfLocalDay(nextBirthday).getTime() - referenceDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      const contactPhone = resolveBirthdayPhone(row.clientPhones.filter((phone) => phone.isActive));
      const email = getPrimaryEmailValue(row.clientEmails);
      const displayName = toDisplayName(row);

      return {
        id: row.id,
        displayName,
        type: row.type,
        birthDate: row.birthDate,
        nextBirthday,
        daysUntil,
        age: calculateAgeYears(row.birthDate, referenceDate),
        phone: contactPhone.value,
        phoneHref: contactPhone.phoneHref,
        whatsappHref: contactPhone.whatsappHref,
        email,
        emailHref: email ? `mailto:${email.toLowerCase()}` : null
      } satisfies ClientsBirthdayRow;
    })
    .filter((row) => {
      if (month && row.birthDate.getMonth() + 1 !== month) return false;
      if (nextDays && (row.daysUntil < 0 || row.daysUntil > nextDays)) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
      return a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" });
    });

  return {
    items: processed.slice(0, limit),
    total: processed.length,
    month,
    nextDays,
    referenceDate
  };
}

export async function getClientsReportBirthdays(filters: ClientsBirthdaysFilters): Promise<ClientsBirthdayResult> {
  const type = normalizeType(filters.type);
  const rows = await prisma.clientProfile.findMany({
    where: {
      tenantId: filters.tenantId,
      deletedAt: null,
      birthDate: { not: null },
      ...(type ? { type } : {}),
      ...buildClientCountryFilterWhere(filters.countryId ?? null),
      ...(filters.q
        ? {
            OR: [
              { clientCode: { contains: filters.q, mode: "insensitive" } },
              { firstName: { contains: filters.q, mode: "insensitive" } },
              { middleName: { contains: filters.q, mode: "insensitive" } },
              { thirdName: { contains: filters.q, mode: "insensitive" } },
              { lastName: { contains: filters.q, mode: "insensitive" } },
              { secondLastName: { contains: filters.q, mode: "insensitive" } },
              { thirdLastName: { contains: filters.q, mode: "insensitive" } },
              { companyName: { contains: filters.q, mode: "insensitive" } },
              { tradeName: { contains: filters.q, mode: "insensitive" } },
              { nit: { contains: filters.q, mode: "insensitive" } },
              { dpi: { contains: filters.q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    select: {
      id: true,
      type: true,
      firstName: true,
      middleName: true,
      thirdName: true,
      lastName: true,
      secondLastName: true,
      thirdLastName: true,
      companyName: true,
      tradeName: true,
      birthDate: true,
      clientPhones: {
        where: { isActive: true },
        select: {
          number: true,
          e164: true,
          countryCode: true,
          category: true,
          canWhatsapp: true,
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
      }
    }
  });

  const withBirthDate = rows.filter(
    (row): row is typeof row & { birthDate: Date } => row.birthDate instanceof Date
  );

  return projectClientsBirthdaysRows(withBirthDate, {
    month: filters.month,
    nextDays: filters.nextDays,
    referenceDate: filters.referenceDate,
    limit: filters.limit
  });
}

type ClientsReportExportOptions = {
  batchSize?: number;
  maxRows?: number;
};

export async function getClientsReportRowsForExport(
  filters: ClientsReportFilters,
  options?: ClientsReportExportOptions
): Promise<{ items: ClientsReportRow[]; total: number; truncated: boolean; maxRows: number }> {
  const maxRows = Math.max(1_000, options?.maxRows ?? 50_000);
  const batchSize = Math.min(Math.max(options?.batchSize ?? 1_000, 100), 5_000);

  const first = await getClientsReportList(
    {
      ...filters,
      page: 1,
      pageSize: batchSize
    },
    { pageSizeMax: batchSize }
  );

  const items = [...first.items];
  let page = 2;

  while (page <= first.totalPages && items.length < maxRows) {
    const chunk = await getClientsReportList(
      {
        ...filters,
        page,
        pageSize: batchSize
      },
      { pageSizeMax: batchSize }
    );
    items.push(...chunk.items);
    page += 1;
  }

  const cappedItems = items.slice(0, maxRows);
  return {
    items: cappedItems,
    total: first.total,
    truncated: first.total > maxRows || items.length > maxRows,
    maxRows
  };
}
