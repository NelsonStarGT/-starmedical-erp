import { ProcessingServiceAuthMode } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeTenantId } from "@/lib/tenant";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";
import { isPrismaSchemaMismatchError } from "@/lib/config-central/errors";

const baseUrlSchema = z
  .string()
  .trim()
  .url("baseUrl inválido")
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    message: "baseUrl debe usar http/https"
  });

const nullableRef = z
  .string()
  .trim()
  .max(180)
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    const cleaned = value.trim();
    return cleaned.length ? cleaned : null;
  });

export const processingServicePatchSchema = z
  .object({
    baseUrl: baseUrlSchema.optional(),
    authMode: z.nativeEnum(ProcessingServiceAuthMode).optional(),
    tokenRef: nullableRef,
    hmacSecretRef: nullableRef,
    enablePdf: z.boolean().optional(),
    enableExcel: z.boolean().optional(),
    enableDocx: z.boolean().optional(),
    enableImages: z.boolean().optional(),
    timeoutMs: z.number().int().min(1000).max(120_000).optional(),
    retryCount: z.number().int().min(0).max(5).optional()
  })
  .strict();

export type ProcessingServicePatch = z.infer<typeof processingServicePatchSchema>;

export type ProcessingServiceConfigSnapshot = {
  tenantId: string;
  baseUrl: string;
  authMode: ProcessingServiceAuthMode;
  tokenRef: string | null;
  hmacSecretRef: string | null;
  enablePdf: boolean;
  enableExcel: boolean;
  enableDocx: boolean;
  enableImages: boolean;
  timeoutMs: number;
  retryCount: number;
  updatedByUserId: string | null;
  updatedAt: string | null;
  source: "db" | "defaults";
};

export function maskSecretRef(value: string | null | undefined) {
  const clean = String(value || "").trim();
  if (!clean) return null;
  if (clean.length <= 8) return "********";
  return `${clean.slice(0, 3)}***${clean.slice(-3)}`;
}

export function parseProcessingServicePatch(input: unknown): ProcessingServicePatch {
  return processingServicePatchSchema.parse(input);
}

export function buildProcessingServiceDefaults(tenantIdInput: unknown): ProcessingServiceConfigSnapshot {
  const tenantId = normalizeTenantId(tenantIdInput);
  return {
    tenantId,
    baseUrl: process.env.PROCESSING_SERVICE_BASE_URL || "http://127.0.0.1:4300",
    authMode: ProcessingServiceAuthMode.TOKEN_HMAC,
    tokenRef: "env:PROCESSING_SERVICE_TOKEN",
    hmacSecretRef: "env:PROCESSING_HMAC_SECRET",
    enablePdf: true,
    enableExcel: true,
    enableDocx: true,
    enableImages: true,
    timeoutMs: 12_000,
    retryCount: 2,
    updatedByUserId: null,
    updatedAt: null,
    source: "defaults"
  };
}

function rowToSnapshot(row: {
  tenantId: string;
  baseUrl: string;
  authMode: ProcessingServiceAuthMode;
  tokenRef: string | null;
  hmacSecretRef: string | null;
  enablePdf: boolean;
  enableExcel: boolean;
  enableDocx: boolean;
  enableImages: boolean;
  timeoutMs: number;
  retryCount: number;
  updatedByUserId: string | null;
  updatedAt: Date;
}): ProcessingServiceConfigSnapshot {
  return {
    tenantId: normalizeTenantId(row.tenantId),
    baseUrl: row.baseUrl,
    authMode: row.authMode,
    tokenRef: row.tokenRef,
    hmacSecretRef: row.hmacSecretRef,
    enablePdf: row.enablePdf,
    enableExcel: row.enableExcel,
    enableDocx: row.enableDocx,
    enableImages: row.enableImages,
    timeoutMs: row.timeoutMs,
    retryCount: row.retryCount,
    updatedByUserId: row.updatedByUserId,
    updatedAt: row.updatedAt.toISOString(),
    source: "db"
  };
}

