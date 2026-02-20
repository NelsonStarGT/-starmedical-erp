import crypto from "node:crypto";
import { createClient } from "redis";
import { prisma } from "@/lib/prisma";
import { collectOpsHealthSnapshot } from "@/lib/ops/healthAggregator";
import { collectOpsMetricsSnapshot } from "@/lib/ops/metricsAggregator";
import { buildOpsAlertCandidates, notifyOpsAlert } from "@/lib/ops/alerts";
import {
  createOpsAlertEvent,
  listActiveOpsTenants,
  readLatestOpsHealthState,
  readLatestOpsMetricsSnapshot,
  readOpsSchedulerConfig,
  storeOpsHealthSnapshot,
  storeOpsMetricsSnapshot
} from "@/lib/ops/store";
import type { SessionUser } from "@/lib/auth";

type SchedulerTrigger = "interval" | "manual" | "bootstrap";

type TenantSchedulerResult = {
  tenantId: string;
  requestId: string;
  status: "executed" | "skipped" | "failed";
  reason: string;
  alertsCreated: number;
  healthStatus?: string;
  metricsStatus?: string;
};

type RedisClient = ReturnType<typeof createClient>;

declare global {
  // eslint-disable-next-line no-var
  var __opsSchedulerStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __opsSchedulerTimer: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __opsSchedulerRunning: boolean | undefined;
  // eslint-disable-next-line no-var
  var __opsSchedulerMemoryLocks: Map<string, string> | undefined;
}

let redisPromise: Promise<RedisClient> | null = null;

function schedulerEnabled() {
  if (process.env.NODE_ENV === "test") return false;
  const toggle = String(process.env.OPS_SCHEDULER_ENABLED || "true").trim().toLowerCase();
  return !(toggle === "0" || toggle === "false" || toggle === "no");
}

function schedulerTickMs() {
  const seconds = Number(process.env.OPS_SCHEDULER_TICK_SECONDS || 30);
  if (!Number.isFinite(seconds)) return 30_000;
  return Math.max(15_000, Math.min(300_000, Math.floor(seconds * 1000)));
}

function schedulerLockTtlMs() {
  const seconds = Number(process.env.OPS_SCHEDULER_LOCK_TTL_SECONDS || 110);
  if (!Number.isFinite(seconds)) return 110_000;
  return Math.max(30_000, Math.min(600_000, Math.floor(seconds * 1000)));
}

function alertCooldownSeconds() {
  const seconds = Number(process.env.OPS_ALERT_COOLDOWN_SECONDS || 600);
  if (!Number.isFinite(seconds)) return 600;
  return Math.max(60, Math.min(3600, Math.floor(seconds)));
}

function getRedisUrl() {
  return String(process.env.REDIS_URL || "").trim();
}

async function getRedis() {
  const url = getRedisUrl();
  if (!url) return null;
  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createClient({ url });
      await client.connect();
      return client;
    })();
  }
  try {
    return await redisPromise;
  } catch {
    redisPromise = null;
    return null;
  }
}

function getMemoryLocks() {
  if (!globalThis.__opsSchedulerMemoryLocks) {
    globalThis.__opsSchedulerMemoryLocks = new Map<string, string>();
  }
  return globalThis.__opsSchedulerMemoryLocks;
}

