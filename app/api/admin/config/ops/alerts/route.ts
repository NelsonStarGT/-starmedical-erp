import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { canAccessOpsHealth, canExecuteOpsCritical } from "@/lib/ops/rbac";
import { readOpsAlertEvents } from "@/lib/ops/store";
import { getOrCreateRequestId, readClientIp, withRequestIdHeader } from "@/lib/http/requestContext";
import type { OpsAlertLevel, OpsAlertType } from "@/lib/ops/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseLevel(value: string | null): OpsAlertLevel | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "info") return "info";
  if (normalized === "warning") return "warning";
  if (normalized === "critical") return "critical";
  return null;
}

function parseType(value: string | null): OpsAlertType | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "health_transition") return "health_transition";
  if (normalized === "metrics_threshold") return "metrics_threshold";
  if (normalized === "service_down") return "service_down";
  if (normalized === "recovery") return "recovery";
  return null;
}

function parseRangeWindow(value: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "24h") return 24 * 60 * 60 * 1000;
  if (normalized === "30d") return 30 * 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
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
  const auth = await requireAuthenticatedUser(req);
  if (auth.errorResponse) return withRequestIdHeader(auth.errorResponse, requestId);
  const user = auth.user;

  if (!canAccessOpsHealth(user)) {
    await auditLog({
      action: "OPS_ALERTS_FORBIDDEN",
      entityType: "OPS",
      entityId: "alerts",
      user,
      req,
      requestId,
      module: "ops",
      metadata: { reason: "role_forbidden" }
    });

    return withRequestIdHeader(NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }), requestId);
  }

  const ip = readClientIp(req.headers) || user?.id || "unknown";
  const rate = await consumePortalRateLimit(`ops:admin:alerts:${ip}`, { limit: 80, windowMs: 60_000 });
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
  const tenantId = resolveTenantId({
    requestedTenantId: req.nextUrl.searchParams.get("tenantId"),
    userTenantId: user.tenantId || null,
    isSuperAdmin
  });

  const serviceKey = String(req.nextUrl.searchParams.get("service") || "").trim() || null;
  const type = parseType(req.nextUrl.searchParams.get("type"));
  const level = parseLevel(req.nextUrl.searchParams.get("level"));
  const explicitFrom = parseDate(req.nextUrl.searchParams.get("from"));
  const explicitTo = parseDate(req.nextUrl.searchParams.get("to"));
  const to = explicitTo || new Date();
  const from = explicitFrom || new Date(to.getTime() - parseRangeWindow(req.nextUrl.searchParams.get("range")));
  const limit = Number(req.nextUrl.searchParams.get("limit") || 160);

  const rows = await readOpsAlertEvents({
    tenantId,
    serviceKey,
    type,
    level,
    from,
    to,
    limit
  });

  await auditLog({
    action: "OPS_ALERTS_VIEW",
    entityType: "OPS",
    entityId: "alerts",
    user,
    req,
    requestId,
    module: "ops",
    metadata: {
      tenantId,
      serviceKey,
      type,
      level,
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
