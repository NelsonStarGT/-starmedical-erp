import { NextRequest } from "next/server";

type Counter = { count: number; resetAt: number };

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 20;
const counters = new Map<string, Counter>();

export function getClientIp(req: Request | NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  return (req as any).ip || forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(key: string, limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS) {
  const now = Date.now();
  const existing = counters.get(key);

  if (!existing || existing.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true as const };
  }

  if (existing.count >= limit) {
    const retryAt = new Date(existing.resetAt).toISOString();
    return { allowed: false as const, retryAt };
  }

  existing.count += 1;
  counters.set(key, existing);
  return { allowed: true as const };
}

export function enforceRateLimit(req: NextRequest, options?: { windowMs?: number; limit?: number }) {
  const ip = getClientIp(req);
  const key = `${ip}:${req.nextUrl.pathname}`;
  const res = rateLimit(key, options?.limit, options?.windowMs);
  if (!res.allowed) {
    throw { status: 429, body: { error: "Rate limit", retryAt: res.retryAt, code: "RATE_LIMIT" } };
  }
}
