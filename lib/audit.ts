import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import type { SessionUser } from "./auth";

export type AuditParams = {
  action: string;
  entityType: string;
  entityId: string;
  module?: string;
  before?: any;
  after?: any;
  requestId?: string | null;
  user?: SessionUser | null;
  req?: NextRequest;
  metadata?: Record<string, any>;
};

function buildMetadata(req?: NextRequest, extra?: Record<string, any>, requestId?: string | null) {
  const base: Record<string, any> = { ...(extra || {}) };
  if (requestId) {
    base.requestId = requestId;
  }
  if (req) {
    base.ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    base.userAgent = req.headers.get("user-agent") || null;
    base.route = req.nextUrl.pathname;
    base.requestId = base.requestId || req.headers.get("x-request-id") || crypto.randomUUID();
  }
  return base;
}

export async function auditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        actorUserId: params.user?.id || null,
        actorRole: params.user?.roles?.[0] || null,
        metadata: buildMetadata(
          params.req,
          {
            ...(params.module ? { module: params.module } : {}),
            ...(params.metadata || {})
          },
          params.requestId
        ),
        before: params.before ?? null,
        after: params.after ?? null
      }
    });
  } catch (err) {
    console.error("auditLog failed", err);
  }
}

export async function auditPermissionDenied(user: SessionUser | null, req: NextRequest, entityType = "SECURITY", entityId = "n/a") {
  await auditLog({
    action: "PERMISSION_DENIED",
    entityType,
    entityId,
    user,
    req,
    metadata: { reason: "forbidden" }
  });
}
