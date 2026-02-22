import { prisma } from "@/lib/prisma";
import { hashPortalSecret } from "@/lib/portal/security";
import type { PortalRateLimitStore } from "@/lib/portal/rateLimit.types";

function getWindowStartMs(nowMs: number, windowMs: number) {
  return Math.floor(nowMs / windowMs) * windowMs;
}

export const dbPortalRateLimitStore: PortalRateLimitStore = {
  async consume(key, options) {
    const nowMs = options.nowMs ?? Date.now();
    const windowStartMs = getWindowStartMs(nowMs, options.windowMs);
    const resetAtMs = windowStartMs + options.windowMs;
    const keyHash = hashPortalSecret(key);
    const windowStart = new Date(windowStartMs);
    const expiresAt = new Date(resetAtMs);

    const row = await prisma.portalRateLimitBucket.upsert({
      where: {
        keyHash_windowStart: {
          keyHash,
          windowStart
        }
      },
      create: {
        keyHash,
        windowStart,
        count: 1,
        expiresAt
      },
      update: {
        count: { increment: 1 },
        expiresAt
      },
      select: {
        count: true
      }
    });

    if (row.count > options.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000)),
        resetAtMs
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, options.limit - row.count),
      retryAfterSeconds: 0,
      resetAtMs
    };
  },
  async clearForTests() {
    await prisma.portalRateLimitBucket.deleteMany({});
  }
};
