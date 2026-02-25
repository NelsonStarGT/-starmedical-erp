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

type ArtifactRow = ProcessingJobArtifact & {
  jobId: string;
  tenantId: string;
  actorId: string;
  jobType: string;
  status: string;
  createdAt: string;
  finishedAt?: string | null;
};

function parseIntSafe(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export async function GET(req: NextRequest) {
  const auth = requireConfigCapability(req, "CONFIG_PROCESSING_VIEW");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 40, windowMs: 60_000 });
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const url = req.nextUrl;

    const page = parseIntSafe(url.searchParams.get("page"), 1, 1, 1000);
    const limit = parseIntSafe(url.searchParams.get("limit"), 30, 1, 100);
    const q = String(url.searchParams.get("q") || "").trim().toLowerCase();

    const jobsResponse = await requestTenantProcessingService({
      tenantId,
      method: "GET",
      pathname: "/jobs",
      query: {
        limit: 200,
        ...(url.searchParams.get("jobType") ? { jobType: url.searchParams.get("jobType") } : {}),
        ...(url.searchParams.get("status") ? { status: url.searchParams.get("status") } : {}),
        ...(url.searchParams.get("from") ? { from: url.searchParams.get("from") } : {}),
        ...(url.searchParams.get("to") ? { to: url.searchParams.get("to") } : {})
      },
      correlationId: requestCorrelationId(req)
    });

    if (!jobsResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "PROCESSING_SERVICE_ERROR",
          error: jobsResponse.error || "No se pudieron listar artefactos."
        },
        { status: 502 }
      );
    }

    const jobs = ((jobsResponse.data as { jobs?: ProcessingJobRecord[] }).jobs || []).filter(Boolean);

    const allArtifacts: ArtifactRow[] = jobs.flatMap((job) =>
      (Array.isArray(job.artifacts) ? job.artifacts : []).map((artifact) => ({
        ...artifact,
        jobId: job.jobId,
        tenantId: job.tenantId,
        actorId: job.actorId,
        jobType: job.jobType,
        status: job.status,
        createdAt: job.createdAt,
        finishedAt: job.finishedAt || null
      }))
    );

    const filtered = q
      ? allArtifacts.filter((row) => {
          const key = String(row.key || "").toLowerCase();
          const id = String(row.jobId || "").toLowerCase();
          return key.includes(q) || id.includes(q);
        })
      : allArtifacts;

    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);
    const total = filtered.length;
    const hasNextPage = start + limit < total;

    return NextResponse.json({
      ok: true,
      data: {
        items,
        page,
        pageSize: limit,
        total,
        artifacts: items,
        pagination: {
          page,
          limit,
          total,
          hasNextPage
        }
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

    const message = error instanceof Error ? error.message : "No se pudieron listar artefactos.";
    return server500(message);
  }
}
