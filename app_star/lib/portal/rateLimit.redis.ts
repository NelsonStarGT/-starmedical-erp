import { createClient } from "redis";
import { hashPortalSecret } from "@/lib/portal/security";
import type { PortalRateLimitStore } from "@/lib/portal/rateLimit.types";

type PortalRedisClient = ReturnType<typeof createClient>;

let redisClientPromise: Promise<PortalRedisClient> | null = null;

function getRedisUrl() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL no configurado");
  }
  return url;
}

async function getRedisClient() {
  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const client = createClient({ url: getRedisUrl() });
      await client.connect();
      return client;
    })();
  }
  return redisClientPromise;
}

function buildRedisRateKey(key: string, windowMs: number, nowMs: number) {
  const windowBucket = Math.floor(nowMs / windowMs);
  const keyHash = hashPortalSecret(key);
  return `rl:${windowBucket}:${keyHash}:${windowMs}`;
}

export const redisPortalRateLimitStore: PortalRateLimitStore = {
  async consume(key, options) {
    const nowMs = options.nowMs ?? Date.now();
    const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));
    const resetAtMs = Math.floor(nowMs / options.windowMs) * options.windowMs + options.windowMs;
    const redisKey = buildRedisRateKey(key, options.windowMs, nowMs);
    const client = await getRedisClient();

    const nextCount = await client.incr(redisKey);
    if (nextCount === 1) {
      await client.expire(redisKey, windowSeconds);
    }

    let ttlSeconds = await client.ttl(redisKey);
    if (ttlSeconds < 0) {
      await client.expire(redisKey, windowSeconds);
      ttlSeconds = windowSeconds;
    }

    if (nextCount > options.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, ttlSeconds),
        resetAtMs
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, options.limit - nextCount),
      retryAfterSeconds: 0,
      resetAtMs
    };
  },
  async clearForTests() {
    const client = await getRedisClient();
    const pattern = "rl:*";
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      const redisKey = String(key);
      if (redisKey) {
        await client.del(redisKey);
      }
    }
  }
};
