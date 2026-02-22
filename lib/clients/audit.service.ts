import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ClientAuditParams = {
  actorUserId: string | null;
  actorRole: string | null;
  clientId: string;
  action: string;
  metadata?: Record<string, unknown> | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

function normalizeClientIdForAudit(clientId: string, action: string) {
  const normalized = String(clientId || "").trim();
  if (normalized) return normalized;

  const baseMessage = "No se puede auditar cliente sin clientId.";
  if (process.env.NODE_ENV !== "production") {
    throw new Error(`[DEV][clients.audit] ${baseMessage} action=${action}`);
  }
  throw new Error(baseMessage);
}

export async function logClientAuditTx(tx: Prisma.TransactionClient, params: ClientAuditParams) {
  const clientId = normalizeClientIdForAudit(params.clientId, params.action);
  const metadata = params.metadata as Prisma.InputJsonValue | undefined;
  const before = params.before as Prisma.InputJsonValue | undefined;
  const after = params.after as Prisma.InputJsonValue | undefined;

  await tx.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      action: params.action,
      entityType: "ClientProfile",
      entityId: clientId,
      metadata,
      before,
      after
    }
  });

  await tx.clientAuditEvent.create({
    data: {
      clientId,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      action: params.action,
      metadata
    }
  });
}

export async function logClientAudit(params: ClientAuditParams) {
  await prisma.$transaction(async (tx) => {
    await logClientAuditTx(tx, params);
  });
}
