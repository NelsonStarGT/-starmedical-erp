import { ClientDocumentApprovalStatus, ClientProfileType } from "@prisma/client";

const warnedMissingDelegateContexts = new Set<string>();

export function warnDevMissingRequiredDocsDelegate(context: string) {
  if (process.env.NODE_ENV === "production") return;
  if (warnedMissingDelegateContexts.has(context)) return;
  warnedMissingDelegateContexts.add(context);
  console.warn(
    `[DEV][db] ${context}: prisma.clientRequiredDocumentRule delegate is missing. ` +
      "Run `npx prisma generate` and apply the required docs migration."
  );
}

export type RequiredDocumentRuleSnapshot = {
  id: string;
  clientType: ClientProfileType;
  documentTypeId: string;
  documentTypeName: string;
  isRequired: boolean;
  requiresApproval: boolean;
  requiresExpiry: boolean;
  weight: number;
  isActive: boolean;
};

export type RequiredDocumentRecordSnapshot = {
  id: string;
  documentTypeId: string | null;
  title: string;
  fileUrl: string | null;
  fileAssetId: string | null;
  approvalStatus: ClientDocumentApprovalStatus;
  expiresAt: Date | null;
  createdAt: Date;
  rejectionReason: string | null;
};

export type RequiredDocumentChecklistStatus = "APPROVED_VALID" | "PENDING" | "REJECTED" | "EXPIRED" | "MISSING";

export type RequiredDocumentChecklistItem = {
  ruleId: string;
  documentTypeId: string;
  documentTypeName: string;
  status: RequiredDocumentChecklistStatus;
  weight: number;
  requiresApproval: boolean;
  requiresExpiry: boolean;
  matchedDocumentId: string | null;
  matchedDocumentTitle: string | null;
  matchedApprovalStatus: ClientDocumentApprovalStatus | null;
  matchedExpiresAt: Date | null;
  matchedRejectionReason: string | null;
};

export type RequiredDocumentsSummary = {
  requiredTotal: number;
  approvedAndValid: number;
  rejectedOrMissing: number;
  pendingCount: number;
  rejectedCount: number;
  expiredCount: number;
  missingCount: number;
  missingLabels: string[];
};

export type RequiredDocumentsChecklistResult = {
  items: RequiredDocumentChecklistItem[];
  summary: RequiredDocumentsSummary;
};

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function hasFile(doc: RequiredDocumentRecordSnapshot | null) {
  if (!doc) return false;
  return Boolean((doc.fileUrl && doc.fileUrl.trim()) || (doc.fileAssetId && doc.fileAssetId.trim()));
}

function normalizeWeight(weight: number | null | undefined) {
  if (!Number.isFinite(weight)) return 1;
  return Math.min(10, Math.max(1, Math.floor(weight as number)));
}

function pickLatestDocumentByType(documents: RequiredDocumentRecordSnapshot[]) {
  const latest = new Map<string, RequiredDocumentRecordSnapshot>();

  for (const doc of documents) {
    const typeId = doc.documentTypeId;
    if (!typeId) continue;

    const current = latest.get(typeId);
    if (!current || doc.createdAt.getTime() > current.createdAt.getTime()) {
      latest.set(typeId, doc);
    }
  }

  return latest;
}

function resolveChecklistStatus(params: {
  rule: RequiredDocumentRuleSnapshot;
  document: RequiredDocumentRecordSnapshot | null;
  todayStart: Date;
}): RequiredDocumentChecklistStatus {
  const { rule, document, todayStart } = params;

  if (!document || !hasFile(document)) return "MISSING";
  if (document.approvalStatus === ClientDocumentApprovalStatus.REJECTED) return "REJECTED";

  const isExpired = Boolean(document.expiresAt && document.expiresAt < todayStart);
  if (rule.requiresExpiry && isExpired) return "EXPIRED";

  if (rule.requiresApproval && document.approvalStatus !== ClientDocumentApprovalStatus.APPROVED) {
    return "PENDING";
  }

  if (rule.requiresExpiry && !document.expiresAt) {
    return "PENDING";
  }

  return "APPROVED_VALID";
}

export function buildRequiredDocumentsChecklist(params: {
  rules: RequiredDocumentRuleSnapshot[];
  documents: RequiredDocumentRecordSnapshot[];
  now?: Date;
}): RequiredDocumentsChecklistResult {
  const activeRequiredRules = params.rules
    .filter((rule) => rule.isActive && rule.isRequired)
    .sort((a, b) => a.documentTypeName.localeCompare(b.documentTypeName));

  if (!activeRequiredRules.length) {
    return {
      items: [],
      summary: {
        requiredTotal: 0,
        approvedAndValid: 0,
        rejectedOrMissing: 0,
        pendingCount: 0,
        rejectedCount: 0,
        expiredCount: 0,
        missingCount: 0,
        missingLabels: []
      }
    };
  }

  const latestByType = pickLatestDocumentByType(params.documents);
  const todayStart = startOfDay(params.now ?? new Date());

  const items = activeRequiredRules.map((rule): RequiredDocumentChecklistItem => {
    const doc = latestByType.get(rule.documentTypeId) ?? null;
    const status = resolveChecklistStatus({ rule, document: doc, todayStart });

    return {
      ruleId: rule.id,
      documentTypeId: rule.documentTypeId,
      documentTypeName: rule.documentTypeName,
      status,
      weight: normalizeWeight(rule.weight),
      requiresApproval: rule.requiresApproval,
      requiresExpiry: rule.requiresExpiry,
      matchedDocumentId: doc?.id ?? null,
      matchedDocumentTitle: doc?.title ?? null,
      matchedApprovalStatus: doc?.approvalStatus ?? null,
      matchedExpiresAt: doc?.expiresAt ?? null,
      matchedRejectionReason: doc?.rejectionReason ?? null
    };
  });

  const summary = items.reduce<RequiredDocumentsSummary>(
    (acc, item) => {
      acc.requiredTotal += item.weight;

      if (item.status === "APPROVED_VALID") {
        acc.approvedAndValid += item.weight;
      }

      if (item.status === "REJECTED" || item.status === "MISSING" || item.status === "EXPIRED") {
        acc.rejectedOrMissing += item.weight;
      }

      if (item.status === "PENDING") acc.pendingCount += 1;
      if (item.status === "REJECTED") acc.rejectedCount += 1;
      if (item.status === "EXPIRED") acc.expiredCount += 1;
      if (item.status === "MISSING") acc.missingCount += 1;

      if (item.status !== "APPROVED_VALID") {
        acc.missingLabels.push(item.documentTypeName);
      }

      return acc;
    },
    {
      requiredTotal: 0,
      approvedAndValid: 0,
      rejectedOrMissing: 0,
      pendingCount: 0,
      rejectedCount: 0,
      expiredCount: 0,
      missingCount: 0,
      missingLabels: []
    }
  );

  return { items, summary };
}
