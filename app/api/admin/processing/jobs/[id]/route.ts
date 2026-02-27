import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { server500 } from "@/lib/config-central";
import {
  requestCorrelationId,
  requestTenantProcessingService,
  type ProcessingJobArtifact,
  type ProcessingJobRecord
} from "@/lib/processing-service/adminProxy";
import { requireConfigCapability } from "@/lib/security/configCapabilities.server";
import { normalizeTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveParams(params: { id: string } | Promise<{ id: string }>): Promise<{ id: string }> {
  if ("then" in params) return params;
  return params;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = await requireConfigCapability(req, "CONFIG_PROCESSING_VIEW");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 45, windowMs: 60_000 });
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const resolved = await resolveParams(params);
    const jobId = String(resolved.id || "").trim();

    if (!jobId) {
      return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", error: "jobId requerido." }, { status: 422 });
    }

    const [jobResponse, artifactsResponse] = await Promise.all([
      requestTenantProcessingService({
        tenantId,
        method: "GET",
        pathname: `/jobs/${encodeURIComponent(jobId)}`,
        correlationId: requestCorrelationId(req)
      }),
      requestTenantProcessingService({
        tenantId,
        method: "GET",
        pathname: `/jobs/${encodeURIComponent(jobId)}/artifacts`,
        correlationId: requestCorrelationId(req)
      })
    ]);

    if (!jobResponse.ok) {
      if (String(jobResponse.error || "").toLowerCase().includes("not_found")) {
        return NextResponse.json({ ok: false, code: "NOT_FOUND", error: "Job no encontrado." }, { status: 404 });
      }
      return NextResponse.json(
        {
          ok: false,
          code: "PROCESSING_SERVICE_ERROR",
          error: jobResponse.error || "No se pudo consultar el job."
        },
        { status: 502 }
      );
    }

    const job = (jobResponse.data as { job?: ProcessingJobRecord }).job;
    if (!job) {
      return NextResponse.json({ ok: false, code: "NOT_FOUND", error: "Job no encontrado." }, { status: 404 });
    }

    const artifacts = artifactsResponse.ok
      ? ((artifactsResponse.data as { artifacts?: ProcessingJobArtifact[] }).artifacts || [])
      : job.artifacts || [];

    return NextResponse.json({
      ok: true,
      data: {
        ...job,
        artifacts
      }
    });
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

    const message = error instanceof Error ? error.message : "No se pudo consultar el job.";
    return server500(message);
  }
}
