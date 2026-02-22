import { NextRequest, NextResponse } from "next/server";
import { ClientDocumentApprovalStatus, ClientProfileType, Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { isAdmin } from "@/lib/rbac";
import { CLIENT_TYPE_LABELS } from "@/lib/clients/constants";
import { safeGetClientRulesConfig } from "@/lib/clients/rulesConfig";
import {
  buildClientProfileSelect,
  readClientProfilePhotoFields,
  safeSupportsClientProfilePhotoColumns
} from "@/lib/clients/clientProfileSchema";
import {
  getClientCompletenessScore,
  isClientIncomplete,
  type ClientCompletenessSnapshot
} from "@/lib/clients/completeness";
import { resolveClientIdFromRef } from "@/lib/clients/detailResolver";
import { getClientDocumentPermissions } from "@/lib/clients/permissions";
import { buildRequiredDocumentsChecklist, warnDevMissingRequiredDocsDelegate } from "@/lib/clients/requiredDocuments";

export const runtime = "nodejs";

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

type ClientDocumentCountDelegate = {
  count?: (args: Prisma.ClientDocumentCountArgs) => Promise<number>;
};

type PreviewDocumentSnapshot = {
  id: string;
  title: string;
  documentTypeId: string | null;
  documentTypeName: string | null;
  expiresAt: Date | null;
  fileUrl: string | null;
  fileAssetId: string | null;
  originalName: string | null;
  createdAt: Date;
  approvalStatus: ClientDocumentApprovalStatus;
  rejectionReason: string | null;
  version: number;
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
    lowered.includes("version")
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
      warnDevLegacyDocumentWorkflow("clients.preview.clientDocument.workflowColumns", error);
      return false;
    }
    throw error;
  }
}

