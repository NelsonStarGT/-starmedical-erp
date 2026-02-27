import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import type { SessionUser } from "@/lib/auth";
import { getSessionUserFromCookies, requireAuth } from "@/lib/auth";
import { getEffectiveScope } from "@/lib/branch/effectiveScope";
import { recordSystemEvent } from "@/lib/ops/eventLog.server";
import { tenantIdFromUser } from "@/lib/tenant";

type CookieStoreLike = {
  get(name: string): { value?: string | null } | undefined;
};

export type TenantContext = {
  user: SessionUser;
  tenantId: string;
  activeBranchId: string | null;
  allowedBranchIds: string[];
  canAccessAllBranches: boolean;
  permissions: string[];
};

function clean(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : null;
}

function unique(values: Array<string | null | undefined>) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = clean(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export async function resolveTenantContextForUser(
  user: SessionUser,
  options?: {
    cookieStore?: CookieStoreLike;
    requestedBranchId?: string | null;
  }
): Promise<TenantContext> {
  const scope = await getEffectiveScope({
    user,
    ...(options?.cookieStore ? { cookieStore: options.cookieStore } : {}),
    ...(clean(options?.requestedBranchId) ? { requestedBranchId: clean(options?.requestedBranchId) } : {})
  });

  return {
    user,
    tenantId: tenantIdFromUser(user),
    activeBranchId: scope.branchId,
    allowedBranchIds: unique(scope.allowedBranchIds),
    canAccessAllBranches: scope.canSwitch || scope.accessMode === "SWITCH",
    permissions: unique(user.permissions ?? [])
  };
}

export async function requireTenantContextFromRequest(
  req: NextRequest,
  options?: {
    requestedBranchId?: string | null;
  }
): Promise<{ context: TenantContext | null; errorResponse: NextResponse | null }> {
  const auth = requireAuth(req);
  if (auth.errorResponse || !auth.user) {
    return { context: null, errorResponse: auth.errorResponse };
  }

  const context = await resolveTenantContextForUser(auth.user, {
    cookieStore: req.cookies as unknown as CookieStoreLike,
    requestedBranchId: options?.requestedBranchId ?? null
  });

  return { context, errorResponse: null };
}

export async function requireTenantContextFromCookies(options?: {
  requestedBranchId?: string | null;
}): Promise<TenantContext> {
  const cookieStore = await nextCookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) {
    throw new Error("No autenticado.");
  }

  return resolveTenantContextForUser(user, {
    cookieStore: cookieStore as unknown as CookieStoreLike,
    requestedBranchId: options?.requestedBranchId ?? null
  });
}

export function assertBranchAccess(context: TenantContext, branchId?: string | null) {
  const normalized = clean(branchId);
  if (!normalized) return false;
  return context.allowedBranchIds.includes(normalized);
}

export async function recordTenantIsolationBlocked(input: {
  tenantId: string;
  userId?: string | null;
  route: string;
  resourceType: string;
  resourceId?: string | null;
  reason?: string | null;
}) {
  await recordSystemEvent({
    tenantId: input.tenantId,
    domain: "security",
    eventType: "TENANT_ISOLATION_BLOCKED",
    severity: "WARN",
    resource: input.route,
    messageShort: "Acceso bloqueado por aislamiento de tenant.",
    digestKey: `tenant-isolation:${input.tenantId}:${input.route}:${input.resourceType}:${input.resourceId ?? "n/a"}`,
    metaJson: {
      route: input.route,
      resourceType: input.resourceType,
      resourceId: clean(input.resourceId) ?? null,
      reason: clean(input.reason) ?? null,
      actorUserId: clean(input.userId) ?? null
    }
  });
}
