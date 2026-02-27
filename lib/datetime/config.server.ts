import "server-only";

import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";
import { isPrismaSchemaMismatchError } from "@/lib/config-central/errors";
import { normalizeTenantId } from "@/lib/tenant";
import {
  buildTenantDateTimeConfigDefaults,
  normalizeDateFormat,
  normalizeTenantDateTimeConfig,
  normalizeTimeFormat,
  normalizeTimezone,
  normalizeWeekStartsOn,
  type DateFormat,
  type TenantDateTimeConfig,
  type TenantDateTimeConfigSnapshot,
  type TimeFormat,
  type WeekStartsOn
} from "@/lib/datetime/types";
import { type TenantDateTimeConfigPatch } from "@/lib/datetime/config";

type DateTimeConfigRow = {
  tenantId: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  timezone: string;
  weekStartsOn: WeekStartsOn;
  updatedByUserId: string | null;
  updatedAt: Date;
};

const tenantDateTimeCache = new Map<string, TenantDateTimeConfigSnapshot>();

function getDelegate() {
  return (prisma as unknown as {
    tenantDateTimeConfig?: {
      findUnique?: (args: unknown) => Promise<DateTimeConfigRow | null>;
      create?: (args: unknown) => Promise<DateTimeConfigRow>;
      upsert?: (args: unknown) => Promise<DateTimeConfigRow>;
    };
  }).tenantDateTimeConfig;
}

function rowToSnapshot(row: DateTimeConfigRow): TenantDateTimeConfigSnapshot {
  const normalized = normalizeTenantDateTimeConfig({
    dateFormat: row.dateFormat,
    timeFormat: row.timeFormat,
    timezone: row.timezone,
    weekStartsOn: row.weekStartsOn
  });

  return {
    tenantId: normalizeTenantId(row.tenantId),
    ...normalized,
    updatedByUserId: row.updatedByUserId,
    updatedAt: row.updatedAt.toISOString(),
    source: "db"
  };
}

function cacheSnapshot(snapshot: TenantDateTimeConfigSnapshot) {
  tenantDateTimeCache.set(snapshot.tenantId, snapshot);
  return snapshot;
}

export function clearTenantDateTimeConfigCache(tenantIdInput?: unknown) {
  if (typeof tenantIdInput === "undefined") {
    tenantDateTimeCache.clear();
    return;
  }
  tenantDateTimeCache.delete(normalizeTenantId(tenantIdInput));
}

export async function getTenantDateTimeConfig(tenantIdInput: unknown): Promise<TenantDateTimeConfigSnapshot> {
  const tenantId = normalizeTenantId(tenantIdInput);
  const cached = tenantDateTimeCache.get(tenantId);
  if (cached) return cached;

  const delegate = getDelegate();
  if (!delegate?.findUnique || !delegate?.create) {
    return cacheSnapshot(buildTenantDateTimeConfigDefaults(tenantId));
  }

  try {
    const row = await delegate.findUnique({
      where: { tenantId },
      select: {
        tenantId: true,
        dateFormat: true,
        timeFormat: true,
        timezone: true,
        weekStartsOn: true,
        updatedByUserId: true,
        updatedAt: true
      }
    });

    if (row) return cacheSnapshot(rowToSnapshot(row));

    const defaults = buildTenantDateTimeConfigDefaults(tenantId);
    const created = await delegate.create({
      data: {
        tenantId,
        dateFormat: defaults.dateFormat,
        timeFormat: defaults.timeFormat,
        timezone: defaults.timezone,
        weekStartsOn: defaults.weekStartsOn,
        updatedByUserId: null
      },
      select: {
        tenantId: true,
        dateFormat: true,
        timeFormat: true,
        timezone: true,
        weekStartsOn: true,
        updatedByUserId: true,
        updatedAt: true
      }
    });

    return cacheSnapshot(rowToSnapshot(created));
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("config.datetime.get", error);
      return cacheSnapshot(buildTenantDateTimeConfigDefaults(tenantId));
    }
    if (isPrismaSchemaMismatchError(error)) {
      return cacheSnapshot(buildTenantDateTimeConfigDefaults(tenantId));
    }
    throw error;
  }
}

function mergeConfig(
  current: TenantDateTimeConfig,
  patch: TenantDateTimeConfigPatch
): TenantDateTimeConfig {
  return {
    dateFormat: typeof patch.dateFormat === "undefined" ? current.dateFormat : normalizeDateFormat(patch.dateFormat),
    timeFormat: typeof patch.timeFormat === "undefined" ? current.timeFormat : normalizeTimeFormat(patch.timeFormat),
    timezone: typeof patch.timezone === "undefined" ? current.timezone : normalizeTimezone(patch.timezone),
    weekStartsOn: typeof patch.weekStartsOn === "undefined" ? current.weekStartsOn : normalizeWeekStartsOn(patch.weekStartsOn)
  };
}

export async function updateTenantDateTimeConfig(input: {
  tenantId: unknown;
  patch: TenantDateTimeConfigPatch;
  updatedByUserId?: string | null;
}): Promise<TenantDateTimeConfigSnapshot> {
  const tenantId = normalizeTenantId(input.tenantId);
  const delegate = getDelegate();
  if (!delegate?.upsert) {
    return buildTenantDateTimeConfigDefaults(tenantId);
  }

  const currentSnapshot = await getTenantDateTimeConfig(tenantId);
  const next = mergeConfig(
    {
      dateFormat: currentSnapshot.dateFormat,
      timeFormat: currentSnapshot.timeFormat,
      timezone: currentSnapshot.timezone,
      weekStartsOn: currentSnapshot.weekStartsOn
    },
    input.patch
  );

  const row = await delegate.upsert({
    where: { tenantId },
    update: {
      dateFormat: next.dateFormat,
      timeFormat: next.timeFormat,
      timezone: next.timezone,
      weekStartsOn: next.weekStartsOn,
      updatedByUserId: input.updatedByUserId ?? null,
      updatedAt: new Date()
    },
    create: {
      tenantId,
      dateFormat: next.dateFormat,
      timeFormat: next.timeFormat,
      timezone: next.timezone,
      weekStartsOn: next.weekStartsOn,
      updatedByUserId: input.updatedByUserId ?? null
    },
    select: {
      tenantId: true,
      dateFormat: true,
      timeFormat: true,
      timezone: true,
      weekStartsOn: true,
      updatedByUserId: true,
      updatedAt: true
    }
  });

  return cacheSnapshot(rowToSnapshot(row));
}
