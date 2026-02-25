import crypto from "node:crypto";

export type ProcessingServiceAuthMode = "TOKEN" | "HMAC" | "TOKEN_HMAC";

export type ProcessingServiceRuntimeConfig = {
  baseUrl: string;
  authMode: ProcessingServiceAuthMode;
  tokenRef: string | null;
  hmacSecretRef: string | null;
  timeoutMs: number;
  retryCount: number;
};

export type ProcessingServiceRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: Record<string, unknown> | null;
  correlationId?: string;
};

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveSecretRef(ref: string | null | undefined) {
  const clean = String(ref || "").trim();
  if (!clean) return null;

  if (clean.startsWith("env:")) {
    const envKey = clean.slice(4).trim();
    if (!envKey) return null;
    const resolved = process.env[envKey];
    return resolved?.trim() || null;
  }

  const byName = process.env[clean];
  if (byName?.trim()) return byName.trim();

  return clean;
}

function createHmacSignature(secret: string, body: string, timestamp: string, nonce: string) {
  const data = `${timestamp}.${nonce}.${body}`;
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

function buildHeaders(config: ProcessingServiceRuntimeConfig, bodyRaw: string, correlationId: string) {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  headers.set("x-correlation-id", correlationId);

  const token = resolveSecretRef(config.tokenRef);
  const hmacSecret = resolveSecretRef(config.hmacSecretRef);
  const requiresToken = config.authMode === "TOKEN" || config.authMode === "TOKEN_HMAC";
  const requiresHmac = config.authMode === "HMAC" || config.authMode === "TOKEN_HMAC";

  if (requiresToken && token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  if (requiresHmac && hmacSecret) {
    const timestamp = String(Date.now());
    const nonce = crypto.randomBytes(16).toString("hex");
    const signature = createHmacSignature(hmacSecret, bodyRaw, timestamp, nonce);
    headers.set("x-timestamp", timestamp);
    headers.set("x-nonce", nonce);
    headers.set("x-signature", signature);
  }

  return headers;
}

function logProcessingEvent(
  level: "info" | "warn" | "error",
  message: string,
  meta: Record<string, unknown>
) {
  const payload = { source: "processing-service-client", ...meta };
  if (level === "error") {
    console.error(message, payload);
    return;
  }
  if (level === "warn") {
    console.warn(message, payload);
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(message, payload);
  }
}

export async function requestProcessingService(
  config: ProcessingServiceRuntimeConfig,
  options: ProcessingServiceRequestOptions
) {
  const method = options.method || "GET";
  const bodyRaw = options.body ? JSON.stringify(options.body) : "";
  const url = `${normalizeBaseUrl(config.baseUrl)}${options.path.startsWith("/") ? options.path : `/${options.path}`}`;
  const correlationId = options.correlationId || crypto.randomUUID();

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= config.retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), config.timeoutMs);
    const attemptNumber = attempt + 1;
    const maxAttempts = config.retryCount + 1;

    try {
      logProcessingEvent("info", "processing-service request", {
        correlationId,
        url,
        method,
        attempt: attemptNumber,
        maxAttempts
      });

      const response = await fetch(url, {
        method,
        headers: buildHeaders(config, bodyRaw, correlationId),
        body: bodyRaw || undefined,
        cache: "no-store",
        signal: controller.signal
      });

      clearTimeout(timeout);

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        logProcessingEvent("warn", "processing-service non-2xx response", {
          correlationId,
          status: response.status,
          attempt: attemptNumber,
          maxAttempts
        });
        const message =
          typeof payload.error === "string" && payload.error.trim().length > 0
            ? payload.error
            : `processing-service respondió ${response.status}`;
        throw new Error(message);
      }

      return {
        ok: true as const,
        correlationId,
        status: response.status,
        data: payload
      };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      logProcessingEvent(attempt >= config.retryCount ? "error" : "warn", "processing-service request failed", {
        correlationId,
        attempt: attemptNumber,
        maxAttempts,
        error: error instanceof Error ? error.message : String(error)
      });

      if (attempt >= config.retryCount) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  return {
    ok: false as const,
    correlationId,
    status: 0,
    error: lastError instanceof Error ? lastError.message : "processing-service request failed"
  };
}

export async function pingProcessingService(config: ProcessingServiceRuntimeConfig, correlationId?: string) {
  return requestProcessingService(config, {
    method: "GET",
    path: "/health",
    correlationId
  });
}
