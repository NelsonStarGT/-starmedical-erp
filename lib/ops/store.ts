import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";
import type { SessionUser } from "@/lib/auth";
import type {
  OpsAlertEventRow,
  OpsAlertLevel,
  OpsAlertType,
  OpsAuditRow,
  OpsHealthGlobalStatus,
  OpsHealthHistoryRow,
  OpsHealthServiceStatus,
  OpsHealthSnapshot,
  OpsMetricsHistoryRow,
  OpsMetricsRange,
  OpsMetricsServiceStatus,
  OpsMetricsSnapshot,
  OpsSchedulerChannels,
  OpsSchedulerConfig,
  OpsSchedulerConfigPublic,
  OpsSchedulerRecipients
} from "@/lib/ops/types";

type OpsHealthWriteInput = {
  snapshot: OpsHealthSnapshot;
  source?: string;
  requestId?: string | null;
  actor?: SessionUser | null;
  actorRole?: string | null;
  tenantId?: string | null;
  branchId?: string | null;
};

type OpsHealthHistoryInput = {
  serviceKey?: string | null;
  serviceStatus?: OpsHealthServiceStatus | null;
  tenantId?: string | null;
  from?: Date | null;
  to?: Date | null;
  limit?: number;
};

type OpsAuditQueryInput = {
  from?: Date | null;
  to?: Date | null;
  action?: string | null;
  limit?: number;
};

type OpsMetricsWriteInput = {
  snapshot: OpsMetricsSnapshot;
  source?: string;
  requestId?: string | null;
  actor?: SessionUser | null;
  actorRole?: string | null;
  tenantId?: string | null;
  branchId?: string | null;
  buildCommit?: string | null;
  buildVersion?: string | null;
};

type OpsMetricsHistoryInput = {
  serviceKey?: string | null;
  serviceStatus?: OpsMetricsServiceStatus | null;
  tenantId?: string | null;
  range?: OpsMetricsRange | null;
  source?: string | null;
  from?: Date | null;
  to?: Date | null;
  limit?: number;
};

type OpsAlertCreateInput = {
  tenantId?: string | null;
  branchId?: string | null;
  level: OpsAlertLevel;
  type: OpsAlertType;
  fromStatus?: string | null;
  toStatus?: string | null;
  serviceKey?: string | null;
  summary: string;
  detailJson?: Record<string, unknown>;
  dedupeKey: string;
  requestId?: string | null;
  source?: string | null;
  cooldownSeconds?: number;
};

type OpsAlertReadInput = {
  tenantId?: string | null;
  serviceKey?: string | null;
  type?: OpsAlertType | null;
  level?: OpsAlertLevel | null;
  from?: Date | null;
  to?: Date | null;
  limit?: number;
};

type OpsSchedulerConfigReadInput = {
  tenantId?: string | null;
  fallbackRecipients?: string[];
};

type OpsSchedulerConfigWriteInput = {
  tenantId?: string | null;
  enabled: boolean;
  frequencySeconds: number;
  channels: OpsSchedulerChannels;
  recipients: OpsSchedulerRecipients;
};

type OpsHealthState = {
  id: string;
  createdAt: string;
  status: OpsHealthGlobalStatus;
  services: Record<string, OpsHealthServiceStatus>;
};

type OpsSchedulerRunState = {
  createdAt: string;
  status: OpsHealthGlobalStatus;
  requestId: string | null;
};

const DEFAULT_TENANT = "local";
const DEFAULT_SCHEDULER_CHANNELS: OpsSchedulerChannels = {
  email: true,
  whatsapp: false
};
const DEFAULT_SCHEDULER_RECIPIENTS: OpsSchedulerRecipients = {
  emails: [],
  whatsapp: []
};

function normalizeLimit(value: number | undefined, fallback: number, max = 200) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

function normalizeTenantId(value?: string | null) {
  const tenantId = String(value || process.env.TENANT_ID || DEFAULT_TENANT).trim();
  return tenantId || DEFAULT_TENANT;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

function asOpsMetricsRange(value: unknown): OpsMetricsRange {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "15m") return "15m";
  if (normalized === "1h") return "1h";
  return "5m";
}

