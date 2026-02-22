import { ClientDocumentApprovalStatus, ClientProfileType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { safeGetClientRulesConfig } from "@/lib/clients/rulesConfig";
import {
  buildIncompleteWhere,
  getClientCompletenessScore,
  isClientIncomplete,
  type ClientCompletenessSnapshot
} from "./completeness";
import {
  buildRequiredDocumentsChecklist,
  warnDevMissingRequiredDocsDelegate,
  type RequiredDocumentRecordSnapshot,
  type RequiredDocumentRuleSnapshot
} from "./requiredDocuments";

export type ClientListAlertFilter =
  | "INCOMPLETE"
  | "DOCS_EXPIRED"
  | "DOCS_EXPIRING"
  | "REQUIRED_PENDING"
  | "REQUIRED_REJECTED"
  | "REQUIRED_EXPIRED"
  | "";

export type ClientListQuery = {
  type: ClientProfileType;
  q?: string;
  statusId?: string;
  alert?: ClientListAlertFilter;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
};

export type ClientListItem = {
  id: string;
  type: ClientProfileType;
  displayName: string;
  identifier: string | null;
  institutionTypeName: string | null;
  phone: string | null;
  email: string | null;
  statusLabel: string | null;
  isIncomplete: boolean;
  healthScore: number;
  hasExpiredDocs: boolean;
  hasExpiringDocs: boolean;
  expiredDocsPreview: Array<{ title: string; expiresAt: Date | null }>;
  expiringDocsPreview: Array<{ title: string; expiresAt: Date | null }>;
  requiredPendingCount: number;
  requiredRejectedCount: number;
  requiredExpiredCount: number;
  requiredMissingLabels: string[];
  isArchived: boolean;
  createdAt: Date;
};

export type ClientListKpis = {
  total: number;
  incomplete: number;
  docsExpired: number;
  docsExpiring: number;
  requiredPending: number;
  requiredRejected: number;
  requiredExpired: number;
};

export type ClientListResult = {
  items: ClientListItem[];
  total: number;
  page: number;
  pageSize: number;
  kpis: ClientListKpis;
};

type RequiredSummaryByClient = {
  requiredTotal: number;
  approvedAndValid: number;
  rejectedOrMissing: number;
  pendingCount: number;
  rejectedCount: number;
  expiredCount: number;
  missingLabels: string[];
};

type RequiredDocRuleRow = Prisma.ClientRequiredDocumentRuleGetPayload<{
  select: {
    id: true;
    clientType: true;
    documentTypeId: true;
    isRequired: true;
    requiresApproval: true;
    requiresExpiry: true;
    weight: true;
    isActive: true;
    documentType: { select: { name: true } };
  };
}>;

type RequiredDocRulesDelegate = {
  findMany?: (args: Prisma.ClientRequiredDocumentRuleFindManyArgs) => Promise<RequiredDocRuleRow[]>;
};

type RequiredDocumentRecordWithClientId = RequiredDocumentRecordSnapshot & {
  clientId: string;
};

type ClientDocumentCountDelegate = {
  count?: (args: Prisma.ClientDocumentCountArgs) => Promise<number>;
};

const warnedLegacyDocWorkflowContexts = new Set<string>();

function isLegacyDocumentWorkflowMissingColumnError(error: unknown): boolean {
  if (!isPrismaMissingTableError(error)) return false;
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    lowered.includes("supersededat") ||
    lowered.includes("approvalstatus") ||
    lowered.includes("rejectionreason") ||
    lowered.includes("supersededbydocumentid") ||
    lowered.includes("clientdocumentapprovalstatus")
  );
}

function warnDevLegacyDocumentWorkflow(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (!isLegacyDocumentWorkflowMissingColumnError(error)) return;
  if (warnedLegacyDocWorkflowContexts.has(context)) return;
  warnedLegacyDocWorkflowContexts.add(context);
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `[DEV][db] ${context}: faltan columnas del workflow de documentos en ClientDocument. ` +
      "Se aplicará fallback legacy. Ejecuta `npm run db:migrate:deploy` para habilitar versionado/aprobación. " +
      `Details: ${message}`
  );
}