export async function getProcessingServiceConfig(tenantIdInput: unknown): Promise<ProcessingServiceConfigSnapshot> {
  const tenantId = normalizeTenantId(tenantIdInput);
  const defaults = buildProcessingServiceDefaults(tenantId);

  try {
    const row = await prisma.processingServiceConfig.findUnique({
      where: { tenantId },
      select: {
        tenantId: true,
        baseUrl: true,
        authMode: true,
        tokenRef: true,
        hmacSecretRef: true,
        enablePdf: true,
        enableExcel: true,
        enableDocx: true,
        enableImages: true,
        timeoutMs: true,
        retryCount: true,
        updatedByUserId: true,
        updatedAt: true
      }
    });

    if (!row) {
      const created = await prisma.processingServiceConfig.create({
        data: {
          tenantId,
          baseUrl: defaults.baseUrl,
          authMode: defaults.authMode,
          tokenRef: defaults.tokenRef,
          hmacSecretRef: defaults.hmacSecretRef,
          enablePdf: defaults.enablePdf,
          enableExcel: defaults.enableExcel,
          enableDocx: defaults.enableDocx,
          enableImages: defaults.enableImages,
          timeoutMs: defaults.timeoutMs,
          retryCount: defaults.retryCount
        },
        select: {
          tenantId: true,
          baseUrl: true,
          authMode: true,
          tokenRef: true,
          hmacSecretRef: true,
          enablePdf: true,
          enableExcel: true,
          enableDocx: true,
          enableImages: true,
          timeoutMs: true,
          retryCount: true,
          updatedByUserId: true,
          updatedAt: true
        }
      });

      return rowToSnapshot(created);
    }

    return rowToSnapshot(row);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("config.processingService.get", error);
      return defaults;
    }
    if (isPrismaSchemaMismatchError(error)) {
      return defaults;
    }

    throw error;
  }
}

export async function updateProcessingServiceConfig(input: {
  tenantId: unknown;
  patch: ProcessingServicePatch;
  updatedByUserId?: string | null;
}) {
  const tenantId = normalizeTenantId(input.tenantId);
  const current = await getProcessingServiceConfig(tenantId);

  const saved = await prisma.processingServiceConfig.upsert({
    where: { tenantId },
    update: {
      baseUrl: input.patch.baseUrl ?? current.baseUrl,
      authMode: input.patch.authMode ?? current.authMode,
      tokenRef: typeof input.patch.tokenRef === "undefined" ? current.tokenRef : input.patch.tokenRef,
      hmacSecretRef:
        typeof input.patch.hmacSecretRef === "undefined"
          ? current.hmacSecretRef
          : input.patch.hmacSecretRef,
      enablePdf: input.patch.enablePdf ?? current.enablePdf,
      enableExcel: input.patch.enableExcel ?? current.enableExcel,
      enableDocx: input.patch.enableDocx ?? current.enableDocx,
      enableImages: input.patch.enableImages ?? current.enableImages,
      timeoutMs: input.patch.timeoutMs ?? current.timeoutMs,
      retryCount: input.patch.retryCount ?? current.retryCount,
      updatedByUserId: input.updatedByUserId ?? null,
      updatedAt: new Date()
    },
    create: {
      tenantId,
      baseUrl: input.patch.baseUrl ?? current.baseUrl,
      authMode: input.patch.authMode ?? current.authMode,
      tokenRef: typeof input.patch.tokenRef === "undefined" ? current.tokenRef : input.patch.tokenRef,
      hmacSecretRef:
        typeof input.patch.hmacSecretRef === "undefined"
          ? current.hmacSecretRef
          : input.patch.hmacSecretRef,
      enablePdf: input.patch.enablePdf ?? current.enablePdf,
      enableExcel: input.patch.enableExcel ?? current.enableExcel,
      enableDocx: input.patch.enableDocx ?? current.enableDocx,
      enableImages: input.patch.enableImages ?? current.enableImages,
      timeoutMs: input.patch.timeoutMs ?? current.timeoutMs,
      retryCount: input.patch.retryCount ?? current.retryCount,
      updatedByUserId: input.updatedByUserId ?? null
    },
    select: {
      tenantId: true,
      baseUrl: true,
      authMode: true,
      tokenRef: true,
      hmacSecretRef: true,
      enablePdf: true,
      enableExcel: true,
      enableDocx: true,
      enableImages: true,
      timeoutMs: true,
      retryCount: true,
      updatedByUserId: true,
      updatedAt: true
    }
  });

  return rowToSnapshot(saved);
}
