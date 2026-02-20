import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { canAccessOpsHealth, canExecuteOpsCritical } from "@/lib/ops/rbac";
import { readOpsMetricsHistory } from "@/lib/ops/store";
import { getOrCreateRequestId, readClientIp, withRequestIdHeader } from "@/lib/http/requestContext";
import type { OpsMetricsServiceStatus } from "@/lib/ops/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseStatus(value: string | null): OpsMetricsServiceStatus | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "down") return "down";
  if (normalized === "up") return "up";
  return null;
}

function parseRangeWindow(value: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "7d") return 7 * 24 * 60 * 60 * 1000;
  if (normalized === "30d") return 30 * 24 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function resolveTenantId(input: {
  requestedTenantId: string | null;
  userTenantId?: string | null;
  isSuperAdmin: boolean;
}) {
  const requested = String(input.requestedTenantId || "").trim();
  if (requested && input.isSuperAdmin) return requested;
  return String(input.userTenantId || process.env.TENANT_ID || "local").trim() || "local";
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const auth = requireAuth(req);
  if (auth.errorResponse) return withRequestIdHeader(auth.errorResponse, requestId);
  const user = auth.user;

  if (!canAccessOpsHealth(user)) {
    await auditLog({
      action: "OPS_METRICS_HISTORY_FORBIDDEN",
      entityType: "OPS",
      entityId: "metrics_history",
      user,
      req,
      requestId,
      module: "ops",
      metadata: { reason: "role_forbidden" }
    });

    return withRequestIdHeader(NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }), requestId);
  }

  const ip = readClientIp(req.headers) || user?.id || "unknown";
  const rate = await consumePortalRateLimit(`ops:admin:metrics:history:${ip}`, { limit: 80, windowMs: 60_000 });
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

  const isSuperAdmin = canExecuteOpsCritical(user);
  const requestedTenantId = req.nextUrl.searchParams.get("tenantId");
  const tenantId = resolveTenantId({
    requestedTenantId,
    userTenantId: user.tenantId || null,
    isSuperAdmin
  });

  const serviceKey = String(req.nextUrl.searchParams.get("service") || "").trim() || null;
  const serviceStatus = parseStatus(req.nextUrl.searchParams.get("status"));
  const range = req.nextUrl.searchParams.get("sample") as "5m" | "15m" | "1h" | null;
  const source = String(req.nextUrl.searchParams.get("source") || "").trim() || null;

  const explicitFrom = parseDate(req.nextUrl.searchParams.get("from"));
  const explicitTo = parseDate(req.nextUrl.searchParams.get("to"));
  const windowMs = parseRangeWindow(req.nextUrl.searchParams.get("range"));
  const to = explicitTo || new Date();
  const from = explicitFrom || new Date(to.getTime() - windowMs);
  const limit = Number(req.nextUrl.searchParams.get("limit") || 160);

  const rows = await readOpsMetricsHistory({
    tenantId,
    serviceKey,
    serviceStatus,
    range,
    source,
    from,
    to,
    limit
  });

  await auditLog({
    action: "OPS_METRICS_HISTORY_VIEW",
    entityType: "OPS",
    entityId: "metrics_history",
    user,
    req,
    requestId,
    module: "ops",
    metadata: {
      tenantId,
      serviceKey,
      serviceStatus,
      range,
      source,
      from: from.toISOString(),
      to: to.toISOString(),
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
