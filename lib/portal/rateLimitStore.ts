import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";
import { PORTAL_RATE_LIMIT_MAX, PORTAL_RATE_LIMIT_WINDOW_MS } from "@/lib/portal/constants";
import { dbPortalRateLimitStore } from "@/lib/portal/rateLimit.db";
import { memoryPortalRateLimitStore } from "@/lib/portal/rateLimit.memory";
import { redisPortalRateLimitStore } from "@/lib/portal/rateLimit.redis";
import type { PortalRateLimitConsumeOptions, PortalRateLimitResult, PortalRateLimitStore } from "@/lib/portal/rateLimit.types";

const warnedRateLimitFallbacks = new Set<string>();

function warnDevRateLimitFallback(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (warnedRateLimitFallbacks.has(context)) return;
  warnedRateLimitFallbacks.add(context);
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[DEV][portal.rateLimit] ${context}: fallback activado (${message})`);
}

function getConfiguredBackend() {
  const envBackend = String(process.env.PORTAL_RATE_LIMIT_BACKEND || "").trim().toLowerCase();
  if (envBackend === "memory" || envBackend === "db" || envBackend === "redis") return envBackend;

  if (process.env.NODE_ENV === "test") return "memory";
  if (process.env.REDIS_URL) return "redis";
  return "db";
}

async function consumeWithStore(store: PortalRateLimitStore, key: string, options: PortalRateLimitConsumeOptions) {
  return store.consume(key, options);
}

function getPrimaryStore(): PortalRateLimitStore {
  const backend = getConfiguredBackend();
  if (backend === "memory") return memoryPortalRateLimitStore;
  if (backend === "redis") return redisPortalRateLimitStore;
  return dbPortalRateLimitStore;
}

function getFallbackStore(primary: PortalRateLimitStore): PortalRateLimitStore {
  if (primary === redisPortalRateLimitStore) return dbPortalRateLimitStore;
  return memoryPortalRateLimitStore;
}

export async function consumePortalRateLimit(
  key: string,
  options?: Partial<PortalRateLimitConsumeOptions>
): Promise<PortalRateLimitResult> {
  const resolvedOptions: PortalRateLimitConsumeOptions = {
    limit: options?.limit ?? PORTAL_RATE_LIMIT_MAX,
    windowMs: options?.windowMs ?? PORTAL_RATE_LIMIT_WINDOW_MS,
    nowMs: options?.nowMs
  };

  const primary = getPrimaryStore();
  try {
    return await consumeWithStore(primary, key, resolvedOptions);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("portal.rateLimit.consume.primary", error);
    } else {
      warnDevRateLimitFallback("consume.primary.failed", error);
    }
    const fallback = getFallbackStore(primary);
    return consumeWithStore(fallback, key, resolvedOptions);
  }
}

export async function clearPortalRateLimitStoreForTests() {
  const primary = getPrimaryStore();
  try {
    await primary.clearForTests();
  } catch (error) {
    warnDevRateLimitFallback("clearForTests.primary.failed", error);
  }
  const fallback = getFallbackStore(primary);
  if (fallback !== primary) {
    await fallback.clearForTests();
  }
}