function asOpsMetricsServiceStatus(value: unknown): OpsMetricsServiceStatus {
  return String(value || "").trim().toLowerCase() === "down" ? "down" : "up";
}

function asOpsHealthStatus(value: unknown): OpsHealthGlobalStatus {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "down") return "down";
  if (normalized === "degraded") return "degraded";
  return "ok";
}

function asOpsAlertLevel(value: unknown): OpsAlertLevel {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "warning") return "warning";
  return "info";
}

function asOpsAlertType(value: unknown): OpsAlertType {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "metrics_threshold") return "metrics_threshold";
  if (normalized === "service_down") return "service_down";
  if (normalized === "recovery") return "recovery";
  return "health_transition";
}

function parseEmails(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value || "").trim().toLowerCase())
    .filter((value, index, all) => Boolean(value) && value.includes("@") && all.indexOf(value) === index)
    .slice(0, 30);
}

function parsePhones(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value || "").trim())
    .filter((value, index, all) => Boolean(value) && all.indexOf(value) === index)
    .slice(0, 30);
}

function maskEmail(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized.includes("@")) return "***";
  const [local, domain] = normalized.split("@");
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function safeBigIntFromNumber(value: unknown) {
  const numeric = Math.max(0, Math.round(asNumber(value, 0)));
  return BigInt(numeric);
}

function getBuildCommit() {
  return (
    process.env.GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.COMMIT_SHA ||
    "unknown"
  );
}

function getBuildVersion() {
  return process.env.APP_VERSION || process.env.npm_package_version || "0.0.0";
}

export function isOpsAlertCooldownActive(cooldownUntil: Date | string | null | undefined, nowMs = Date.now()) {
  if (!cooldownUntil) return false;
  const untilMs = new Date(cooldownUntil).getTime();
  if (!Number.isFinite(untilMs)) return false;
  return untilMs > nowMs;
}

function normalizeChannels(value: unknown): OpsSchedulerChannels {
  const raw = asRecord(value);
  return {
    email: Boolean(raw.email ?? DEFAULT_SCHEDULER_CHANNELS.email),
    whatsapp: Boolean(raw.whatsapp ?? DEFAULT_SCHEDULER_CHANNELS.whatsapp)
  };
}

function normalizeRecipients(value: unknown): OpsSchedulerRecipients {
  const raw = asRecord(value);
  return {
    emails: parseEmails(raw.emails),
    whatsapp: parsePhones(raw.whatsapp)
  };
}

function maskRecipients(input: OpsSchedulerRecipients): OpsSchedulerRecipients {
  return {
    emails: input.emails.map(maskEmail),
    whatsapp: input.whatsapp.map(() => "***")
  };
}

function getOpsDelegates() {
  const client = prisma as unknown as {
    opsHealthCheck?: {
      create?: (input: unknown) => Promise<{ id: string }>;
      findFirst?: (input: unknown) => Promise<any | null>;
    };
    opsHealthCheckService?: {
      createMany?: (input: unknown) => Promise<{ count: number }>;
      findMany?: (input: unknown) => Promise<any[]>;
    };
    opsMetricsSnapshot?: {
      create?: (input: unknown) => Promise<{ id: string; createdAt: Date; status: string; requestId: string | null }>;
      findFirst?: (input: unknown) => Promise<any | null>;
    };
    opsMetricsSnapshotService?: {
      createMany?: (input: unknown) => Promise<{ count: number }>;
      findMany?: (input: unknown) => Promise<any[]>;
    };
    opsAlertEvent?: {
      create?: (input: unknown) => Promise<{ id: string }>;
      findMany?: (input: unknown) => Promise<any[]>;
      findFirst?: (input: unknown) => Promise<any | null>;
    };
    opsSchedulerConfig?: {
      findUnique?: (input: unknown) => Promise<any | null>;
      upsert?: (input: unknown) => Promise<any>;
    };
    auditLog?: {
      findMany?: (input: unknown) => Promise<any[]>;
    };
    tenant?: {
      findMany?: (input: unknown) => Promise<Array<{ id: string }>>;
    };
  };
  return client;
}

