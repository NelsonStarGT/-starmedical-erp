import "server-only";

import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeTenantId } from "@/lib/tenant";
import type {
  ListSystemEventLogsInput,
  PrismaSchemaEventLogInput,
  PurgeSystemEventLogInput,
  RecordSystemEventInput,
  ResolveSystemEventDigestInput,
  SystemEventListResult,
  SystemEventLogItem,
  SystemEventSeverity
} from "@/lib/ops/eventLog";

const WRITE_DEDUPE_TTL_MS = 30 * 1000;
const writeDedupMap = new Map<string, number>();

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return String(error ?? "");
}

function isMissingSystemEventLogTableError(error: unknown) {
  if (!error) return false;
  if (typeof error === "object" && error !== null && "code" in error) {
    if ((error as { code?: unknown }).code === "P2021") return true;
  }
  const message = readErrorMessage(error).toLowerCase();
  return (
    (message.includes("relation") || message.includes("table")) &&
    message.includes("systemeventlog") &&
    message.includes("does not exist")
  );
}

function buildDigest(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function buildSystemEventDigest(input: RecordSystemEventInput) {
  const seed = input.digestKey?.trim();
  if (seed) return buildDigest(seed);
  return buildDigest(
    JSON.stringify({
      domain: input.domain,
      eventType: input.eventType,
      severity: input.severity,
      code: input.code ?? null,
      resource: input.resource ?? null,
      messageShort: sanitizeMessage(input.messageShort, 180)
    })
  );
}

function sanitizeMessage(message: string, max = 280) {
  const normalized = message.trim().replace(/\s+/g, " ");
  if (!normalized) return "Evento del sistema";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function resolveEventTenantId(candidate?: string | null) {
  const normalized = normalizeTenantId(candidate ?? process.env.TENANT_ID ?? null);
  return normalized === "global" ? null : normalized;
}

function toInputJsonObject(value: Record<string, unknown> | null | undefined) {
  if (!value) return undefined;
  return value as Prisma.InputJsonObject;
}

function normalizeResolutionNote(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  return normalized.slice(0, 500);
}

function clampRetentionDays(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 30;
  return Math.min(Math.max(Math.trunc(Number(value)), 1), 365);
}

function resolvePrismaSchemaEventType(input: PrismaSchemaEventLogInput) {
  if (input.classification === "REQUIRED") return "PRISMA_SCHEMA_REQUIRED_BLOCKED";
  if (input.issue === "legacy_schema") return "PRISMA_SCHEMA_LEGACY_OPTIONAL";
  return "PRISMA_SCHEMA_FALLBACK_OPTIONAL";
}

function resolvePrismaSchemaSeverity(input: PrismaSchemaEventLogInput): SystemEventSeverity {
  if (input.classification === "REQUIRED") return "ERROR";
  return input.issue === "legacy_schema" ? "WARN" : "WARN";
}

function buildPrismaSchemaMessage(input: PrismaSchemaEventLogInput) {
  if (input.classification === "REQUIRED") {
    return sanitizeMessage(`Dependencia de esquema requerida no disponible en ${input.context}.`);
  }

  if (input.issue === "legacy_schema") {
    return sanitizeMessage(`Fallback por esquema legacy en ${input.context}.`);
  }

  return sanitizeMessage(`Fallback por tabla faltante en ${input.context}.`);
}

async function insertSystemEventLog(input: {
  tenantId?: string | null;
  domain: string;
  eventType: string;
  severity: SystemEventSeverity;
  code?: string | null;
  resource?: string | null;
  messageShort: string;
  digest: string;
  metaJson?: Record<string, unknown> | null;
}) {
  const digest = input.digest.trim();
  if (!digest) return;

  const now = Date.now();
  const last = writeDedupMap.get(digest) ?? 0;
  if (last > 0 && now - last < WRITE_DEDUPE_TTL_MS) return;
  writeDedupMap.set(digest, now);

  try {
    await prisma.systemEventLog.create({
      data: {
        tenantId: resolveEventTenantId(input.tenantId),
        domain: input.domain,
        eventType: input.eventType,
        severity: input.severity,
        code: input.code ?? null,
        resource: input.resource ?? null,
        messageShort: sanitizeMessage(input.messageShort),
        digest,
        ...(input.metaJson ? { metaJson: toInputJsonObject(input.metaJson) } : {})
      }
    });
  } catch (error) {
    if (isMissingSystemEventLogTableError(error)) return;
    if (process.env.NODE_ENV !== "production") {
      console.warn("[DEV][system-event-log.write.failed]", readErrorMessage(error));
    }
  }
}

export async function recordSystemEvent(input: RecordSystemEventInput) {
  await insertSystemEventLog({
    tenantId: input.tenantId,
    domain: input.domain,
    eventType: input.eventType,
    severity: input.severity,
    code: input.code ?? null,
    resource: input.resource ?? null,
    messageShort: input.messageShort,
    digest: buildSystemEventDigest(input),
    metaJson: input.metaJson ?? null
  });
}

export async function recordPrismaSchemaEvent(input: PrismaSchemaEventLogInput) {
  const eventType = resolvePrismaSchemaEventType(input);
  const severity = resolvePrismaSchemaSeverity(input);
  const digest = buildDigest(
    JSON.stringify({
      domain: input.domain,
      context: input.context,
      issue: input.issue,
      classification: input.classification,
      code: input.code ?? null,
      table: input.table ?? null,
      eventType
    })
  );

  await insertSystemEventLog({
    tenantId: input.tenantId,
    domain: input.domain,
    eventType,
    severity,
    code: input.code ?? (input.issue === "missing_table" ? "P2021" : input.issue === "legacy_schema" ? "P2022" : null),
    resource: input.context,
    messageShort: buildPrismaSchemaMessage(input),
    digest,
    metaJson: {
      issue: input.issue,
      classification: input.classification,
      table: input.table ?? null,
      actionHint: input.actionHint ?? null
    }
  });
}

export async function listSystemEventLogs(input: ListSystemEventLogsInput = {}): Promise<SystemEventListResult> {
  const where: Record<string, unknown> = {};
  const normalizedTenantId = input.tenantId ? normalizeTenantId(input.tenantId) : null;

  if (normalizedTenantId) {
    if (input.includeGlobalTenantEvents) {
      where.OR = [{ tenantId: normalizedTenantId }, { tenantId: null }];
    } else {
      where.tenantId = normalizedTenantId;
    }
  }

  if (input.domains?.length) {
    where.domain = { in: input.domains };
  }

  if (input.severities?.length) {
    where.severity = { in: input.severities };
  }

  if (input.eventTypes?.length) {
    where.eventType = { in: input.eventTypes };
  }

  if (input.from || input.to) {
    where.createdAt = {
      ...(input.from ? { gte: input.from } : {}),
      ...(input.to ? { lte: input.to } : {})
    };
  }

  try {
    const rows = await prisma.systemEventLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(input.limit ?? 120, 1), 500),
      select: {
        id: true,
        createdAt: true,
        tenantId: true,
        domain: true,
        eventType: true,
        severity: true,
        code: true,
        resource: true,
        messageShort: true,
        digest: true,
        metaJson: true,
        resolvedAt: true,
        resolvedByUserId: true,
        resolutionNote: true
      }
    });

    return {
      source: "db",
      notice: null,
      items: rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        tenantId: row.tenantId,
        domain: row.domain,
        eventType: row.eventType,
        severity: row.severity as SystemEventSeverity,
        code: row.code,
        resource: row.resource,
        messageShort: row.messageShort,
        digest: row.digest,
        metaJson: row.metaJson && typeof row.metaJson === "object" ? (row.metaJson as Record<string, unknown>) : null,
        resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
        resolvedByUserId: row.resolvedByUserId ?? null,
        resolutionNote: row.resolutionNote ?? null
      }))
    };
  } catch (error) {
    if (isMissingSystemEventLogTableError(error)) {
      return {
        source: "fallback",
        notice: "SystemEventLog no disponible en el schema actual. Ejecuta migraciones para habilitar diagnóstico persistente.",
        items: []
      };
    }

    throw error;
  }
}

