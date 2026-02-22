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

const knownValidActorIds = new Set<string>();
const knownInvalidActorIds = new Set<string>();

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

async function actorUserExists(actorUserId: string) {
  if (knownValidActorIds.has(actorUserId)) return true;
  if (knownInvalidActorIds.has(actorUserId)) return false;

  try {
    const user = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true }
    });
    const exists = Boolean(user?.id);
    if (exists) {
      knownValidActorIds.add(actorUserId);
    } else {
      knownInvalidActorIds.add(actorUserId);
    }
    return exists;
  } catch {
    // Si no podemos verificar, degradamos a "sin actor" para evitar FK inválida.
    return false;
  }
}

export async function resolveAuditActorUserId(
  user?: SessionUser | null,
  existsResolver: (actorUserId: string) => Promise<boolean> = actorUserExists
): Promise<string | null> {
  const actorUserId = user?.id?.trim();
  if (!actorUserId) return null;
  return (await existsResolver(actorUserId)) ? actorUserId : null;
}

export async function auditLog(params: AuditParams) {
  const actorUserId = await resolveAuditActorUserId(params.user);
  const metadata = buildMetadata(
    params.req,
    {
      ...(params.module ? { module: params.module } : {}),
      ...(params.metadata || {}),
      ...(params.user?.id && !actorUserId ? { droppedActorUserId: params.user.id } : {})
    },
    params.requestId
  );

  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        actorUserId: actorUserId ?? null,
        actorRole: params.user?.roles?.[0] || null,
        metadata,
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
