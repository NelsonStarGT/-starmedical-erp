import crypto from "node:crypto";

type ProcessingServiceAuthMode = "TOKEN" | "HMAC" | "TOKEN_HMAC";

type ProcessingServiceRuntimeConfig = {
  baseUrl: string;
  authMode: ProcessingServiceAuthMode;
  token: string | null;
  hmacSecret: string | null;
  timeoutMs: number;
  retryCount: number;
};

type ActorContext = {
  tenantId?: string | null;
  actorId?: string | null;
};

type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

type JobArtifact = {
  key: string;
  provider: string;
  mime?: string | null;
  size?: number | null;
  checksum?: string | null;
  signedUrl?: string | null;
};

type ProcessingJob = {
  jobId: string;
  status: JobStatus;
  artifacts: JobArtifact[];
  result?: unknown;
  error?: { message?: string };
};

type ExcelSheetPayload = {
  name: string;
  headers: string[];
  rows: Array<Array<string | number | boolean | null>>;
};

type ExcelLimits = {
  maxFileMb?: number;
  maxRows?: number;
  maxCols?: number;
  timeoutMs?: number;
};

type WaitOptions = {
  timeoutMs?: number;
  pollEveryMs?: number;
};

function normalizeTenantId(value: unknown): string {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : "global";
}

function resolveAuthMode(raw: string | undefined): ProcessingServiceAuthMode {
  const mode = String(raw || "TOKEN_HMAC").trim().toUpperCase();
  if (mode === "TOKEN") return "TOKEN";
  if (mode === "HMAC") return "HMAC";
  return "TOKEN_HMAC";
}

function resolveProcessingConfig(): ProcessingServiceRuntimeConfig {
  return {
    baseUrl: (process.env.PROCESSING_SERVICE_BASE_URL || "http://127.0.0.1:4300").replace(/\/+$/, ""),
    authMode: resolveAuthMode(process.env.PROCESSING_SERVICE_AUTH_MODE),
    token: process.env.PROCESSING_SERVICE_TOKEN?.trim() || null,
    hmacSecret: process.env.PROCESSING_HMAC_SECRET?.trim() || null,
    timeoutMs: Math.max(1000, Number(process.env.PROCESSING_SERVICE_TIMEOUT_MS || 12000) || 12000),
    retryCount: Math.max(0, Number(process.env.PROCESSING_SERVICE_RETRY_COUNT || 2) || 2)
  };
}