export function buildOpsMetricsSnapshotServiceRows(input: {
  snapshotId: string;
  tenantId?: string | null;
  snapshot: OpsMetricsSnapshot;
}) {
  return input.snapshot.services.map((service) => ({
    snapshotId: input.snapshotId,
    tenantId: input.tenantId || null,
    serviceKey: service.serviceKey,
    status: service.status,
    cpuPercent: asNumber(service.cpuPercent, 0),
    memoryBytes: safeBigIntFromNumber(service.memoryBytes),
    memoryPercent: typeof service.memoryPercent === "number" ? service.memoryPercent : null,
    netRxBps: asNumber(service.networkRxBytesPerSec, 0),
    netTxBps: asNumber(service.networkTxBytesPerSec, 0),
    bandwidthBps: asNumber(service.bandwidthBytesPerSec, 0),
    checkedAt: new Date(service.checkedAt)
  }));
}

export async function storeOpsHealthSnapshot(input: OpsHealthWriteInput): Promise<{ id: string } | null> {
  const delegates = getOpsDelegates();
  if (!delegates.opsHealthCheck?.create || !delegates.opsHealthCheckService?.createMany) {
    return null;
  }

  try {
    const created = await delegates.opsHealthCheck.create({
      data: {
        globalStatus: input.snapshot.status,
        durationMs: input.snapshot.durationMs,
        buildCommit: input.snapshot.build.commit,
        buildVersion: input.snapshot.build.version,
        source: input.source || "admin",
        requestId: input.requestId || null,
        actorUserId: input.actor?.id || null,
        actorRole: input.actorRole || input.actor?.roles?.[0] || null,
        tenantId: input.tenantId || input.actor?.tenantId || null,
        branchId: input.branchId || input.actor?.branchId || null
      }
    });

    await delegates.opsHealthCheckService.createMany({
      data: input.snapshot.services.map((service) => ({
        checkId: created.id,
        serviceKey: service.serviceKey,
        serviceLabel: service.label,
        status: service.status,
        required: service.required,
        latencyMs: service.latencyMs,
        checkedAt: new Date(service.checkedAt),
        detail: service.detail || null,
        httpStatus: service.httpStatus || null,
        target: service.target || null
      }))
    });

    return { id: created.id };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("ops.health.store", error);
      return null;
    }
    throw error;
  }
}

export async function readOpsHealthHistory(input?: OpsHealthHistoryInput): Promise<OpsHealthHistoryRow[]> {
  const delegates = getOpsDelegates();
  if (!delegates.opsHealthCheckService?.findMany) {
    return [];
  }

  const limit = normalizeLimit(input?.limit, 80);
  const createdAt: Record<string, Date> = {};
  if (input?.from) createdAt.gte = input.from;
  if (input?.to) createdAt.lte = input.to;

  const where: Record<string, unknown> = {};
  if (input?.serviceKey) where.serviceKey = String(input.serviceKey).trim();
  if (input?.serviceStatus) where.status = String(input.serviceStatus).trim();

  const checkWhere: Record<string, unknown> = {};
  if (input?.tenantId) {
    checkWhere.tenantId = String(input.tenantId).trim();
  }
  if (Object.keys(createdAt).length) {
    checkWhere.createdAt = createdAt;
  }
  if (Object.keys(checkWhere).length > 0) {
    where.check = checkWhere;
  }

  try {
    const rows = await delegates.opsHealthCheckService.findMany({
      where,
      orderBy: { checkedAt: "desc" },
      take: limit,
      include: {
        check: {
          select: {
            id: true,
            createdAt: true,
            globalStatus: true,
            requestId: true,
            source: true,
            actorUserId: true,
            actorRole: true
          }
        }
      }
    });

    return rows.map((row) => ({
      id: String(row.id),
      checkId: String(row.checkId),
      checkCreatedAt: toIso(row.check?.createdAt) || "",
      globalStatus: asOpsHealthStatus(row.check?.globalStatus),
      serviceKey: String(row.serviceKey || ""),
      serviceLabel: String(row.serviceLabel || row.serviceKey || ""),
      serviceStatus: String(row.status || "down") as OpsHealthServiceStatus,
      required: Boolean(row.required),
      latencyMs: Number.isFinite(Number(row.latencyMs)) ? Number(row.latencyMs) : null,
      checkedAt: toIso(row.checkedAt) || "",
      detail: row.detail ? String(row.detail) : null,
      requestId: row.check?.requestId ? String(row.check.requestId) : null,
      source: row.check?.source ? String(row.check.source) : null,
      actorUserId: row.check?.actorUserId ? String(row.check.actorUserId) : null,
      actorRole: row.check?.actorRole ? String(row.check.actorRole) : null
    }));
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("ops.health.history", error);
      return [];
    }
    throw error;
  }
}

