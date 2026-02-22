import { ClientProfileType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";

export type ClientsHomeKpis = {
  totalClients: number;
  incompleteClients: number;
  documentsExpired: number;
  documentsExpiring: number;
  newClients7d: number;
  newClients30d: number;
  byType: Record<ClientProfileType, { total: number; incomplete: number; docsExpired: number; docsExpiring: number }>;
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function subDays(date: Date, days: number) {
  return addDays(date, -days);
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isPrismaUnknownArgumentError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("unknown argument");
}

async function safeClientProfileCount(args: unknown, context: string): Promise<number> {
  try {
    return await prisma.clientProfile.count(args as never);
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaUnknownArgumentError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[DEV][prisma] ${context}: ${message}`);
      return 0;
    }
    throw error;
  }
}

async function safeClientDocumentCount(args: unknown): Promise<number> {
  const delegate = (prisma as unknown as { clientDocument?: { count?: (a: unknown) => Promise<number> } }).clientDocument;
  if (!delegate?.count) return 0;
  try {
    return await delegate.count(args);
  } catch (error) {
    warnDevMissingTable("clients.dashboard.clientDocument.count", error);
    if (isPrismaMissingTableError(error)) return 0;
    throw error;
  }
}

function buildIncompleteWhereSafe(type: ClientProfileType) {
  if (type === ClientProfileType.PERSON) {
    return {
      deletedAt: null,
      type: ClientProfileType.PERSON,
      OR: [{ firstName: null }, { lastName: null }, { dpi: null }, { phone: null }]
    };
  }

  if (type === ClientProfileType.COMPANY) {
    return {
      deletedAt: null,
      type: ClientProfileType.COMPANY,
      OR: [{ companyName: null }, { nit: null }, { address: null }]
    };
  }

  if (type === ClientProfileType.INSURER) {
    return {
      deletedAt: null,
      type: ClientProfileType.INSURER,
      OR: [{ companyName: null }, { nit: null }]
    };
  }

  return {
    deletedAt: null,
    type: ClientProfileType.INSTITUTION,
    OR: [{ companyName: null }, { address: null }]
  };
}

function buildAnyIncompleteWhereSafe() {
  return {
    OR: [
      buildIncompleteWhereSafe(ClientProfileType.PERSON),
      buildIncompleteWhereSafe(ClientProfileType.COMPANY),
      buildIncompleteWhereSafe(ClientProfileType.INSURER),
      buildIncompleteWhereSafe(ClientProfileType.INSTITUTION)
    ]
  };
}

export async function getClientsHomeKpis(): Promise<ClientsHomeKpis> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const expiringUntil = addDays(todayStart, 30);
  const since7 = subDays(now, 7);
  const since30 = subDays(now, 30);

  const [
    totalClients,
    incompleteClients,
    documentsExpired,
    documentsExpiring,
    newClients7d,
    newClients30d,
    personTotal,
    companyTotal,
    insurerTotal,
    institutionTotal,
    personIncomplete,
    companyIncomplete,
    insurerIncomplete,
    institutionIncomplete,
    personDocsExpired,
    companyDocsExpired,
    insurerDocsExpired,
    institutionDocsExpired,
    personDocsExpiring,
    companyDocsExpiring,
    insurerDocsExpiring,
    institutionDocsExpiring
  ] = await Promise.all([
    prisma.clientProfile.count({ where: { deletedAt: null } }),
    safeClientProfileCount({ where: buildAnyIncompleteWhereSafe() }, "clients.dashboard.incompleteClients"),
    safeClientDocumentCount({ where: { expiresAt: { lt: todayStart }, client: { deletedAt: null } } }),
    safeClientDocumentCount({
      where: { expiresAt: { gte: todayStart, lte: expiringUntil }, client: { deletedAt: null } }
    }),
    prisma.clientProfile.count({ where: { deletedAt: null, createdAt: { gte: since7 } } }),
    prisma.clientProfile.count({ where: { deletedAt: null, createdAt: { gte: since30 } } }),

    prisma.clientProfile.count({ where: { deletedAt: null, type: ClientProfileType.PERSON } }),
    prisma.clientProfile.count({ where: { deletedAt: null, type: ClientProfileType.COMPANY } }),
    prisma.clientProfile.count({ where: { deletedAt: null, type: ClientProfileType.INSURER } }),
    prisma.clientProfile.count({ where: { deletedAt: null, type: ClientProfileType.INSTITUTION } }),

    safeClientProfileCount(
      { where: buildIncompleteWhereSafe(ClientProfileType.PERSON) },
      "clients.dashboard.incomplete.person"
    ),
    safeClientProfileCount(
      { where: buildIncompleteWhereSafe(ClientProfileType.COMPANY) },
      "clients.dashboard.incomplete.company"
    ),
    safeClientProfileCount(
      { where: buildIncompleteWhereSafe(ClientProfileType.INSURER) },
      "clients.dashboard.incomplete.insurer"
    ),
    safeClientProfileCount(
      { where: buildIncompleteWhereSafe(ClientProfileType.INSTITUTION) },
      "clients.dashboard.incomplete.institution"
    ),

    safeClientDocumentCount({
      where: { expiresAt: { lt: todayStart }, client: { deletedAt: null, type: ClientProfileType.PERSON } }
    }),
    safeClientDocumentCount({
      where: { expiresAt: { lt: todayStart }, client: { deletedAt: null, type: ClientProfileType.COMPANY } }
    }),
    safeClientDocumentCount({
      where: { expiresAt: { lt: todayStart }, client: { deletedAt: null, type: ClientProfileType.INSURER } }
    }),
    safeClientDocumentCount({
      where: { expiresAt: { lt: todayStart }, client: { deletedAt: null, type: ClientProfileType.INSTITUTION } }
    }),

    safeClientDocumentCount({
      where: {
        expiresAt: { gte: todayStart, lte: expiringUntil },
        client: { deletedAt: null, type: ClientProfileType.PERSON }
      }
    }),
    safeClientDocumentCount({
      where: {
        expiresAt: { gte: todayStart, lte: expiringUntil },
        client: { deletedAt: null, type: ClientProfileType.COMPANY }
      }
    }),
    safeClientDocumentCount({
      where: {
        expiresAt: { gte: todayStart, lte: expiringUntil },
        client: { deletedAt: null, type: ClientProfileType.INSURER }
      }
    }),
    safeClientDocumentCount({
      where: {
        expiresAt: { gte: todayStart, lte: expiringUntil },
        client: { deletedAt: null, type: ClientProfileType.INSTITUTION }
      }
    })
  ]);

  return {
    totalClients,
    incompleteClients,
    documentsExpired,
    documentsExpiring,
    newClients7d,
    newClients30d,
    byType: {
      [ClientProfileType.PERSON]: {
        total: personTotal,
        incomplete: personIncomplete,
        docsExpired: personDocsExpired,
        docsExpiring: personDocsExpiring
      },
      [ClientProfileType.COMPANY]: {
        total: companyTotal,
        incomplete: companyIncomplete,
        docsExpired: companyDocsExpired,
        docsExpiring: companyDocsExpiring
      },
      [ClientProfileType.INSURER]: {
        total: insurerTotal,
        incomplete: insurerIncomplete,
        docsExpired: insurerDocsExpired,
        docsExpiring: insurerDocsExpiring
      },
      [ClientProfileType.INSTITUTION]: {
        total: institutionTotal,
        incomplete: institutionIncomplete,
        docsExpired: institutionDocsExpired,
        docsExpiring: institutionDocsExpiring
      }
    }
  };
}