export async function resolveSystemEventDigest(input: ResolveSystemEventDigestInput) {
  const digest = input.digest.trim();
  if (!digest) {
    throw new Error("Digest requerido para resolver evento.");
  }

  const where: Record<string, unknown> = { digest };
  const normalizedTenantId = input.tenantId ? normalizeTenantId(input.tenantId) : null;
  if (normalizedTenantId) where.tenantId = normalizedTenantId;
  const normalizedDomain = input.domain?.trim().toLowerCase() || null;
  if (normalizedDomain) where.domain = normalizedDomain;

  const note = normalizeResolutionNote(input.resolutionNote);

  const updated = await prisma.systemEventLog.updateMany({
    where,
    data: input.resolved
      ? {
          resolvedAt: new Date(),
          resolvedByUserId: input.resolvedByUserId ?? null,
          resolutionNote: note
        }
      : {
          resolvedAt: null,
          resolvedByUserId: null,
          resolutionNote: null
        }
  });

  return {
    updatedCount: updated.count,
    resolved: input.resolved
  };
}

export async function purgeSystemEventLogs(input: PurgeSystemEventLogInput = {}) {
  const days = clampRetentionDays(input.olderThanDays);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const normalizedTenantId = input.tenantId ? normalizeTenantId(input.tenantId) : null;
  const where: Record<string, unknown> = {
    createdAt: { lt: cutoff }
  };
  if (normalizedTenantId) where.tenantId = normalizedTenantId;

  const result = await prisma.systemEventLog.deleteMany({ where });
  return {
    deletedCount: result.count,
    cutoffIso: cutoff.toISOString(),
    retentionDays: days
  };
}