export async function readLatestOpsHealthState(input?: { tenantId?: string | null }): Promise<OpsHealthState | null> {
  const delegates = getOpsDelegates();
  if (!delegates.opsHealthCheck?.findFirst) return null;

  const tenantId = String(input?.tenantId || "").trim();
  const where = tenantId ? { tenantId } : undefined;

  try {
    const row = await delegates.opsHealthCheck.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        services: {
          select: {
            serviceKey: true,
            status: true
          }
        }
      }
    });

    if (!row) return null;
    const services: Record<string, OpsHealthServiceStatus> = {};
    for (const service of row.services || []) {
      const key = String(service.serviceKey || "").trim();
      if (!key) continue;
      services[key] = String(service.status || "down") as OpsHealthServiceStatus;
    }

    return {
      id: String(row.id),
      createdAt: toIso(row.createdAt) || "",
      status: asOpsHealthStatus(row.globalStatus),
      services
    };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("ops.health.latest", error);
      return null;
    }
    throw error;
  }
}

export async function storeOpsMetricsSnapshot(input: OpsMetricsWriteInput): Promise<{ id: string } | null> {
  const delegates = getOpsDelegates();
  if (!delegates.opsMetricsSnapshot?.create || !delegates.opsMetricsSnapshotService?.createMany) {
    return null;
  }

  const tenantId = input.tenantId || input.actor?.tenantId || null;
  const branchId = input.branchId || input.actor?.branchId || null;

  try {
    const created = await delegates.opsMetricsSnapshot.create({
      data: {
        tenantId,
        branchId,
        projectName: input.snapshot.projectName,
        range: input.snapshot.range,
        status: input.snapshot.status,
        durationMs: input.snapshot.durationMs,
        requestId: input.requestId || null,
        source: input.source || "admin_api",
        buildCommit: input.buildCommit || getBuildCommit(),
        buildVersion: input.buildVersion || getBuildVersion()
      }
    });

    await delegates.opsMetricsSnapshotService.createMany({
      data: buildOpsMetricsSnapshotServiceRows({
        snapshotId: created.id,
        tenantId,
        snapshot: input.snapshot
      })
    });

    return { id: created.id };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("ops.metrics.store", error);
      return null;
    }
    throw error;
  }
}

export async function readLatestOpsMetricsSnapshot(input?: {
  tenantId?: string | null;
  source?: string | null;
}): Promise<OpsSchedulerRunState | null> {
  const delegates = getOpsDelegates();
  if (!delegates.opsMetricsSnapshot?.findFirst) return null;

  const where: Record<string, unknown> = {};
  if (input?.tenantId) where.tenantId = String(input.tenantId).trim();
  if (input?.source) where.source = String(input.source).trim();

  try {
    const row = await delegates.opsMetricsSnapshot.findFirst({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        status: true,
        requestId: true
      }
    });

    if (!row) return null;
    return {
      createdAt: toIso(row.createdAt) || "",
      status: asOpsHealthStatus(row.status),
      requestId: row.requestId ? String(row.requestId) : null
    };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("ops.metrics.latest", error);
      return null;
    }
    throw error;
  }
}

