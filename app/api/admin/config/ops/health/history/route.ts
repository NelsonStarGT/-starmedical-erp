import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { canAccessOpsHealth, canExecuteOpsCritical } from "@/lib/ops/rbac";
import { readOpsHealthHistory } from "@/lib/ops/store";
import type { OpsHealthServiceStatus } from "@/lib/ops/types";
import { getOrCreateRequestId, readClientIp, withRequestIdHeader } from "@/lib/http/requestContext";
import { auditLog } from "@/lib/audit";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseStatus(value: string | null): OpsHealthServiceStatus | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "up") return "up";
  if (normalized === "down") return "down";
  if (normalized === "degraded") return "degraded";
  if (normalized === "optional_down") return "optional_down";
  return null;
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const auth = await requireAuthenticatedUser(req);
  if (auth.errorResponse) return withRequestIdHeader(auth.errorResponse, requestId);
  if (!canAccessOpsHealth(auth.user)) {
    await auditLog({
      action: "OPS_HEALTH_FORBIDDEN",
      entityType: "OPS",
      entityId: "health_history",
      user: auth.user,
      req,
      requestId,
      module: "ops",
      metadata: { reason: "role_forbidden" }
    });
    return withRequestIdHeader(NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }), requestId);
  }

  const ip = readClientIp(req.headers) || auth.user?.id || "unknown";
  const rate = await consumePortalRateLimit(`ops:admin:history:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return withRequestIdHeader(
      NextResponse.json(
        {
          ok: false,
          error: "Rate limit",
          retryAfterSeconds: rate.retryAfterSeconds
        },
        { status: 429 }
      ),
      requestId
    );
  }

  const serviceKey = String(req.nextUrl.searchParams.get("service") || "").trim() || null;
  const status = parseStatus(req.nextUrl.searchParams.get("status"));
  const requestedTenantId = String(req.nextUrl.searchParams.get("tenantId") || "").trim() || null;
  const tenantId = canExecuteOpsCritical(auth.user)
    ? requestedTenantId || auth.user?.tenantId || process.env.TENANT_ID || "local"
    : auth.user?.tenantId || process.env.TENANT_ID || "local";
  const from = parseDate(req.nextUrl.searchParams.get("from"));
  const to = parseDate(req.nextUrl.searchParams.get("to"));
  const limit = Number(req.nextUrl.searchParams.get("limit") || 80);

  const rows = await readOpsHealthHistory({
    serviceKey,
    serviceStatus: status,
    tenantId,
    from,
    to,
    limit
  });

  await auditLog({
    action: "OPS_HEALTH_HISTORY_VIEW",
    entityType: "OPS",
    entityId: "health_history",
    user: auth.user,
    req,
    requestId,
    module: "ops",
    metadata: {
      serviceKey,
      status,
      tenantId,
      from: from?.toISOString() || null,
      to: to?.toISOString() || null,
      returnedRows: rows.length
    }
  });

  return withRequestIdHeader(
    NextResponse.json({
      ok: true,
      requestId,
      data: {
        total: rows.length,
        items: rows
      }
    }),
    requestId
  );
}
