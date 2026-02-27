import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";
import { isPrismaSchemaMismatchError } from "@/lib/config-central/errors";
import { normalizeTenantId } from "@/lib/tenant";

export const PROCESSING_JOB_TYPES = [
  "excel_export",
  "excel_import",
  "docx_render",
  "pdf_render",
  "image_transform",
  "google_sheets_export",
  "drive_upload"
] as const;

const storageProviderSchema = z.enum(["s3", "gcs", "minio"]);

const retentionMapSchema = z
  .record(z.string(), z.number().int().min(1).max(3650))
  .transform((value) => {
    const output: Record<string, number> = {};
    for (const [key, days] of Object.entries(value)) {
      const normalized = String(key || "").trim().toLowerCase();
      if (!normalized) continue;
      output[normalized] = days;
    }
    return output;
  });

const allowedJobTypesSchema = z
  .array(z.enum(PROCESSING_JOB_TYPES))
  .max(PROCESSING_JOB_TYPES.length)
  .transform((items) => Array.from(new Set(items)));

const nullableTrimmedString = z
  .string()
  .trim()
  .max(240)
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  });

export const tenantProcessingConfigPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    storageProvider: storageProviderSchema.optional(),
    bucket: z.string().trim().min(3).max(128).optional(),
    prefix: z.string().trim().min(1).max(180).optional(),
    retentionDaysByJobType: retentionMapSchema.optional().nullable(),
    maxUploadMB: z.number().int().min(1).max(256).optional(),
    maxRowsExcel: z.number().int().min(1).max(200_000).optional(),
    maxPagesPdf: z.number().int().min(1).max(5_000).optional(),
    timeoutMs: z.number().int().min(1_000).max(300_000).optional(),
    maxConcurrency: z.number().int().min(1).max(32).optional(),
    allowedJobTypes: allowedJobTypesSchema.optional().nullable(),
    notifyOnFailure: z.boolean().optional(),
    // Compatibilidad futura: permitir reset explícito de bucket/prefix.
    clearBucket: z.boolean().optional(),
    clearPrefix: z.boolean().optional(),
    notes: nullableTrimmedString
  })
  .strict();

export type TenantProcessingConfigPatch = z.infer<typeof tenantProcessingConfigPatchSchema>;

export type TenantProcessingConfigSnapshot = {
  tenantId: string;
  enabled: boolean;
  storageProvider: "s3" | "gcs" | "minio";
  bucket: string;
  prefix: string;
  retentionDaysByJobType: Record<string, number>;
  maxUploadMB: number;
  maxRowsExcel: number;
  maxPagesPdf: number;
  timeoutMs: number;
  maxConcurrency: number;
  allowedJobTypes: Array<(typeof PROCESSING_JOB_TYPES)[number]>;
  notifyOnFailure: boolean;
  updatedByUserId: string | null;
  updatedAt: string | null;
  source: "db" | "defaults";
};

export function parseTenantProcessingConfigPatch(input: unknown): TenantProcessingConfigPatch {
  return tenantProcessingConfigPatchSchema.parse(input);
}

export function buildTenantProcessingConfigDefaults(tenantIdInput: unknown): TenantProcessingConfigSnapshot {
  const tenantId = normalizeTenantId(tenantIdInput);
  return {
    tenantId,
    enabled: true,
    storageProvider: "s3",
    bucket: process.env.PROCESSING_STORAGE_BUCKET || "processing-artifacts",
    prefix: "tenants",
    retentionDaysByJobType: {
      excel_export: 30,
      excel_import: 30,
      docx_render: 30,
      pdf_render: 30,
      image_transform: 30
    },
    maxUploadMB: 8,
    maxRowsExcel: 5000,
    maxPagesPdf: 120,
    timeoutMs: 15_000,
    maxConcurrency: 2,
    allowedJobTypes: [...PROCESSING_JOB_TYPES],
    notifyOnFailure: true,
    updatedByUserId: null,
    updatedAt: null,
    source: "defaults"
  };
}

type ProcessingConfigRow = {
  tenantId: string;
  enabled: boolean;
  storageProvider: string;
  bucket: string;
  prefix: string;
  retentionDaysByJobType: unknown;
  maxUploadMB: number;
  maxRowsExcel: number;
  maxPagesPdf: number;
  timeoutMs: number;
  maxConcurrency: number;
  allowedJobTypes: unknown;
  notifyOnFailure: boolean;
  updatedByUserId: string | null;
  updatedAt: Date;
};

function getDelegate() {
  return (prisma as unknown as {
    tenantProcessingConfig?: {
      findUnique?: (args: unknown) => Promise<ProcessingConfigRow | null>;
      upsert?: (args: unknown) => Promise<ProcessingConfigRow>;
    };
  }).tenantProcessingConfig;
}

function normalizeStorageProvider(value: unknown): "s3" | "gcs" | "minio" {
  const parsed = storageProviderSchema.safeParse(String(value || "").trim().toLowerCase());
  return parsed.success ? parsed.data : "s3";
}

function normalizeRetention(value: unknown): Record<string, number> {
  const parsed = retentionMapSchema.safeParse(value && typeof value === "object" ? value : {});
  return parsed.success ? parsed.data : {};
}