export async function readOpsMetricsHistory(input?: OpsMetricsHistoryInput): Promise<OpsMetricsHistoryRow[]> {
  const delegates = getOpsDelegates();
  if (!delegates.opsMetricsSnapshotService?.findMany) return [];

  const limit = normalizeLimit(input?.limit, 120, 400);

  const where: Record<string, unknown> = {};
  if (input?.serviceKey) where.serviceKey = String(input.serviceKey).trim();
  if (input?.serviceStatus) where.status = String(input.serviceStatus).trim();

  const snapshotWhere: Record<string, unknown> = {};
  if (input?.tenantId) snapshotWhere.tenantId = String(input.tenantId).trim();
  if (input?.range) snapshotWhere.range = input.range;
  if (input?.source) snapshotWhere.source = String(input.source).trim();

  const createdAt: Record<string, Date> = {};
  if (input?.from) createdAt.gte = input.from;
  if (input?.to) createdAt.lte = input.to;
  if (Object.keys(createdAt).length > 0) {
    snapshotWhere.createdAt = createdAt;
  }

  if (Object.keys(snapshotWhere).length > 0) {
    where.snapshot = snapshotWhere;
  }

  try {
    const rows = await delegates.opsMetricsSnapshotService.findMany({
      where,
      orderBy: { checkedAt: "desc" },
      take: limit,
      include: {
        snapshot: {
          select: {
            id: true,
            createdAt: true,
            tenantId: true,
            projectName: true,
            range: true,
            status: true,
            source: true,
            requestId: true
          }
        }
      }
    });

    return rows.map((row) => {
      const memoryRaw = row.memoryBytes;
      const memoryValue =
        typeof memoryRaw === "bigint"
          ? Number(memoryRaw)
          : Number.isFinite(Number(memoryRaw))
            ? Number(memoryRaw)
            : 0;
      return {
        id: String(row.id),
        snapshotId: String(row.snapshotId),
        createdAt: toIso(row.snapshot?.createdAt) || "",
        tenantId: row.snapshot?.tenantId ? String(row.snapshot.tenantId) : null,
        projectName: String(row.snapshot?.projectName || ""),
        range: asOpsMetricsRange(row.snapshot?.range),
        globalStatus: asOpsHealthStatus(row.snapshot?.status),
        source: row.snapshot?.source ? String(row.snapshot.source) : null,
        requestId: row.snapshot?.requestId ? String(row.snapshot.requestId) : null,
        serviceKey: String(row.serviceKey || ""),
        serviceStatus: asOpsMetricsServiceStatus(row.status),
        cpuPercent: asNumber(row.cpuPercent, 0),
        memoryBytes: memoryValue,
        memoryPercent: typeof row.memoryPercent === "number" ? row.memoryPercent : null,
        netRxBps: asNumber(row.netRxBps, 0),
        netTxBps: asNumber(row.netTxBps, 0),
        bandwidthBps: asNumber(row.bandwidthBps, 0),
        checkedAt: toIso(row.checkedAt) || ""
      };
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("ops.metrics.history", error);
      return [];
    }
    throw error;
  }
}

export async function createOpsAlertEvent(input: OpsAlertCreateInput): Promise<{ created: boolean; id: string | null }> {
  const delegates = getOpsDelegates();
  if (!delegates.opsAlertEvent?.create || !delegates.opsAlertEvent?.findFirst) {
    return { created: false, id: null };
  }

  const now = new Date();
  const cooldownSeconds = Math.max(60, Math.floor(input.cooldownSeconds || 600));

  try {
    const existing = await delegates.opsAlertEvent.findFirst({
      where: {
        dedupeKey: input.dedupeKey
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        cooldownUntil: true
      }
    });

    if (isOpsAlertCooldownActive(existing?.cooldownUntil, now.getTime())) {
      return { created: false, id: String(existing.id) };
    }

    const created = await delegates.opsAlertEvent.create({
      data: {
        tenantId: input.tenantId || null,
        branchId: input.branchId || null,
        level: input.level,
        type: input.type,
        fromStatus: input.fromStatus || null,
        toStatus: input.toStatus || null,
        serviceKey: input.serviceKey || null,
        summary: String(input.summary || "alert").slice(0, 500),
        detailJson: input.detailJson || {},
        dedupeKey: input.dedupeKey,
        cooldownUntil: new Date(now.getTime() + cooldownSeconds * 1000),
        requestId: input.requestId || null,
        source: input.source || "scheduler"
      }
    });

    return { created: true, id: String(created.id) };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("ops.alert.create", error);
      return { created: false, id: null };
    }
    throw error;
  }
}

