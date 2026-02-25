import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canAccessOpsHealth, canExecuteOpsCritical } from "@/lib/ops/rbac";
import { collectOpsMetricsSnapshot } from "@/lib/ops/metricsAggregator";
import { storeOpsMetricsSnapshot } from "@/lib/ops/store";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { getOrCreateRequestId, readClientIp, withRequestIdHeader } from "@/lib/http/requestContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shouldPersistSnapshot(value: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function resolveTenantId(input: { requestedTenantId: string | null; userTenantId?: string | null; isSuperAdmin: boolean }) {
  const requested = String(input.requestedTenantId || "").trim();
  if (requested && input.isSuperAdmin) return requested;
  return String(input.userTenantId || process.env.TENANT_ID || "local").trim() || "local";
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const auth = requireAuth(req);
  if (auth.errorResponse) return withRequestIdHeader(auth.errorResponse, requestId);

  if (!canAccessOpsHealth(auth.user)) {
    return withRequestIdHeader(NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }), requestId);
  }

  const ip = readClientIp(req.headers) || auth.user?.id || "unknown";
  const rate = await consumePortalRateLimit(`ops:admin:metrics:current:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return withRequestIdHeader(
      NextResponse.json({ ok: false, error: "Rate limit", retryAfterSeconds: rate.retryAfterSeconds }, { status: 429 }),
      requestId
    );
  }

  const isSuperAdmin = canExecuteOpsCritical(auth.user);
  const tenantId = resolveTenantId({
    requestedTenantId: req.nextUrl.searchParams.get("tenantId"),
    userTenantId: auth.user.tenantId || null,
    isSuperAdmin
  });
  const range = req.nextUrl.searchParams.get("range");

  const snapshot = await collectOpsMetricsSnapshot({ range, tenantId });
  if (shouldPersistSnapshot(req.nextUrl.searchParams.get("persist"))) {
    const source = String(req.nextUrl.searchParams.get("source") || "admin_manual").trim().slice(0, 64) || "admin_manual";
    await storeOpsMetricsSnapshot({
      snapshot,
      source,
      requestId,
      tenantId,
      actor: auth.user,
      actorRole: canExecuteOpsCritical(auth.user) ? "SUPER_ADMIN" : "OPS"
    });
  }

  return withRequestIdHeader(
    NextResponse.json({
      ok: true,
      requestId,
      data: snapshot
    }),
    requestId
  );
}
