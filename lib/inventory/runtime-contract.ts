export const SERVICE_UNAVAILABLE_CODE = "SERVICE_UNAVAILABLE" as const;

export type ServiceUnavailablePayload = {
  ok: false;
  code: typeof SERVICE_UNAVAILABLE_CODE;
  error: string;
  hint?: string;
  action?: string;
  module?: string;
};

export function buildServiceUnavailablePayload(params: {
  module: string;
  error: string;
  hint?: string;
  action?: string;
}): ServiceUnavailablePayload {
  return {
    ok: false,
    code: SERVICE_UNAVAILABLE_CODE,
    module: params.module,
    error: params.error,
    hint: params.hint,
    action: params.action
  };
}

export function parseServiceUnavailablePayload(status: number, payload: unknown): ServiceUnavailablePayload | null {
  if (status !== 503 || !payload || typeof payload !== "object") return null;
  const candidate = payload as Partial<ServiceUnavailablePayload>;
  if (candidate.ok !== false) return null;
  if (candidate.code !== SERVICE_UNAVAILABLE_CODE) return null;
  if (typeof candidate.error !== "string" || !candidate.error.trim()) return null;

  return {
    ok: false,
    code: SERVICE_UNAVAILABLE_CODE,
    error: candidate.error,
    hint: typeof candidate.hint === "string" ? candidate.hint : undefined,
    action: typeof candidate.action === "string" ? candidate.action : undefined,
    module: typeof candidate.module === "string" ? candidate.module : undefined
  };
}