export async function readOpsAlertEvents(input?: OpsAlertReadInput): Promise<OpsAlertEventRow[]> {
  const delegates = getOpsDelegates();
  if (!delegates.opsAlertEvent?.findMany) return [];

  const limit = normalizeLimit(input?.limit, 100, 300);
  const where: Record<string, unknown> = {};
  if (input?.tenantId) where.tenantId = String(input.tenantId).trim();
  if (input?.serviceKey) where.serviceKey = String(input.serviceKey).trim();
  if (input?.type) where.type = input.type;
  if (input?.level) where.level = input.level;

  const createdAt: Record<string, Date> = {};
  if (input?.from) createdAt.gte = input.from;
  if (input?.to) createdAt.lte = input.to;
  if (Object.keys(createdAt).length > 0) {
    where.createdAt = createdAt;
  }

  try {
    const rows = await delegates.opsAlertEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return rows.map((row) => ({
      id: String(row.id),
      createdAt: toIso(row.createdAt) || "",
      tenantId: row.tenantId ? String(row.tenantId) : null,
      branchId: row.branchId ? String(row.branchId) : null,
      level: asOpsAlertLevel(row.level),
      type: asOpsAlertType(row.type),
      fromStatus: row.fromStatus ? String(row.fromStatus) : null,
      toStatus: row.toStatus ? String(row.toStatus) : null,
      serviceKey: row.serviceKey ? String(row.serviceKey) : null,
      summary: String(row.summary || ""),
      detailJson: asRecord(row.detailJson),
      dedupeKey: String(row.dedupeKey || ""),
      cooldownUntil: toIso(row.cooldownUntil),
      requestId: row.requestId ? String(row.requestId) : null,
      source: row.source ? String(row.source) : null
    }));
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("ops.alert.read", error);
      return [];
    }
    throw error;
  }
}

function buildSchedulerConfigRecord(input: {
  tenantId: string;
  enabled: boolean;
  frequencySeconds: number;
  channels: OpsSchedulerChannels;
  recipients: OpsSchedulerRecipients;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}): OpsSchedulerConfig {
  return {
    tenantId: input.tenantId,
    enabled: Boolean(input.enabled),
    frequencySeconds: Math.max(60, Math.min(3600, Math.floor(input.frequencySeconds))),
    channels: {
      email: Boolean(input.channels.email),
      whatsapp: Boolean(input.channels.whatsapp)
    },
    recipients: {
      emails: parseEmails(input.recipients.emails),
      whatsapp: parsePhones(input.recipients.whatsapp)
    },
    createdAt: toIso(input.createdAt) || new Date().toISOString(),
    updatedAt: toIso(input.updatedAt) || new Date().toISOString()
  };
}