async function safeSupportsDocumentWorkflowColumns(): Promise<boolean> {
  const delegate = (prisma as unknown as { clientDocument?: ClientDocumentCountDelegate }).clientDocument;
  if (!delegate?.count) return false;

  try {
    await delegate.count({ where: { supersededAt: null } });
    return true;
  } catch (error) {
    if (isLegacyDocumentWorkflowMissingColumnError(error)) {
      warnDevLegacyDocumentWorkflow("clients.list.clientDocument.workflowColumns", error);
      return false;
    }
    throw error;
  }
}

function buildExpiredDocumentsWhere(todayStart: Date, supportsDocumentWorkflowColumns: boolean): Prisma.ClientDocumentWhereInput {
  if (supportsDocumentWorkflowColumns) {
    return { supersededAt: null, expiresAt: { lt: todayStart } };
  }
  return { expiresAt: { lt: todayStart } };
}

function buildExpiringDocumentsWhere(
  todayStart: Date,
  expiringUntil: Date,
  supportsDocumentWorkflowColumns: boolean
): Prisma.ClientDocumentWhereInput {
  if (supportsDocumentWorkflowColumns) {
    return { supersededAt: null, expiresAt: { gte: todayStart, lte: expiringUntil } };
  }
  return { expiresAt: { gte: todayStart, lte: expiringUntil } };
}

async function safeRequiredDocRulesFindMany(args: Prisma.ClientRequiredDocumentRuleFindManyArgs): Promise<RequiredDocRuleRow[]> {
  const delegate = (prisma as unknown as { clientRequiredDocumentRule?: RequiredDocRulesDelegate }).clientRequiredDocumentRule;
  if (!delegate?.findMany) {
    warnDevMissingRequiredDocsDelegate("clients.requiredDocs.rules.findMany");
    return [];
  }

  try {
    return await delegate.findMany(args);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("clients.requiredDocs.rules.findMany", error);
      return [];
    }
    throw error;
  }
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildSearchWhere(type: ClientProfileType, q: string): Prisma.ClientProfileWhereInput {
  const needle = q.trim();
  if (!needle) return { type };

  if (type === ClientProfileType.PERSON) {
    return {
      type,
      OR: [
        { firstName: { contains: needle, mode: "insensitive" } },
        { middleName: { contains: needle, mode: "insensitive" } },
        { lastName: { contains: needle, mode: "insensitive" } },
        { secondLastName: { contains: needle, mode: "insensitive" } },
        { dpi: { contains: needle, mode: "insensitive" } },
        { phone: { contains: needle, mode: "insensitive" } },
        { phoneE164: { contains: needle, mode: "insensitive" } }
      ]
    };
  }

  if (type === ClientProfileType.COMPANY) {
    return {
      type,
      OR: [
        { companyName: { contains: needle, mode: "insensitive" } },
        { tradeName: { contains: needle, mode: "insensitive" } },
        { nit: { contains: needle, mode: "insensitive" } },
        { email: { contains: needle, mode: "insensitive" } },
        { phone: { contains: needle, mode: "insensitive" } },
        { phoneE164: { contains: needle, mode: "insensitive" } }
      ]
    };
  }

  if (type === ClientProfileType.INSURER) {
    return {
      type,
      OR: [
        { companyName: { contains: needle, mode: "insensitive" } },
        { tradeName: { contains: needle, mode: "insensitive" } },
        { nit: { contains: needle, mode: "insensitive" } },
        { email: { contains: needle, mode: "insensitive" } },
        { phone: { contains: needle, mode: "insensitive" } },
        { phoneE164: { contains: needle, mode: "insensitive" } }
      ]
    };
  }

  return {
    type,
    OR: [
      { companyName: { contains: needle, mode: "insensitive" } },
      { nit: { contains: needle, mode: "insensitive" } },
      { email: { contains: needle, mode: "insensitive" } },
      { phone: { contains: needle, mode: "insensitive" } },
      { phoneE164: { contains: needle, mode: "insensitive" } },
      { institutionType: { is: { name: { contains: needle, mode: "insensitive" } } } }
    ]
  };
}

