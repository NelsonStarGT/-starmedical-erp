import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { canAccessOpsHealth, canExecuteOpsCritical } from "@/lib/ops/rbac";
import { runOpsSchedulerNow } from "@/lib/ops/scheduler";
import { getOrCreateRequestId, readClientIp, withRequestIdHeader } from "@/lib/http/requestContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  tenantId: z.string().trim().optional().nullable(),
  force: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const auth = requireAuth(req);
  if (auth.errorResponse) return withRequestIdHeader(auth.errorResponse, requestId);
  const user = auth.user;

  if (!canAccessOpsHealth(user)) {
    await auditLog({
      action: "OPS_SCHEDULER_RUN_NOW_FORBIDDEN",
      entityType: "OPS",
      entityId: "scheduler_run_now",
      user,
      req,
      requestId,
      module: "ops",
      metadata: { reason: "role_forbidden" }
    });

    return withRequestIdHeader(NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }), requestId);
  }

  const ip = readClientIp(req.headers) || user?.id || "unknown";
  const rate = await consumePortalRateLimit(`ops:admin:scheduler:run-now:${ip}`, { limit: 15, windowMs: 60_000 });
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

  const parsed = payloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return withRequestIdHeader(
      NextResponse.json(
        {
          ok: false,
          error: "Payload inválido",
          details: parsed.error.flatten()
        },
        { status: 400 }
      ),
      requestId
    );
  }

  const isSuperAdmin = canExecuteOpsCritical(user);
  const requestedTenant = String(parsed.data.tenantId || "").trim();
  const tenantId = isSuperAdmin ? requestedTenant || null : user.tenantId || process.env.TENANT_ID || "local";

  const result = await runOpsSchedulerNow({
    tenantId,
    requestedBy: user,
    force: parsed.data.force ?? true
  });

  await auditLog({
    action: "OPS_SCHEDULER_RUN_NOW",
    entityType: "OPS",
    entityId: "scheduler_run_now",
    user,
    req,
    requestId,
    module: "ops",
    metadata: {
      tenantId,
      force: parsed.data.force ?? true,
      total: result.total,
      executed: result.executed,
      skipped: result.skipped,
      failed: result.failed
    }
  });

  return withRequestIdHeader(
    NextResponse.json({
      ok: result.ok,
      requestId,
      data: result
    }),
    requestId
  );
}
