"use client";

export type ConfigAuthStatus = "ok" | "expired" | "forbidden";

export type ConfigAuthCircuitState = {
  status: ConfigAuthStatus;
  message: string | null;
  blockedUntil: number | null;
  updatedAt: number;
};

const CIRCUIT_BREAKER_WINDOW_MS = 30_000;
const DEFAULT_EXPIRED_MESSAGE = "Sesion expirada. Inicia sesion para continuar.";
const DEFAULT_FORBIDDEN_MESSAGE = "Acceso restringido para esta configuracion.";

let authState: ConfigAuthCircuitState = {
  status: "ok",
  message: null,
  blockedUntil: null,
  updatedAt: Date.now()
};

const listeners = new Set<(state: ConfigAuthCircuitState) => void>();

function cloneState(state: ConfigAuthCircuitState): ConfigAuthCircuitState {
  return { ...state };
}

function emitAuthState() {
  const next = cloneState(authState);
  listeners.forEach((listener) => listener(next));
}

function setAuthState(next: ConfigAuthCircuitState) {
  authState = next;
  emitAuthState();
}

function normalizeMessage(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

async function resolveErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.clone().json()) as { error?: unknown; message?: unknown };
    return normalizeMessage(payload?.error ?? payload?.message, fallback);
  } catch {
    return fallback;
  }
}

function circuitActive(now = Date.now()) {
  return authState.status === "expired" && typeof authState.blockedUntil === "number" && authState.blockedUntil > now;
}

function setExpiredState(message: string) {
  const now = Date.now();
  const blockedUntil = now + CIRCUIT_BREAKER_WINDOW_MS;
  setAuthState({
    status: "expired",
    message,
    blockedUntil,
    updatedAt: now
  });
}

function setForbiddenState(message: string) {
  setAuthState({
    status: "forbidden",
    message,
    blockedUntil: null,
    updatedAt: Date.now()
  });
}

function resetAuthState() {
  if (authState.status === "ok") return;
  setAuthState({
    status: "ok",
    message: null,
    blockedUntil: null,
    updatedAt: Date.now()
  });
}

export class ConfigAuthRequestError extends Error {
  readonly status: 401 | 403;
  readonly blockedUntil: number | null;
  readonly isCircuitBreaker: boolean;

  constructor(status: 401 | 403, message: string, options?: { blockedUntil?: number | null; isCircuitBreaker?: boolean }) {
    super(message);
    this.name = "ConfigAuthRequestError";
    this.status = status;
    this.blockedUntil = options?.blockedUntil ?? null;
    this.isCircuitBreaker = options?.isCircuitBreaker ?? false;
  }
}

export function isConfigAuthRequestError(error: unknown): error is ConfigAuthRequestError {
  return error instanceof ConfigAuthRequestError;
}

export function getConfigAuthCircuitState() {
  return cloneState(authState);
}

export function subscribeConfigAuthCircuit(listener: (state: ConfigAuthCircuitState) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function configApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (circuitActive()) {
    throw new ConfigAuthRequestError(401, authState.message || DEFAULT_EXPIRED_MESSAGE, {
      blockedUntil: authState.blockedUntil,
      isCircuitBreaker: true
    });
  }

  const response = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "same-origin"
  });

  if (response.status === 401) {
    const message = await resolveErrorMessage(response, DEFAULT_EXPIRED_MESSAGE);
    setExpiredState(message);
    throw new ConfigAuthRequestError(401, message, { blockedUntil: authState.blockedUntil });
  }

  if (response.status === 403) {
    const message = await resolveErrorMessage(response, DEFAULT_FORBIDDEN_MESSAGE);
    setForbiddenState(message);
    throw new ConfigAuthRequestError(403, message);
  }

  if (response.ok) {
    resetAuthState();
  }

  return response;
}