export async function readOpsSchedulerConfig(input?: OpsSchedulerConfigReadInput): Promise<OpsSchedulerConfig> {
  const delegates = getOpsDelegates();
  const tenantId = normalizeTenantId(input?.tenantId);
  const fallbackRecipients = parseEmails(input?.fallbackRecipients || []);

  const defaults = buildSchedulerConfigRecord({
    tenantId,
    enabled: true,
    frequencySeconds: 120,
    channels: DEFAULT_SCHEDULER_CHANNELS,
    recipients: {
      ...DEFAULT_SCHEDULER_RECIPIENTS,
      emails: fallbackRecipients
    }
  });

  if (!delegates.opsSchedulerConfig?.findUnique) {
    return defaults;
  }

  try {
    const row = await delegates.opsSchedulerConfig.findUnique({
      where: { tenantId }
    });

    if (!row) return defaults;

    const channels = normalizeChannels(row.channelsJson || DEFAULT_SCHEDULER_CHANNELS);
    const recipients = normalizeRecipients(row.recipientsJson || DEFAULT_SCHEDULER_RECIPIENTS);
    if (recipients.emails.length === 0 && fallbackRecipients.length > 0) {
      recipients.emails = fallbackRecipients;
    }

    return buildSchedulerConfigRecord({
      tenantId,
      enabled: row.enabled,
      frequencySeconds: row.frequencySeconds,
      channels,
      recipients,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("ops.scheduler.config.read", error);
      return defaults;
    }
    throw error;
  }
}

export async function readOpsSchedulerConfigPublic(
  input?: OpsSchedulerConfigReadInput
): Promise<OpsSchedulerConfigPublic> {
  const config = await readOpsSchedulerConfig(input);
  return {
    ...config,
    maskedRecipients: maskRecipients(config.recipients)
  };
}

export async function writeOpsSchedulerConfig(input: OpsSchedulerConfigWriteInput): Promise<OpsSchedulerConfig> {
  const delegates = getOpsDelegates();
  const tenantId = normalizeTenantId(input.tenantId);
  const frequencySeconds = Math.max(60, Math.min(3600, Math.floor(asNumber(input.frequencySeconds, 120))));
  const channels = normalizeChannels(input.channels || DEFAULT_SCHEDULER_CHANNELS);
  const recipients = normalizeRecipients(input.recipients || DEFAULT_SCHEDULER_RECIPIENTS);

  if (!delegates.opsSchedulerConfig?.upsert) {
    return buildSchedulerConfigRecord({
      tenantId,
      enabled: input.enabled,
      frequencySeconds,
      channels,
      recipients
    });
  }

  try {
    const row = await delegates.opsSchedulerConfig.upsert({
      where: { tenantId },
      update: {
        enabled: Boolean(input.enabled),
        frequencySeconds,
        channelsJson: channels,
        recipientsJson: recipients
      },
      create: {
        tenantId,
        enabled: Boolean(input.enabled),
        frequencySeconds,
        channelsJson: channels,
        recipientsJson: recipients
      }
    });

    return buildSchedulerConfigRecord({
      tenantId,
      enabled: row.enabled,
      frequencySeconds: row.frequencySeconds,
      channels: normalizeChannels(row.channelsJson),
      recipients: normalizeRecipients(row.recipientsJson),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("ops.scheduler.config.write", error);
      return buildSchedulerConfigRecord({
        tenantId,
        enabled: input.enabled,
        frequencySeconds,
        channels,
        recipients
      });
    }
    throw error;
  }
}

export async function readOpsAuditEvents(input?: OpsAuditQueryInput): Promise<OpsAuditRow[]> {
  const delegates = getOpsDelegates();
  if (!delegates.auditLog?.findMany) return [];

  const limit = normalizeLimit(input?.limit, 80);
  const timestamp: Record<string, Date> = {};
  if (input?.from) timestamp.gte = input.from;
  if (input?.to) timestamp.lte = input.to;

  const where: Record<string, unknown> = {
    OR: [{ entityType: "OPS" }, { action: { startsWith: "OPS_" } }]
  };
  if (Object.keys(timestamp).length > 0) {
    where.timestamp = timestamp;
  }
  if (input?.action) {
    where.action = { contains: String(input.action).trim().toUpperCase() };
  }

  const rows = await delegates.auditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: limit
  });

  return rows.map((row) => {
    const metadata = asRecord(row.metadata);
    const moduleValue = metadata.module;
    const tenantId = metadata.tenantId;
    const branchId = metadata.branchId;
    const ip = metadata.ip;
    const userAgent = metadata.userAgent;
    const requestId = metadata.requestId;
    return {
      id: String(row.id),
      createdAt: toIso(row.timestamp) || "",
      actorUserId: row.actorUserId ? String(row.actorUserId) : null,
      actorRole: row.actorRole ? String(row.actorRole) : null,
      action: String(row.action || ""),
      module: moduleValue ? String(moduleValue) : null,
      tenantId: tenantId ? String(tenantId) : null,
      branchId: branchId ? String(branchId) : null,
      ip: ip ? String(ip) : null,
      userAgent: userAgent ? String(userAgent) : null,
      requestId: requestId ? String(requestId) : null,
      metadata
    };
  });
}

export async function listActiveOpsTenants(): Promise<string[]> {
  const delegates = getOpsDelegates();
  if (!delegates.tenant?.findMany) {
    return [normalizeTenantId(process.env.TENANT_ID)];
  }

  try {
    const rows = await delegates.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
      take: 200
    });

    const tenants = rows.map((row) => String(row.id || "").trim()).filter(Boolean);
    if (tenants.length > 0) return tenants;
    return [normalizeTenantId(process.env.TENANT_ID)];
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("ops.scheduler.tenants", error);
      return [normalizeTenantId(process.env.TENANT_ID)];
    }
    throw error;
  }
}
