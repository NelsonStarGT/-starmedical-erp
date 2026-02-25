import type { NextRequest } from "next/server";
import { getProcessingServiceConfig } from "@/lib/config-central/processing-service";
import { requestProcessingService } from "@/lib/processing-service/client";
import { normalizeTenantId } from "@/lib/tenant";

export type ProcessingJobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export type ProcessingJobType =
  | "excel_export"
  | "excel_import"
  | "docx_render"
  | "pdf_render"
  | "image_transform"
  | "google_sheets_export"
  | "drive_upload";

export type ProcessingJobArtifact = {
  key: string;
  provider: string;
  mime?: string | null;
  size?: number | null;
  checksum?: string | null;
  signedUrl?: string | null;
};

export type ProcessingJobRecord = {
  jobId: string;
  tenantId: string;
  actorId: string;
  jobType: ProcessingJobType;
  status: ProcessingJobStatus;
  params?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  callback?: { url: string } | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  artifacts: ProcessingJobArtifact[];
  result?: Record<string, unknown> | null;
  error?: { message?: string } | null;
};

export function buildTenantScopedPath(pathname: string, tenantIdInput: unknown, query?: Record<string, string | number | null | undefined>) {
  const tenantId = normalizeTenantId(tenantIdInput);
  const params = new URLSearchParams();
  params.set("tenantId", tenantId);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || typeof value === "undefined") continue;
      const rendered = String(value).trim();
      if (!rendered) continue;
      params.set(key, rendered);
    }
  }
  const suffix = params.toString();
  return `${pathname}${suffix ? `?${suffix}` : ""}`;
}

export async function requestTenantProcessingService(input: {
  tenantId: unknown;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  pathname: string;
  query?: Record<string, string | number | null | undefined>;
  body?: Record<string, unknown> | null;
  correlationId?: string;
}) {
  const tenantId = normalizeTenantId(input.tenantId);
  const config = await getProcessingServiceConfig(tenantId);
  const path = buildTenantScopedPath(input.pathname, tenantId, input.query);

  return requestProcessingService(
    {
      baseUrl: config.baseUrl,
      authMode: config.authMode,
      tokenRef: config.tokenRef,
      hmacSecretRef: config.hmacSecretRef,
      timeoutMs: config.timeoutMs,
      retryCount: config.retryCount
    },
    {
      method: input.method,
      path,
      body: input.body,
      correlationId: input.correlationId
    }
  );
}

export function requestCorrelationId(req: NextRequest) {
  return req.headers.get("x-request-id") || undefined;
}