export async function listClients(query: ClientListQuery): Promise<ClientListResult> {
  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 10), 1000);
  const page = Math.max(query.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const q = query.q?.trim() ?? "";
  const now = new Date();
  const todayStart = startOfDay(now);
  const expiringUntil = addDays(todayStart, 30);

  const [supportsDocumentWorkflowColumns, rulesConfig, requiredRulesRows] = await Promise.all([
    safeSupportsDocumentWorkflowColumns(),
    safeGetClientRulesConfig("clients.list"),
    safeRequiredDocRulesFindMany({
      where: { clientType: query.type, isActive: true, isRequired: true },
      orderBy: { documentType: { name: "asc" } },
      select: {
        id: true,
        clientType: true,
        documentTypeId: true,
        isRequired: true,
        requiresApproval: true,
        requiresExpiry: true,
        weight: true,
        isActive: true,
        documentType: { select: { name: true } }
      }
    })
  ]);
  const requiredRules: RequiredDocumentRuleSnapshot[] = requiredRulesRows.map((rule) => ({
    id: rule.id,
    clientType: rule.clientType,
    documentTypeId: rule.documentTypeId,
    documentTypeName: rule.documentType.name,
    isRequired: rule.isRequired,
    requiresApproval: rule.requiresApproval,
    requiresExpiry: rule.requiresExpiry,
    weight: rule.weight,
    isActive: rule.isActive
  }));
  const requiredDocTypeIds = requiredRules.map((rule) => rule.documentTypeId);
  const profileWeight = rulesConfig.healthProfileWeight;
  const documentsWeight = rulesConfig.healthDocsWeight;

  const baseWhere: Prisma.ClientProfileWhereInput = {
    ...buildSearchWhere(query.type, q),
    ...(query.includeArchived ? {} : { deletedAt: null }),
    ...(query.statusId ? { statusId: query.statusId } : {})
  };

  const isRequiredAlert =
    query.alert === "REQUIRED_PENDING" || query.alert === "REQUIRED_REJECTED" || query.alert === "REQUIRED_EXPIRED";
  const expiredDocumentsWhere = buildExpiredDocumentsWhere(todayStart, supportsDocumentWorkflowColumns);
  const expiringDocumentsWhere = buildExpiringDocumentsWhere(todayStart, expiringUntil, supportsDocumentWorkflowColumns);

  const alertWhere: Prisma.ClientProfileWhereInput = (() => {
    if (isRequiredAlert) return baseWhere;
    if (!query.alert) return baseWhere;
    if (query.alert === "INCOMPLETE") {
      return { AND: [baseWhere, buildIncompleteWhere(query.type)] };
    }
    if (query.alert === "DOCS_EXPIRED") {
      return { AND: [baseWhere, { clientDocuments: { some: expiredDocumentsWhere } }] };
    }
    if (query.alert === "DOCS_EXPIRING") {
      return {
        AND: [baseWhere, { clientDocuments: { some: expiringDocumentsWhere } }]
      };
    }
    return baseWhere;
  })();
  const baseClientRows = await prisma.clientProfile.findMany({
    where: baseWhere,
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });
  const baseClientIds = baseClientRows.map((row) => row.id);

  const requiredSummaryByClient = new Map<string, RequiredSummaryByClient>();
  let requiredPendingTotal = 0;
  let requiredRejectedTotal = 0;
  let requiredExpiredTotal = 0;

  if (requiredRules.length && baseClientIds.length) {
    const requiredDocsRows: RequiredDocumentRecordWithClientId[] = supportsDocumentWorkflowColumns
      ? (
          await prisma.clientDocument.findMany({
            where: {
              clientId: { in: baseClientIds },
              supersededAt: null,
              documentTypeId: { in: requiredDocTypeIds }
            },
            select: {
              id: true,
              clientId: true,
              title: true,
              documentTypeId: true,
              fileUrl: true,
              fileAssetId: true,
              approvalStatus: true,
              expiresAt: true,
              createdAt: true,
              rejectionReason: true
            }
          })
        ).map((doc) => ({
          id: doc.id,
          clientId: doc.clientId,
          documentTypeId: doc.documentTypeId,
          title: doc.title,
          fileUrl: doc.fileUrl ?? null,
          fileAssetId: doc.fileAssetId ?? null,
          approvalStatus: doc.approvalStatus,
          expiresAt: doc.expiresAt ?? null,
          createdAt: doc.createdAt,
          rejectionReason: doc.rejectionReason ?? null
        }))
      : (
          await prisma.clientDocument.findMany({
            where: {
              clientId: { in: baseClientIds },
              documentTypeId: { in: requiredDocTypeIds }
            },
            select: {
              id: true,
              title: true,
              documentTypeId: true,
              fileUrl: true,
              expiresAt: true,
              createdAt: true,
              clientId: true
            }
          })
        ).map((doc) => ({
          id: doc.id,
          clientId: doc.clientId,
          documentTypeId: doc.documentTypeId,
          title: doc.title,
          fileUrl: doc.fileUrl ?? null,
          fileAssetId: null,
          approvalStatus: ClientDocumentApprovalStatus.PENDING,
          expiresAt: doc.expiresAt ?? null,
          createdAt: doc.createdAt,
          rejectionReason: null
        }));

    const docsByClient = new Map<string, RequiredDocumentRecordSnapshot[]>();
    for (const doc of requiredDocsRows) {
      const list = docsByClient.get(doc.clientId) ?? [];
      list.push(doc);
      docsByClient.set(doc.clientId, list);
    }

    for (const clientId of baseClientIds) {
      const summary = buildRequiredDocumentsChecklist({
        rules: requiredRules,
        documents: docsByClient.get(clientId) ?? [],
        now
      }).summary;

      requiredSummaryByClient.set(clientId, {
        requiredTotal: summary.requiredTotal,
        approvedAndValid: summary.approvedAndValid,
        rejectedOrMissing: summary.rejectedOrMissing,
        pendingCount: summary.pendingCount,
        rejectedCount: summary.rejectedCount,
        expiredCount: summary.expiredCount,
        missingLabels: summary.missingLabels
      });

      if (summary.pendingCount > 0) requiredPendingTotal += 1;
      if (summary.rejectedCount > 0) requiredRejectedTotal += 1;
      if (summary.expiredCount > 0) requiredExpiredTotal += 1;
    }
  }

  const [baseTotal, incompleteTotal, docsExpiredTotal, docsExpiringTotal] = await Promise.all([
    prisma.clientProfile.count({ where: baseWhere }),
    prisma.clientProfile.count({ where: { AND: [baseWhere, buildIncompleteWhere(query.type)] } }),
    prisma.clientProfile.count({
      where: {
        AND: [baseWhere, { clientDocuments: { some: expiredDocumentsWhere } }]
      }
    }),
    prisma.clientProfile.count({
      where: {
        AND: [baseWhere, { clientDocuments: { some: expiringDocumentsWhere } }]
      }
    })
  ]);

  const filteredIdsForRequiredAlert =
    isRequiredAlert && requiredRules.length
      ? baseClientIds.filter((clientId) => {
          const summary = requiredSummaryByClient.get(clientId);
          if (!summary) return false;
          if (query.alert === "REQUIRED_PENDING") return summary.pendingCount > 0;
          if (query.alert === "REQUIRED_REJECTED") return summary.rejectedCount > 0;
          if (query.alert === "REQUIRED_EXPIRED") return summary.expiredCount > 0;
          return true;
        })
      : [];
  const total = isRequiredAlert ? filteredIdsForRequiredAlert.length : await prisma.clientProfile.count({ where: alertWhere });

  const pagedIdsForRequiredAlert = isRequiredAlert ? filteredIdsForRequiredAlert.slice(offset, offset + pageSize) : [];

  const rowDocumentWhere: Prisma.ClientDocumentWhereInput =
    requiredDocTypeIds.length > 0
      ? {
          ...(supportsDocumentWorkflowColumns ? { supersededAt: null } : {}),
          OR: [{ expiresAt: { not: null, lte: expiringUntil } }, { documentTypeId: { in: requiredDocTypeIds } }]
        }
      : {
          ...(supportsDocumentWorkflowColumns ? { supersededAt: null } : {}),
          expiresAt: { not: null, lte: expiringUntil }
        };

  const rows = await prisma.clientProfile.findMany({
    where: isRequiredAlert ? { id: { in: pagedIdsForRequiredAlert } } : alertWhere,
    orderBy: { createdAt: "desc" },
    ...(isRequiredAlert ? {} : { skip: offset, take: pageSize }),
    select: {
      id: true,
      type: true,
      companyName: true,
      tradeName: true,
      firstName: true,
      middleName: true,
      lastName: true,
      secondLastName: true,
      dpi: true,
      nit: true,
      phone: true,
      phoneE164: true,
      email: true,
      address: true,
      city: true,
      department: true,
      institutionTypeId: true,
      institutionType: { select: { name: true } },
      status: { select: { name: true } },
      deletedAt: true,
      createdAt: true,
      clientDocuments: {
        where: rowDocumentWhere,
        select: {
          id: true,
          title: true,
          documentTypeId: true,
          expiresAt: true,
          fileUrl: true,
          createdAt: true
        },
        orderBy: [{ createdAt: "desc" }, { expiresAt: "asc" }],
        take: 80
      }
    }
  });

  const items = rows.map((row): ClientListItem => {
    const snapshot: ClientCompletenessSnapshot = {
      type: row.type,
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
      secondLastName: row.secondLastName,
      dpi: row.dpi,
      phone: row.phoneE164 ?? row.phone,
      companyName: row.companyName,
      tradeName: row.tradeName,
      nit: row.nit,
      address: row.address,
      city: row.city,
      department: row.department,
      institutionTypeId: row.institutionTypeId
    };

    const isIncomplete = isClientIncomplete(snapshot);
    const requiredSummary = requiredSummaryByClient.get(row.id) ?? {
      requiredTotal: 0,
      approvedAndValid: 0,
      rejectedOrMissing: 0,
      pendingCount: 0,
      rejectedCount: 0,
      expiredCount: 0,
      missingLabels: []
    };
    const healthScore = getClientCompletenessScore(snapshot, {
      documents: {
        requiredTotal: requiredSummary.requiredTotal,
        approvedAndValid: requiredSummary.approvedAndValid,
        rejectedOrMissing: requiredSummary.rejectedOrMissing
      },
      weights: { profile: profileWeight, documents: documentsWeight }
    });
    const hasExpiredDocs = row.clientDocuments.some((doc) => doc.expiresAt && doc.expiresAt < todayStart);
    const hasExpiringDocs = row.clientDocuments.some(
      (doc) => doc.expiresAt && doc.expiresAt >= todayStart && doc.expiresAt <= expiringUntil
    );
    const expiredDocsPreview = row.clientDocuments
      .filter((doc) => doc.expiresAt && doc.expiresAt < todayStart)
      .slice(0, 6)
      .map((doc) => ({ title: doc.title, expiresAt: doc.expiresAt }));
    const expiringDocsPreview = row.clientDocuments
      .filter((doc) => doc.expiresAt && doc.expiresAt >= todayStart && doc.expiresAt <= expiringUntil)
      .slice(0, 6)
      .map((doc) => ({ title: doc.title, expiresAt: doc.expiresAt }));

    const displayName =
      row.type === ClientProfileType.PERSON
        ? [row.firstName, row.middleName, row.lastName, row.secondLastName].filter(Boolean).join(" ") ||
          "Persona"
        : row.companyName || row.tradeName || "Cliente";

    const identifier = row.type === ClientProfileType.PERSON ? row.dpi : row.nit;

    return {
      id: row.id,
      type: row.type,
      displayName,
      identifier,
      institutionTypeName: row.institutionType?.name ?? null,
      phone: row.phoneE164 ?? row.phone,
      email: row.email,
      statusLabel: row.status?.name ?? null,
      isIncomplete,
      healthScore,
      hasExpiredDocs,
      hasExpiringDocs,
      expiredDocsPreview,
      expiringDocsPreview,
      requiredPendingCount: requiredSummary.pendingCount,
      requiredRejectedCount: requiredSummary.rejectedCount,
      requiredExpiredCount: requiredSummary.expiredCount,
      requiredMissingLabels: requiredSummary.missingLabels,
      isArchived: Boolean(row.deletedAt),
      createdAt: row.createdAt
    };
  });

  return {
    items,
    total,
    page,
    pageSize,
    kpis: {
      total: baseTotal,
      incomplete: incompleteTotal,
      docsExpired: docsExpiredTotal,
      docsExpiring: docsExpiringTotal,
      requiredPending: requiredPendingTotal,
      requiredRejected: requiredRejectedTotal,
      requiredExpired: requiredExpiredTotal
    }
  };
}