function normalizeAllowedJobTypes(value: unknown): Array<(typeof PROCESSING_JOB_TYPES)[number]> {
  if (!Array.isArray(value)) return [...PROCESSING_JOB_TYPES];
  const parsed = allowedJobTypesSchema.safeParse(value);
  if (!parsed.success || parsed.data.length === 0) return [...PROCESSING_JOB_TYPES];
  return parsed.data;
}

function rowToSnapshot(row: ProcessingConfigRow): TenantProcessingConfigSnapshot {
  return {
    tenantId: normalizeTenantId(row.tenantId),
    enabled: row.enabled,
    storageProvider: normalizeStorageProvider(row.storageProvider),
    bucket: String(row.bucket || "processing-artifacts"),
    prefix: String(row.prefix || "tenants"),
    retentionDaysByJobType: normalizeRetention(row.retentionDaysByJobType),
    maxUploadMB: Number(row.maxUploadMB || 8),
    maxRowsExcel: Number(row.maxRowsExcel || 5000),
    maxPagesPdf: Number(row.maxPagesPdf || 120),
    timeoutMs: Number(row.timeoutMs || 15_000),
    maxConcurrency: Number(row.maxConcurrency || 2),
    allowedJobTypes: normalizeAllowedJobTypes(row.allowedJobTypes),
    notifyOnFailure: Boolean(row.notifyOnFailure),
    updatedByUserId: row.updatedByUserId,
    updatedAt: row.updatedAt.toISOString(),
    source: "db"
  };
}

export async function getTenantProcessingConfig(tenantIdInput: unknown): Promise<TenantProcessingConfigSnapshot> {
  const tenantId = normalizeTenantId(tenantIdInput);
  const defaults = buildTenantProcessingConfigDefaults(tenantId);
  const delegate = getDelegate();
  if (!delegate?.findUnique || !delegate?.upsert) {
    return defaults;
  }

  try {
    const row = await delegate.findUnique({ where: { tenantId } });
    if (!row) {
      const created = await delegate.upsert({
        where: { tenantId },
        update: {},
        create: {
          tenantId,
          enabled: defaults.enabled,
          storageProvider: defaults.storageProvider,
          bucket: defaults.bucket,
          prefix: defaults.prefix,
          retentionDaysByJobType: defaults.retentionDaysByJobType,
          maxUploadMB: defaults.maxUploadMB,
          maxRowsExcel: defaults.maxRowsExcel,
          maxPagesPdf: defaults.maxPagesPdf,
          timeoutMs: defaults.timeoutMs,
          maxConcurrency: defaults.maxConcurrency,
          allowedJobTypes: defaults.allowedJobTypes,
          notifyOnFailure: defaults.notifyOnFailure,
          updatedByUserId: null
        }
      });
      return rowToSnapshot(created);
    }

    return rowToSnapshot(row);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("config.tenantProcessing.get", error);
      return defaults;
    }
    if (isPrismaSchemaMismatchError(error)) {
      return defaults;
    }
    throw error;
  }
}

export async function updateTenantProcessingConfig(input: {
  tenantId: unknown;
  patch: TenantProcessingConfigPatch;
  updatedByUserId?: string | null;
}): Promise<TenantProcessingConfigSnapshot> {
  const tenantId = normalizeTenantId(input.tenantId);
  const delegate = getDelegate();
  if (!delegate?.upsert) {
    return buildTenantProcessingConfigDefaults(tenantId);
  }

  const current = await getTenantProcessingConfig(tenantId);
  const nextBucket = input.patch.clearBucket ? buildTenantProcessingConfigDefaults(tenantId).bucket : input.patch.bucket ?? current.bucket;
  const nextPrefix = input.patch.clearPrefix ? "tenants" : input.patch.prefix ?? current.prefix;

  const next = {
    enabled: input.patch.enabled ?? current.enabled,
    storageProvider: input.patch.storageProvider ?? current.storageProvider,
    bucket: nextBucket,
    prefix: nextPrefix,
    retentionDaysByJobType:
      typeof input.patch.retentionDaysByJobType === "undefined"
        ? current.retentionDaysByJobType
        : normalizeRetention(input.patch.retentionDaysByJobType ?? {}),
    maxUploadMB: input.patch.maxUploadMB ?? current.maxUploadMB,
    maxRowsExcel: input.patch.maxRowsExcel ?? current.maxRowsExcel,
    maxPagesPdf: input.patch.maxPagesPdf ?? current.maxPagesPdf,
    timeoutMs: input.patch.timeoutMs ?? current.timeoutMs,
    maxConcurrency: input.patch.maxConcurrency ?? current.maxConcurrency,
    allowedJobTypes:
      typeof input.patch.allowedJobTypes === "undefined"
        ? current.allowedJobTypes
        : normalizeAllowedJobTypes(input.patch.allowedJobTypes ?? []),
    notifyOnFailure: input.patch.notifyOnFailure ?? current.notifyOnFailure
  };

  const row = await delegate.upsert({
    where: { tenantId },
    update: {
      ...next,
      updatedByUserId: input.updatedByUserId ?? null,
      updatedAt: new Date()
    },
    create: {
      tenantId,
      ...next,
      updatedByUserId: input.updatedByUserId ?? null
    }
  });

  return rowToSnapshot(row);
}
