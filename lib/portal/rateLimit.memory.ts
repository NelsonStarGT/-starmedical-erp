import type { PortalRateLimitStore } from "@/lib/portal/rateLimit.types";

type PortalRateLimitState = {
  count: number;
  resetAtMs: number;
};

const portalRateLimitStore = new Map<string, PortalRateLimitState>();

export const memoryPortalRateLimitStore: PortalRateLimitStore = {
  async consume(key, options) {
    const nowMs = options.nowMs ?? Date.now();
    const current = portalRateLimitStore.get(key);
    if (!current || nowMs > current.resetAtMs) {
      const next: PortalRateLimitState = { count: 1, resetAtMs: nowMs + options.windowMs };
      portalRateLimitStore.set(key, next);
      return {
        allowed: true,
        remaining: Math.max(0, options.limit - 1),
        retryAfterSeconds: 0,
        resetAtMs: next.resetAtMs
      };
    }

    if (current.count >= options.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAtMs - nowMs) / 1000)),
        resetAtMs: current.resetAtMs
      };
    }

    current.count += 1;
    portalRateLimitStore.set(key, current);
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - current.count),
      retryAfterSeconds: 0,
      resetAtMs: current.resetAtMs
    };
  },
  async clearForTests() {
    portalRateLimitStore.clear();
  }
};