function createHmacSignature(secret: string, bodyRaw: string, timestamp: string, nonce: string) {
  const payload = `${timestamp}.${nonce}.${bodyRaw}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function requestProcessingService(
  config: ProcessingServiceRuntimeConfig,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    body?: Record<string, unknown> | null;
  }
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const method = options.method || "GET";
  const bodyRaw = options.body ? JSON.stringify(options.body) : "";
  const url = `${config.baseUrl}${options.path.startsWith("/") ? options.path : `/${options.path}`}`;

  let lastError: string | null = null;

  for (let attempt = 0; attempt <= config.retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), config.timeoutMs);

    try {
      const headers = new Headers();
      headers.set("content-type", "application/json");

      if ((config.authMode === "TOKEN" || config.authMode === "TOKEN_HMAC") && config.token) {
        headers.set("authorization", `Bearer ${config.token}`);
      }

      if ((config.authMode === "HMAC" || config.authMode === "TOKEN_HMAC") && config.hmacSecret) {
        const timestamp = String(Date.now());
        const nonce = crypto.randomBytes(16).toString("hex");
        const signature = createHmacSignature(config.hmacSecret, bodyRaw, timestamp, nonce);
        headers.set("x-timestamp", timestamp);
        headers.set("x-nonce", nonce);
        headers.set("x-signature", signature);
      }

      const response = await fetch(url, {
        method,
        headers,
        body: bodyRaw || undefined,
        cache: "no-store",
        signal: controller.signal
      });
      clearTimeout(timeout);

      const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        lastError =
          typeof json.error === "string" && json.error.trim().length > 0
            ? json.error
            : `processing_service_status_${response.status}`;
      } else {
        return { ok: true, data: json };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < config.retryCount) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  return { ok: false, error: lastError || "processing_service_request_failed" };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enqueueJob(input: {
  context?: ActorContext;
  jobType: "excel_export" | "excel_import";
  params: Record<string, unknown>;
  limits?: ExcelLimits;
}) {
  const tenantId = normalizeTenantId(input.context?.tenantId);
  const actorId = String(input.context?.actorId || "system");
  const runtimeConfig = resolveProcessingConfig();
  const jobId = crypto.randomUUID();

  const created = await requestProcessingService(runtimeConfig, {
    method: "POST",
    path: "/jobs",
    body: {
      jobId,
      tenantId,
      actorId,
      jobType: input.jobType,
      params: input.params,
      limits: input.limits
    }
  });

  if (!created.ok) {
    throw new Error(created.error || "processing_service_enqueue_failed");
  }

  return { jobId, runtimeConfig };
}

async function getJob(runtimeConfig: ProcessingServiceRuntimeConfig, jobId: string): Promise<ProcessingJob> {
  const response = await requestProcessingService(runtimeConfig, {
    method: "GET",
    path: `/jobs/${encodeURIComponent(jobId)}`
  });

  if (!response.ok) {
    throw new Error(response.error || "processing_service_job_status_failed");
  }

  const job = (response.data as { job?: ProcessingJob }).job;
  if (!job) {
    throw new Error("processing_service_job_not_found");
  }
  return job;
}

async function waitJob(runtimeConfig: ProcessingServiceRuntimeConfig, jobId: string, options?: WaitOptions) {
  const pollEveryMs = Math.max(150, Number(options?.pollEveryMs || 300));
  const timeoutMs = Math.max(2_000, Number(options?.timeoutMs || 20_000));
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await getJob(runtimeConfig, jobId);
    if (job.status === "succeeded") return job;
    if (job.status === "failed" || job.status === "canceled") {
      throw new Error(job.error?.message || `processing_service_job_${job.status}`);
    }
    await sleep(pollEveryMs);
  }

  throw new Error("processing_service_job_timeout");
}

async function getArtifacts(runtimeConfig: ProcessingServiceRuntimeConfig, jobId: string): Promise<JobArtifact[]> {
  const response = await requestProcessingService(runtimeConfig, {
    method: "GET",
    path: `/jobs/${encodeURIComponent(jobId)}/artifacts`
  });

  if (!response.ok) {
    throw new Error(response.error || "processing_service_artifacts_failed");
  }

  const artifacts = (response.data as { artifacts?: JobArtifact[] }).artifacts;
  return Array.isArray(artifacts) ? artifacts : [];
}

async function fetchArtifactBuffer(artifact: JobArtifact): Promise<Buffer> {
  if (!artifact.signedUrl) {
    throw new Error("processing_service_artifact_missing_signed_url");
  }

  const response = await fetch(artifact.signedUrl, {
    method: "GET",
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`processing_service_artifact_download_failed_${response.status}`);
  }
  const body = await response.arrayBuffer();
  return Buffer.from(body);
}

export async function exportExcelViaProcessingService(input: {
  context?: ActorContext;
  fileName: string;
  sheets: ExcelSheetPayload[];
  limits?: ExcelLimits;
  wait?: WaitOptions;
}) {
  const { jobId, runtimeConfig } = await enqueueJob({
    context: input.context,
    jobType: "excel_export",
    params: {
      fileName: input.fileName,
      sheets: input.sheets
    },
    limits: input.limits
  });

  await waitJob(runtimeConfig, jobId, input.wait);
  const artifacts = await getArtifacts(runtimeConfig, jobId);
  const artifact =
    artifacts.find((item) => item.mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") || artifacts[0];

  if (!artifact) {
    throw new Error("processing_service_export_artifact_not_found");
  }

  return {
    jobId,
    artifact,
    buffer: await fetchArtifactBuffer(artifact)
  };
}

export async function importExcelViaProcessingService(input: {
  context?: ActorContext;
  fileBuffer: Buffer;
  template?: string;
  limits?: ExcelLimits;
  wait?: WaitOptions;
}) {
  const { jobId, runtimeConfig } = await enqueueJob({
    context: input.context,
    jobType: "excel_import",
    params: {
      template: input.template || "generic",
      inputBase64: input.fileBuffer.toString("base64")
    },
    limits: input.limits
  });

  const job = await waitJob(runtimeConfig, jobId, input.wait);
  const artifacts = await getArtifacts(runtimeConfig, jobId);
  const jsonArtifact =
    artifacts.find(
      (item) =>
        item.mime === "application/json" &&
        !String(item.key || "").endsWith("/logs/manifest.json") &&
        (String(item.key || "").includes("/output/") || /rows\.json$|result\.json$/i.test(String(item.key || "")))
    ) || artifacts.find((item) => item.mime === "application/json" && !String(item.key || "").endsWith("/logs/manifest.json"));
  let artifactJson: unknown = null;

  if (jsonArtifact) {
    const raw = await fetchArtifactBuffer(jsonArtifact);
    artifactJson = JSON.parse(raw.toString("utf8"));
  }

  return {
    jobId,
    job,
    artifactJson
  };
}