async function acquireTenantLock(tenantId: string, token: string) {
  const key = `ops:scheduler:lock:${tenantId}`;
  const ttlMs = schedulerLockTtlMs();
  const redis = await getRedis();
  if (redis) {
    const acquired = await redis.set(key, token, { NX: true, PX: ttlMs });
    return {
      acquired: acquired === "OK",
      release: async () => {
        const script = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end`;
        await redis.eval(script, {
          keys: [key],
          arguments: [token]
        });
      }
    };
  }

  const memoryLocks = getMemoryLocks();
  if (memoryLocks.has(key)) {
    return { acquired: false, release: async () => undefined };
  }
  memoryLocks.set(key, token);
  return {
    acquired: true,
    release: async () => {
      if (memoryLocks.get(key) === token) {
        memoryLocks.delete(key);
      }
    }
  };
}

async function insertSystemAudit(input: {
  action: string;
  requestId: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
  entityId?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: "OPS",
        entityId: input.entityId || "scheduler",
        actorUserId: null,
        actorRole: "SYSTEM",
        metadata: {
          actor: "system",
          requestId: input.requestId,
          tenantId: input.tenantId,
          module: "ops",
          ...(input.metadata || {})
        }
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ops.scheduler.audit.failed]", error instanceof Error ? error.message : "audit_failed");
    }
  }
}

function resolveThresholds() {
  return {
    cpuWarnPct: Number(process.env.OPS_ALERT_CPU_WARN_PCT || 85),
    cpuCriticalPct: Number(process.env.OPS_ALERT_CPU_CRITICAL_PCT || 95),
    memWarnPct: Number(process.env.OPS_ALERT_MEM_WARN_PCT || 85),
    memCriticalPct: Number(process.env.OPS_ALERT_MEM_CRITICAL_PCT || 95),
    bandwidthWarnBps: Number(process.env.OPS_ALERT_BANDWIDTH_WARN_BPS || 12 * 1024 * 1024)
  };
}

async function runTenantScheduler(input: {
  tenantId: string;
  trigger: SchedulerTrigger;
  force?: boolean;
  requestedBy?: SessionUser | null;
}): Promise<TenantSchedulerResult> {
  const tenantId = String(input.tenantId || process.env.TENANT_ID || "local").trim() || "local";
  const requestId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const lock = await acquireTenantLock(tenantId, token);

  if (!lock.acquired) {
    return {
      tenantId,
      requestId,
      status: "skipped",
      reason: "lock_busy",
      alertsCreated: 0
    };
  }

  try {
    const config = await readOpsSchedulerConfig({ tenantId });
    if (!config.enabled) {
      await insertSystemAudit({
        action: "OPS_SCHEDULER_SKIPPED",
        requestId,
        tenantId,
        metadata: { reason: "disabled" }
      });
      return {
        tenantId,
        requestId,
        status: "skipped",
        reason: "disabled",
        alertsCreated: 0
      };
    }

    if (!input.force) {
      const latest = await readLatestOpsMetricsSnapshot({
        tenantId,
        source: "scheduler"
      });
      if (latest?.createdAt) {
        const lastAt = new Date(latest.createdAt).getTime();
        if (Number.isFinite(lastAt)) {
          const elapsed = Date.now() - lastAt;
          if (elapsed < config.frequencySeconds * 1000) {
            return {
              tenantId,
              requestId,
              status: "skipped",
              reason: "not_due",
              alertsCreated: 0,
              metricsStatus: latest.status
            };
          }
        }
      }
    }

    const previousHealth = await readLatestOpsHealthState({ tenantId });
    const [healthSnapshot, metricsSnapshot] = await Promise.all([
      collectOpsHealthSnapshot(),
      collectOpsMetricsSnapshot({ range: "5m", tenantId })
    ]);

    await Promise.all([
      storeOpsHealthSnapshot({
        snapshot: healthSnapshot,
        source: "scheduler",
        requestId,
        actor: null,
        actorRole: "SYSTEM",
        tenantId,
        branchId: null
      }),
      storeOpsMetricsSnapshot({
        snapshot: metricsSnapshot,
        source: "scheduler",
        requestId,
        actor: null,
        actorRole: "SYSTEM",
        tenantId,
        branchId: null
      })
    ]);

    const thresholds = resolveThresholds();
    const candidates = buildOpsAlertCandidates({
      tenantId,
      previousHealth: previousHealth
        ? {
            status: previousHealth.status,
            services: previousHealth.services
          }
        : null,
      currentHealth: healthSnapshot,
      currentMetrics: metricsSnapshot,
      ...thresholds
    });

    let alertsCreated = 0;
    for (const candidate of candidates) {
      const created = await createOpsAlertEvent({
        tenantId,
        branchId: null,
        level: candidate.level,
        type: candidate.type,
        fromStatus: candidate.fromStatus,
        toStatus: candidate.toStatus,
        serviceKey: candidate.serviceKey,
        summary: candidate.summary,
        detailJson: {
          ...candidate.detailJson,
          trigger: input.trigger
        },
        dedupeKey: candidate.dedupeKey,
        requestId,
        source: "scheduler",
        cooldownSeconds: alertCooldownSeconds()
      });

      if (!created.created) continue;
      alertsCreated += 1;
      await notifyOpsAlert({
        tenantId,
        alert: candidate,
        channels: config.channels,
        recipients: config.recipients
      });
    }

    await insertSystemAudit({
      action: "OPS_SCHEDULER_TICK",
      requestId,
      tenantId,
      metadata: {
        trigger: input.trigger,
        alertsCreated,
        healthStatus: healthSnapshot.status,
        metricsStatus: metricsSnapshot.status,
        healthDurationMs: healthSnapshot.durationMs,
        metricsDurationMs: metricsSnapshot.durationMs
      }
    });

    return {
      tenantId,
      requestId,
      status: "executed",
      reason: input.trigger,
      alertsCreated,
      healthStatus: healthSnapshot.status,
      metricsStatus: metricsSnapshot.status
    };
  } catch (error) {
    await insertSystemAudit({
      action: "OPS_SCHEDULER_FAILED",
      requestId,
      tenantId,
      metadata: {
        trigger: input.trigger,
        message: error instanceof Error ? error.message : "scheduler_failed"
      }
    });

    return {
      tenantId,
      requestId,
      status: "failed",
      reason: error instanceof Error ? error.message : "scheduler_failed",
      alertsCreated: 0
    };
  } finally {
    await lock.release();
  }
}

export async function runOpsSchedulerNow(input?: {
  tenantId?: string | null;
  requestedBy?: SessionUser | null;
  force?: boolean;
}) {
  const selectedTenantId = String(input?.tenantId || "").trim();
  const tenants = selectedTenantId ? [selectedTenantId] : await listActiveOpsTenants();

  const results: TenantSchedulerResult[] = [];
  for (const tenantId of tenants) {
    const result = await runTenantScheduler({
      tenantId,
      trigger: "manual",
      force: input?.force ?? true,
      requestedBy: input?.requestedBy || null
    });
    results.push(result);
  }

  return {
    ok: results.every((row) => row.status !== "failed"),
    total: results.length,
    executed: results.filter((row) => row.status === "executed").length,
    skipped: results.filter((row) => row.status === "skipped").length,
    failed: results.filter((row) => row.status === "failed").length,
    items: results
  };
}

async function runOpsSchedulerIntervalCycle() {
  if (globalThis.__opsSchedulerRunning) return;
  globalThis.__opsSchedulerRunning = true;

  try {
    const tenants = await listActiveOpsTenants();
    for (const tenantId of tenants) {
      await runTenantScheduler({
        tenantId,
        trigger: "interval",
        force: false,
        requestedBy: null
      });
    }
  } finally {
    globalThis.__opsSchedulerRunning = false;
  }
}

export function ensureOpsSchedulerStarted() {
  if (!schedulerEnabled()) return false;
  if (globalThis.__opsSchedulerStarted) return true;

  globalThis.__opsSchedulerStarted = true;
  const tickMs = schedulerTickMs();

  globalThis.__opsSchedulerTimer = setInterval(() => {
    void runOpsSchedulerIntervalCycle();
  }, tickMs);

  setTimeout(() => {
    void runOpsSchedulerNow({ force: false }).catch((error) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ops.scheduler.bootstrap.failed]", error instanceof Error ? error.message : "bootstrap_failed");
      }
    });
  }, 3_000);

  if (process.env.NODE_ENV !== "production") {
    console.info(`[ops.scheduler] started interval=${tickMs}ms`);
  }

  return true;
}

export async function runOpsSchedulerCycleForTenant(input: {
  tenantId: string;
  trigger?: SchedulerTrigger;
  force?: boolean;
  requestedBy?: SessionUser | null;
}) {
  return runTenantScheduler({
    tenantId: input.tenantId,
    trigger: input.trigger || "manual",
    force: input.force,
    requestedBy: input.requestedBy || null
  });
}
