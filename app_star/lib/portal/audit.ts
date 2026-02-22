import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";

export type PortalAuditAction =
  | "OTP_REQUESTED"
  | "OTP_VERIFIED"
  | "LOGIN_FAILED"
  | "SESSION_REFRESHED"
  | "SESSION_REVOKED"
  | "PORTAL_VIEWED"
  | "RESULT_DOWNLOADED"
  | "APPOINTMENT_REQUESTED";

type PortalAuditDelegate = {
  create?: (args: Prisma.PortalAuditLogCreateArgs) => Promise<unknown>;
};

function getPortalAuditDelegate() {
  return (prisma as unknown as { portalAuditLog?: PortalAuditDelegate }).portalAuditLog;
}

export async function safeCreatePortalAuditLog(input: {
  clientId?: string | null;
  action: PortalAuditAction;
  metadata?: Prisma.InputJsonValue;
}) {
  const delegate = getPortalAuditDelegate();
  if (!delegate?.create) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[DEV][portal.audit] Prisma delegate portalAuditLog no disponible. Ejecuta prisma generate.");
    }
    return;
  }

  try {
    await delegate.create({
      data: {
        clientId: input.clientId ?? null,
        action: input.action,
        metadata: input.metadata ?? Prisma.JsonNull
      }
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("portal.audit.create", error);
      return;
    }
    console.error("[portal.audit] no se pudo guardar auditoría", error);
  }
}

export async function auditPortalView(input: {
  clientId: string;
  view: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const metadata: Prisma.InputJsonObject = {
    view: input.view,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null
  };
  await safeCreatePortalAuditLog({
    clientId: input.clientId,
    action: "PORTAL_VIEWED",
    metadata
  });
}
