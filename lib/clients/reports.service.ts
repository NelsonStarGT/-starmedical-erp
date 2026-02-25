import { ClientProfileType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError } from "@/lib/prisma/errors";
import {
  getPrimaryEmailValue,
  getPrimaryIdentifierValue,
  getPrimaryPhoneValue,
  getResidenceSnapshot
} from "@/lib/clients/readModel";

export type ClientsReportFilters = {
  q?: string;
  type?: ClientProfileType | "ALL";
  from?: Date | null;
  to?: Date | null;
  country?: string;
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
    deletedAt: null,
    createdAt: { gte: from, lte: to },
    ...(type ? { type } : {}),
    ...(filters.country
      ? {
          clientLocations: {
            some: {
              isActive: true,
              country: { equals: filters.country, mode: "insensitive" }
            }
          }
        }
      : {}),
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

export async function getClientsReportSummary(filters: ClientsReportFilters): Promise<ClientsReportSummary> {
  const where = buildWhere(filters);

  const [
    totalInRange,
    withDocument,
    withPhone,
    withEmail,
    withBirthDate,
    byTypeRows,
    bySourceRows,
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
    prisma.clientProfile.groupBy({ by: ["type"], where, _count: { _all: true } }),
    prisma.clientProfile.groupBy({ by: ["acquisitionSourceId"], where, _count: { _all: true } }),
    getReferralSummary(filters)
  ]);

  const sourceIds = bySourceRows.map((row) => row.acquisitionSourceId).filter((value): value is string => Boolean(value));
  const sources = sourceIds.length
    ? await prisma.clientAcquisitionSource.findMany({ where: { id: { in: sourceIds } }, select: { id: true, name: true } })
    : [];
  const sourceMap = new Map(sources.map((source) => [source.id, source.name]));

  return {
    totalInRange,
    newInRange: totalInRange,
    withDocumentPct: totalInRange ? Math.round((withDocument / totalInRange) * 100) : 0,
    withPhonePct: totalInRange ? Math.round((withPhone / totalInRange) * 100) : 0,
    withEmailPct: totalInRange ? Math.round((withEmail / totalInRange) * 100) : 0,
    withBirthDatePct: totalInRange ? Math.round((withBirthDate / totalInRange) * 100) : 0,
    byType: byTypeRows
      .map((row) => ({ type: row.type, total: row._count._all }))
      .sort((a, b) => b.total - a.total),
    bySource: bySourceRows
      .map((row) => ({
        sourceName: row.acquisitionSourceId ? sourceMap.get(row.acquisitionSourceId) ?? "Canal" : "Sin canal",
        total: row._count._all
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8),
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
