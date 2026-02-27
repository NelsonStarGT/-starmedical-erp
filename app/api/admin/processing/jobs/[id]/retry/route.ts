import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { server500 } from "@/lib/config-central";
import { requestCorrelationId, requestTenantProcessingService } from "@/lib/processing-service/adminProxy";
import { requireConfigCapability } from "@/lib/security/configCapabilities.server";
import { normalizeTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveParams(params: { id: string } | Promise<{ id: string }>): Promise<{ id: string }> {
  if ("then" in params) return params;
  return params;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = await requireConfigCapability(req, "CONFIG_PROCESSING_WRITE");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 20, windowMs: 60_000 });
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const resolved = await resolveParams(params);
    const jobId = String(resolved.id || "").trim();

    if (!jobId) {
      return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", error: "jobId requerido." }, { status: 422 });
    }

    const response = await requestTenantProcessingService({
      tenantId,
      method: "POST",
      pathname: `/jobs/${encodeURIComponent(jobId)}/retry`,
      body: {},
      correlationId: requestCorrelationId(req)
    });

    if (!response.ok) {
      const msg = String(response.error || "").toLowerCase();
      if (msg.includes("not_found")) {
        return NextResponse.json({ ok: false, code: "NOT_FOUND", error: "Job no encontrado." }, { status: 404 });
      }
      if (msg.includes("cannot_retry") || msg.includes("conflict")) {
        return NextResponse.json({ ok: false, code: "CONFLICT", error: "El job no puede reintentarse." }, { status: 409 });
      }
      return NextResponse.json(
        {
          ok: false,
          code: "PROCESSING_SERVICE_ERROR",
          error: response.error || "No se pudo reintentar el job."
        },
        { status: 502 }
      );
    }

    const data = response.data;

    await auditLog({
      action: "PROCESSING_JOB_RETRY_REQUESTED",
      entityType: "ProcessingJob",
      entityId: jobId,
      tenantId,
      user: auth.user,
      req,
      after: data
    });

    return NextResponse.json({ ok: true, data }, { status: 202 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: unknown }).status === 429
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMIT",
          error: "Demasiadas solicitudes. Espera un momento para reintentar."
        },
        { status: 429 }
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo reintentar el job.";
    return server500(message);
  }
}
