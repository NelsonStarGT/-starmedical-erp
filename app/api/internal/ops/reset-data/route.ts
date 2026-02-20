import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { executeOpsDataReset, isOpsDataResetModuleTenantAware, normalizeOpsDataResetModule } from "@/lib/ops/dataReset";
import {
  isOpsResetInternalTokenValid,
  verifyOpsResetInternalSignature
} from "@/lib/ops/internalServiceAuth";
import { auditLog } from "@/lib/audit";
import { getOrCreateRequestId, readClientIp, withRequestIdHeader } from "@/lib/http/requestContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resetSchema = z.object({
  scope: z.enum(["module", "global"]),
  module: z.string().trim().optional().nullable(),
  tenantId: z.string().trim().optional().nullable(),
  requestId: z.string().trim().optional().nullable(),
  actorUserId: z.string().trim().optional().nullable(),
  actorRole: z.string().trim().optional().nullable(),
  challengeId: z.string().trim().optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable()
});

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);

  if (!isOpsResetInternalTokenValid(req.headers)) {
    return withRequestIdHeader(NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 }), requestId);
  }

  const rawBody = await req.text();
  const signature = verifyOpsResetInternalSignature({
    headers: req.headers,
    body: rawBody
  });
  if (!signature.ok) {
    return withRequestIdHeader(
      NextResponse.json({ ok: false, error: "Firma inválida", code: signature.error }, { status: 401 }),
      requestId
    );
  }

  const ip = readClientIp(req.headers) || "unknown";
  const rate = await consumePortalRateLimit(`ops:internal:data-reset:${ip}`, {
    limit: 20,
    windowMs: 60_000
  });
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

  let bodyJson: unknown = {};
  try {
    bodyJson = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return withRequestIdHeader(NextResponse.json({ ok: false, error: "json_invalid" }, { status: 400 }), requestId);
  }

  const parsed = resetSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return withRequestIdHeader(
      NextResponse.json({ ok: false, error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 }),
      requestId
    );
  }

  const payload = parsed.data;
  const normalizedModule = normalizeOpsDataResetModule(payload.module);
  if (payload.scope === "module" && !normalizedModule) {
    return withRequestIdHeader(NextResponse.json({ ok: false, error: "module_invalid" }, { status: 400 }), requestId);
  }
  const tenantId = String(payload.tenantId || "").trim() || null;
  if (payload.scope === "module" && normalizedModule && isOpsDataResetModuleTenantAware(normalizedModule) && !tenantId) {
    return withRequestIdHeader(NextResponse.json({ ok: false, error: "tenant_id_required" }, { status: 400 }), requestId);
  }

  try {
    const result = await executeOpsDataReset({
      scope: payload.scope,
      module: normalizedModule,
      tenantId
    });

    await auditLog({
      action: "OPS_DATA_RESET_INTERNAL_EXECUTED",
      entityType: "OPS",
      entityId: payload.scope === "module" ? normalizedModule || "module" : "global",
      req,
      requestId: payload.requestId || requestId,
      module: "ops",
      metadata: {
        actorUserId: payload.actorUserId || null,
        actorRole: payload.actorRole || null,
        challengeId: payload.challengeId || null,
        scope: result.scope,
        module: result.module,
        tenantId: result.tenantId,
        reason: payload.reason || null,
        summary: result.summary,
        touchedTables: result.touchedTables,
        source: "ops-agent"
      }
    });

    return withRequestIdHeader(
      NextResponse.json({
        ok: true,
        requestId,
        data: result
      }),
      requestId
    );
  } catch (error) {
    await auditLog({
      action: "OPS_DATA_RESET_INTERNAL_FAILED",
      entityType: "OPS",
      entityId: payload.scope === "module" ? normalizedModule || "module" : "global",
      req,
      requestId: payload.requestId || requestId,
      module: "ops",
      metadata: {
        actorUserId: payload.actorUserId || null,
        actorRole: payload.actorRole || null,
        challengeId: payload.challengeId || null,
        reason: payload.reason || null,
        message: error instanceof Error ? error.message : "reset_failed"
      }
    });

    return withRequestIdHeader(
      NextResponse.json(
        {
          ok: false,
          error: "No se pudo ejecutar reset"
        },
        { status: 500 }
      ),
      requestId
    );
  }
}