async function safeRequiredDocRulesFindMany(args: Prisma.ClientRequiredDocumentRuleFindManyArgs): Promise<RequiredDocRuleRow[]> {
  const delegate = (prisma as unknown as { clientRequiredDocumentRule?: RequiredDocRulesDelegate }).clientRequiredDocumentRule;
  if (!delegate?.findMany) {
    warnDevMissingRequiredDocsDelegate("clients.preview.requiredDocs.rules.findMany");
    return [];
  }

  try {
    return await delegate.findMany(args);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("clients.preview.requiredDocs.rules.findMany", error);
      return [];
    }
    throw error;
  }
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getDisplayName(client: {
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
}) {
  if (client.type === ClientProfileType.PERSON) {
    return [client.firstName, client.middleName, client.lastName, client.secondLastName].filter(Boolean).join(" ") || "Persona";
  }
  return client.companyName || client.tradeName || "Cliente";
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = requireAuth(_req);
  if (auth.errorResponse) return auth.errorResponse;

  const permissions = getClientDocumentPermissions(auth.user);
  if (!auth.user) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }
  const canReturnDocumentList = isAdmin(auth.user) || permissions.canViewDocs;

  const routeParams = await context.params;
  const requestedId = routeParams.id?.trim() ?? "";
  if (!requestedId) {
    return NextResponse.json({ ok: false, error: "Identificador inválido." }, { status: 400 });
  }

  const supportsPhotoColumns = await safeSupportsClientProfilePhotoColumns("clients.preview");
  const clientSelect = buildClientProfileSelect(supportsPhotoColumns);

  let resolvedId = requestedId;
  let client = await prisma.clientProfile.findFirst({
    where: { id: requestedId, deletedAt: null },
    select: clientSelect
  });

  if (!client) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[DEV][clients.preview] client not found by id", { requestedId });
    }

    const fallbackResolvedId = await resolveClientIdFromRef(requestedId);
    if (fallbackResolvedId && fallbackResolvedId !== requestedId) {
      resolvedId = fallbackResolvedId;
      client = await prisma.clientProfile.findFirst({
        where: { id: fallbackResolvedId, deletedAt: null },
        select: clientSelect
      });
    }
  }

  if (!client) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[DEV][clients.preview] client not found after fallback", { requestedId, resolvedId });
    }
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const { photoUrl } = readClientProfilePhotoFields(client);

  const now = new Date();
  const today = startOfDay(now);
  const expiringUntil = addDays(today, 30);
  const [supportsDocumentWorkflowColumns, rulesConfig, requiredRulesRows] = await Promise.all([
    safeSupportsDocumentWorkflowColumns(),
    safeGetClientRulesConfig("clients.preview"),
    safeRequiredDocRulesFindMany({
      where: { clientType: client.type, isActive: true, isRequired: true },
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
  const requiredDocTypeIds = requiredRulesRows.map((rule) => rule.documentTypeId);

  const documents: PreviewDocumentSnapshot[] = supportsDocumentWorkflowColumns
    ? (
        await prisma.clientDocument.findMany({
          where: { clientId: client.id, supersededAt: null },
          orderBy: { createdAt: "desc" },
          take: 60,
          select: {
            id: true,
            title: true,
            documentTypeId: true,
            expiresAt: true,
            fileUrl: true,
            fileAssetId: true,
            originalName: true,
            createdAt: true,
            approvalStatus: true,
            rejectionReason: true,
            version: true,
            documentType: { select: { name: true } }
          }
        })
      ).map((doc) => ({
        id: doc.id,
        title: doc.title,
        documentTypeId: doc.documentTypeId,
        documentTypeName: doc.documentType?.name ?? null,
        expiresAt: doc.expiresAt ?? null,
        fileUrl: doc.fileUrl ?? null,
        fileAssetId: doc.fileAssetId ?? null,
        originalName: doc.originalName ?? null,
        createdAt: doc.createdAt,
        approvalStatus: doc.approvalStatus,
        rejectionReason: doc.rejectionReason ?? null,
        version: doc.version
      }))
    : (
        await prisma.clientDocument.findMany({
          where: { clientId: client.id },
          orderBy: { createdAt: "desc" },
          take: 60,
          select: {
            id: true,
            title: true,
            documentTypeId: true,
            expiresAt: true,
            fileUrl: true,
            originalName: true,
            createdAt: true,
            documentType: { select: { name: true } }
          }
        })
      ).map((doc) => ({
        id: doc.id,
        title: doc.title,
        documentTypeId: doc.documentTypeId,
        documentTypeName: doc.documentType?.name ?? null,
        expiresAt: doc.expiresAt ?? null,
        fileUrl: doc.fileUrl ?? null,
        fileAssetId: null,
        originalName: doc.originalName ?? null,
        createdAt: doc.createdAt,
        approvalStatus: ClientDocumentApprovalStatus.PENDING,
        rejectionReason: null,
        version: 1
      }));

  const snapshot: ClientCompletenessSnapshot = {
    type: client.type,
    firstName: client.firstName,
    middleName: client.middleName,
    lastName: client.lastName,
    secondLastName: client.secondLastName,
    dpi: client.dpi,
    phone: client.phone,
    companyName: client.companyName,
    tradeName: client.tradeName,
    nit: client.nit,
    address: client.address,
    city: client.city,
    department: client.department,
    institutionTypeId: null
  };

  const mappedDocs = documents.map((doc) => {
    const isExpired = Boolean(doc.expiresAt && doc.expiresAt < today);
    const isExpiring = Boolean(doc.expiresAt && doc.expiresAt >= today && doc.expiresAt <= expiringUntil);
    const hasFile = Boolean(doc.fileUrl || doc.fileAssetId);
    const status = !hasFile ? "Faltante" : isExpired ? "Vencido" : isExpiring ? "Por vencer" : "Vigente";

    return {
      id: doc.id,
      title: doc.title,
      documentTypeName: doc.documentTypeName,
      expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
      createdAt: doc.createdAt.toISOString(),
      fileUrl: doc.fileUrl ?? null,
      originalName: doc.originalName ?? null,
      status,
      approvalStatus: doc.approvalStatus,
      rejectionReason: doc.rejectionReason ?? null,
      version: doc.version,
      isApproved: doc.approvalStatus === ClientDocumentApprovalStatus.APPROVED
    };
  });

  const requiredChecklist = buildRequiredDocumentsChecklist({
    rules: requiredRulesRows.map((rule) => ({
      id: rule.id,
      clientType: rule.clientType,
      documentTypeId: rule.documentTypeId,
      documentTypeName: rule.documentType.name,
      isRequired: rule.isRequired,
      requiresApproval: rule.requiresApproval,
      requiresExpiry: rule.requiresExpiry,
      weight: rule.weight,
      isActive: rule.isActive
    })),
    documents: documents
      .filter((doc) => Boolean(doc.documentTypeId && requiredDocTypeIds.includes(doc.documentTypeId)))
      .map((doc) => ({
        id: doc.id,
        documentTypeId: doc.documentTypeId,
        title: doc.title,
        fileUrl: doc.fileUrl ?? null,
        fileAssetId: doc.fileAssetId ?? null,
        approvalStatus: doc.approvalStatus,
        expiresAt: doc.expiresAt ?? null,
        createdAt: doc.createdAt,
        rejectionReason: doc.rejectionReason ?? null
      })),
    now
  });

  const computedHealthScore = getClientCompletenessScore(snapshot, {
    documents: {
      requiredTotal: requiredChecklist.summary.requiredTotal,
      approvedAndValid: requiredChecklist.summary.approvedAndValid,
      rejectedOrMissing: requiredChecklist.summary.rejectedOrMissing
    },
    weights: {
      profile: rulesConfig.healthProfileWeight,
      documents: rulesConfig.healthDocsWeight
    }
  });
  const computedIsIncomplete = isClientIncomplete(snapshot, {
    documents: {
      requiredTotal: requiredChecklist.summary.requiredTotal,
      approvedAndValid: requiredChecklist.summary.approvedAndValid,
      rejectedOrMissing: requiredChecklist.summary.rejectedOrMissing
    },
    weights: {
      profile: rulesConfig.healthProfileWeight,
      documents: rulesConfig.healthDocsWeight
    }
  });

  return NextResponse.json({
    ok: true,
    client: {
      id: client.id,
      type: client.type,
      typeLabel: CLIENT_TYPE_LABELS[client.type],
      displayName: getDisplayName(client),
      firstName: client.firstName,
      middleName: client.middleName,
      lastName: client.lastName,
      secondLastName: client.secondLastName,
      dpi: client.dpi,
      nit: client.nit,
      identifier: client.type === ClientProfileType.PERSON ? client.dpi : client.nit,
      phone: client.phone,
      email: client.email,
      photoUrl,
      address: client.address,
      city: client.city,
      department: client.department,
      country: client.country,
      statusLabel: client.status?.name ?? null,
      isIncomplete: computedIsIncomplete,
      healthScore: computedHealthScore,
      hasExpiredDocs: mappedDocs.some((doc) => doc.status === "Vencido"),
      hasExpiringDocs: mappedDocs.some((doc) => doc.status === "Por vencer"),
      requiredPendingCount: requiredChecklist.summary.pendingCount,
      requiredRejectedCount: requiredChecklist.summary.rejectedCount,
      requiredExpiredCount: requiredChecklist.summary.expiredCount,
      profileHref: `/admin/clientes/${client.id}`
    },
    documents: canReturnDocumentList ? mappedDocs : [],
    permissions
  });
}
