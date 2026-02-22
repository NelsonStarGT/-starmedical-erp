export type SafeFetchResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
  raw?: any;
};

function extractJsonSafe(payload: any) {
  if (payload && typeof payload === "object") return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

export async function safeFetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<SafeFetchResult<T>> {
  try {
    const response = await fetch(input, init);
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const rawBody = isJson ? await response.json() : await response.text();
    const payload = extractJsonSafe(rawBody);

    if (!response.ok) {
      const errorCode = typeof payload === "object" && payload ? payload.error || payload.code : undefined;
      return { ok: false, error: errorCode || response.statusText || "REQUEST_FAILED", status: response.status, raw: payload };
    }

    if (payload && typeof payload === "object" && "ok" in payload) {
      if ((payload as any).ok === false) {
        return { ok: false, error: (payload as any).error || "REQUEST_FAILED", status: response.status, raw: payload };
      }
      return { ok: true, data: (payload as any).data ?? payload, status: response.status, raw: payload };
    }

    return { ok: true, data: payload as T, status: response.status, raw: payload };
  } catch (err: any) {
    return { ok: false, error: err?.message || "NETWORK_ERROR", status: 0 };
  }
}
