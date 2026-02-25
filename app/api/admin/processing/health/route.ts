import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { server500 } from "@/lib/config-central";
import {
  requestCorrelationId,
  requestTenantProcessingService,
  type ProcessingJobRecord
} from "@/lib/processing-service/adminProxy";
import { requireConfigCapability } from "@/lib/security/configCapabilities.server";
import { normalizeTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireConfigCapability(req, "CONFIG_PROCESSING_VIEW");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 30, windowMs: 60_000 });
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const startedAt = Date.now();

    const [healthResponse, jobsResponse] = await Promise.all([
      requestTenantProcessingService({
        tenantId,
        method: "GET",
        pathname: "/health",
        correlationId: requestCorrelationId(req)
      }),
      requestTenantProcessingService({
        tenantId,
        method: "GET",
        pathname: "/jobs",
        query: { limit: 120 },
        correlationId: requestCorrelationId(req)
      })
    ]);

    const elapsedMs = Date.now() - startedAt;

    if (!healthResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          data: {
            status: "down",
            elapsedMs
          },
          error: healthResponse.error || "processing-service no responde"
        },
        { status: 503 }
      );
    }

    const jobs = jobsResponse.ok ? ((jobsResponse.data as { jobs?: ProcessingJobRecord[] }).jobs || []) : [];
    const summary = jobs.reduce(
      (acc, job) => {
        acc.total += 1;
        if (job.status === "queued") acc.queued += 1;
        if (job.status === "running") acc.running += 1;
        if (job.status === "succeeded") acc.succeeded += 1;
        if (job.status === "failed") acc.failed += 1;
        if (job.status === "canceled") acc.canceled += 1;
        return acc;
      },
      { total: 0, queued: 0, running: 0, succeeded: 0, failed: 0, canceled: 0 }
    );

    return NextResponse.json({
      ok: true,
      data: {
        status: "up",
        elapsedMs,
        summary,
        data: healthResponse.data
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

    const message = error instanceof Error ? error.message : "No se pudo consultar health.";
    return server500(message);
  }
}
