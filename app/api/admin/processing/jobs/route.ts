import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { server500 } from "@/lib/config-central";
import {
  requestCorrelationId,
  requestTenantProcessingService,
  type ProcessingJobRecord,
  type ProcessingJobStatus,
  type ProcessingJobType
} from "@/lib/processing-service/adminProxy";
import { requireConfigCapability } from "@/lib/security/configCapabilities.server";
import { normalizeTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOB_STATUSES = new Set<ProcessingJobStatus>(["queued", "running", "succeeded", "failed", "canceled"]);
const JOB_TYPES = new Set<ProcessingJobType>([
  "excel_export",
  "excel_import",
  "docx_render",
  "pdf_render",
  "image_transform",
  "google_sheets_export",
  "drive_upload"
]);

function parseIntSafe(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export async function GET(req: NextRequest) {
  const auth = await requireConfigCapability(req, "CONFIG_PROCESSING_VIEW");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 40, windowMs: 60_000 });
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const url = req.nextUrl;

    const limit = parseIntSafe(url.searchParams.get("limit"), 25, 1, 100);
    const page = parseIntSafe(url.searchParams.get("page"), 1, 1, 1000);
    const status = url.searchParams.get("status");
    const jobType = url.searchParams.get("jobType");
    const createdBy = url.searchParams.get("createdBy");
    const text = url.searchParams.get("q");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const response = await requestTenantProcessingService({
      tenantId,
      method: "GET",
      pathname: "/jobs",
      query: {
        limit: Math.max(limit * 4, 100),
        ...(status && JOB_STATUSES.has(status as ProcessingJobStatus) ? { status } : {}),
        ...(jobType && JOB_TYPES.has(jobType as ProcessingJobType) ? { jobType } : {}),
        ...(createdBy ? { actorId: createdBy } : {}),
        ...(text ? { q: text } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {})
      },
      correlationId: requestCorrelationId(req)
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "PROCESSING_SERVICE_ERROR",
          error: response.error || "No se pudo listar jobs."
        },
        { status: 502 }
      );
    }

    const jobsRaw = (response.data as { jobs?: ProcessingJobRecord[] }).jobs;
    const jobs = Array.isArray(jobsRaw) ? jobsRaw : [];
    const start = (page - 1) * limit;
    const items = jobs.slice(start, start + limit);
    const total = jobs.length;
    const hasNextPage = start + limit < total;

    return NextResponse.json({
      ok: true,
      data: {
        items,
        page,
        pageSize: limit,
        total,
        jobs: items,
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

    const message = error instanceof Error ? error.message : "No se pudo listar jobs.";
    return server500(message);
  }
}
