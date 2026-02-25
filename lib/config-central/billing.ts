import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeTenantId } from "@/lib/tenant";

const prefixSchema = z
  .string()
  .trim()
  .min(1, "Prefijo requerido")
  .max(24, "Prefijo demasiado largo")
  .regex(/^[A-Z0-9_-]+$/i, "Solo letras, números, guion y guion bajo")
  .transform((value) => value.toUpperCase());

export const billingSeriesCreateSchema = z
  .object({
    legalEntityId: z.string().trim().min(1),
    branchId: z.string().trim().min(1).nullable().optional(),
    name: z.string().trim().min(2).max(120),
    prefix: prefixSchema,
    nextNumber: z.number().int().min(1).max(999_999_999).default(1),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true)
  })
  .strict();

export const billingSeriesPatchSchema = z
  .object({
    legalEntityId: z.string().trim().min(1).optional(),
    branchId: z.string().trim().min(1).nullable().optional(),
    name: z.string().trim().min(2).max(120).optional(),
    prefix: prefixSchema.optional(),
    nextNumber: z.number().int().min(1).max(999_999_999).optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional()
  })
  .strict();

export type BillingSeriesCreateInput = z.infer<typeof billingSeriesCreateSchema>;
export type BillingSeriesPatchInput = z.infer<typeof billingSeriesPatchSchema>;

export type BillingSeriesRuleRow = {
  id?: string;
  legalEntityId: string;
  branchId: string | null;
  name: string;
  prefix: string;
  isDefault: boolean;
  isActive: boolean;
};

export type BillingSeriesRuleViolation = {
  code: "DUPLICATE_NAME" | "DUPLICATE_PREFIX" | "MULTIPLE_ACTIVE_DEFAULTS";
  legalEntityId: string;
  branchId: string | null;
  value: string;
};

export const tenantBillingPreferencePatchSchema = z
  .object({
    defaultLegalEntityId: z.string().trim().min(1).nullable().optional(),
    branchDefaults: z.record(z.string().trim().min(1).nullable()).optional().nullable()
  })
  .strict();

export type TenantBillingPreferencePatch = z.infer<typeof tenantBillingPreferencePatchSchema>;

function normalizeBranchId(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeName(value: string) {
  return value.trim();
}

function normalizeSeriesKey(value: string) {
  return value.trim().toUpperCase();
}

function normalizeScopeKey(legalEntityId: string, branchId: string | null | undefined) {
  return `${legalEntityId}::${branchId || "__ALL__"}`;
}

export function validateBillingSeriesRuleSet(rows: BillingSeriesRuleRow[]): BillingSeriesRuleViolation[] {
  const violations: BillingSeriesRuleViolation[] = [];
  const seenName = new Map<string, string>();
  const seenPrefix = new Map<string, string>();
  const activeDefaultCount = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowId = row.id || `__new_${index}`;
    const scopeKey = normalizeScopeKey(row.legalEntityId, row.branchId);
    const normalizedName = normalizeSeriesKey(row.name);
    const normalizedPrefix = normalizeSeriesKey(row.prefix);

    if (row.isActive && row.isDefault) {
      activeDefaultCount.set(row.legalEntityId, (activeDefaultCount.get(row.legalEntityId) || 0) + 1);
    }

    const nameKey = `${scopeKey}::NAME::${normalizedName}`;
    const existingNameOwner = seenName.get(nameKey);
    if (existingNameOwner && existingNameOwner !== rowId) {
      violations.push({
        code: "DUPLICATE_NAME",
        legalEntityId: row.legalEntityId,
        branchId: row.branchId || null,
        value: row.name
      });
    } else {
      seenName.set(nameKey, rowId);
    }

    const prefixKey = `${scopeKey}::PREFIX::${normalizedPrefix}`;
    const existingPrefixOwner = seenPrefix.get(prefixKey);
    if (existingPrefixOwner && existingPrefixOwner !== rowId) {
      violations.push({
        code: "DUPLICATE_PREFIX",
        legalEntityId: row.legalEntityId,
        branchId: row.branchId || null,
        value: row.prefix
      });
    } else {
      seenPrefix.set(prefixKey, rowId);
    }
  });

  activeDefaultCount.forEach((count, legalEntityId) => {
    if (count > 1) {
      violations.push({
        code: "MULTIPLE_ACTIVE_DEFAULTS",
        legalEntityId,
        branchId: null,
        value: String(count)
      });
    }
  });

  return violations;
}

export function parseBillingSeriesCreate(input: unknown): BillingSeriesCreateInput {
  return billingSeriesCreateSchema.parse(input);
}

export function parseBillingSeriesPatch(input: unknown): BillingSeriesPatchInput {
  return billingSeriesPatchSchema.parse(input);
}

export function parseTenantBillingPreferencePatch(input: unknown): TenantBillingPreferencePatch {
  return tenantBillingPreferencePatchSchema.parse(input);
}

export async function listBillingSeries(input: {
  tenantId: unknown;
  legalEntityId?: string | null;
  branchId?: string | null;
  includeInactive?: boolean;
}) {
  const tenantId = normalizeTenantId(input.tenantId);
  return prisma.billingSeries.findMany({
    where: {
      tenantId,
      ...(input.legalEntityId ? { legalEntityId: input.legalEntityId } : {}),
      ...(input.branchId ? { branchId: input.branchId } : {}),
      ...(input.includeInactive ? {} : { isActive: true })
    },
    orderBy: [{ isDefault: "desc" }, { isActive: "desc" }, { prefix: "asc" }, { createdAt: "asc" }]
  });
}

async function assertLegalEntityBelongsToTenant(tenantId: string, legalEntityId: string) {
  const legalEntity = await prisma.legalEntity.findFirst({
    where: { id: legalEntityId, tenantId },
    select: { id: true, isActive: true }
  });
  if (!legalEntity) {
    throw new Error("LEGAL_ENTITY_NOT_FOUND");
  }
  return legalEntity;
}

async function unsetDefaultSeriesForLegalEntity(tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">, tenantId: string, legalEntityId: string) {
  await tx.billingSeries.updateMany({
    where: {
      tenantId,
      legalEntityId,
      isDefault: true
    },
    data: {
      isDefault: false,
      updatedAt: new Date()
    }
  });
}

export async function createBillingSeries(input: {
  tenantId: unknown;
  payload: BillingSeriesCreateInput;
}) {
  const tenantId = normalizeTenantId(input.tenantId);
  const branchId = normalizeBranchId(input.payload.branchId ?? null);
  const name = normalizeName(input.payload.name);

  await assertLegalEntityBelongsToTenant(tenantId, input.payload.legalEntityId);

  return prisma.$transaction(async (tx) => {
    const existingRows = await tx.billingSeries.findMany({
      where: {
        tenantId,
        legalEntityId: input.payload.legalEntityId
      },
      select: {
        id: true,
        legalEntityId: true,
        branchId: true,
        name: true,
        prefix: true,
        isDefault: true,
        isActive: true
      }
    });

    const duplicateViolation = validateBillingSeriesRuleSet([
      ...existingRows,
      {
        legalEntityId: input.payload.legalEntityId,
        branchId,
        name,
        prefix: input.payload.prefix,
        isDefault: input.payload.isDefault,
        isActive: input.payload.isActive
      }
    ]).find((violation) => violation.code === "DUPLICATE_NAME" || violation.code === "DUPLICATE_PREFIX");

    if (duplicateViolation) {
      throw new Error(duplicateViolation.code);
    }

    if (input.payload.isDefault) {
      await unsetDefaultSeriesForLegalEntity(tx as any, tenantId, input.payload.legalEntityId);
    }

    const created = await tx.billingSeries.create({
      data: {
        tenantId,
        legalEntityId: input.payload.legalEntityId,
        branchId,
        name,
        prefix: input.payload.prefix,
        nextNumber: input.payload.nextNumber,
        isDefault: input.payload.isDefault,
        isActive: input.payload.isActive
      }
    });

    if (!input.payload.isDefault) {
      const defaultCount = await tx.billingSeries.count({
        where: {
          tenantId,
          legalEntityId: input.payload.legalEntityId,
          isDefault: true,
          isActive: true
        }
      });
      if (defaultCount === 0) {
        await tx.billingSeries.update({
          where: { id: created.id },
          data: { isDefault: true }
        });
        return tx.billingSeries.findUniqueOrThrow({ where: { id: created.id } });
      }
    }

    return created;
  });
}

export async function updateBillingSeries(input: {
  tenantId: unknown;
  seriesId: string;
  patch: BillingSeriesPatchInput;
}) {
  const tenantId = normalizeTenantId(input.tenantId);

  return prisma.$transaction(async (tx) => {
    const before = await tx.billingSeries.findFirst({
      where: { id: input.seriesId, tenantId }
    });

    if (!before) {
      throw new Error("SERIES_NOT_FOUND");
    }

    const nextLegalEntityId = input.patch.legalEntityId ?? before.legalEntityId;
    await assertLegalEntityBelongsToTenant(tenantId, nextLegalEntityId);

    const nextBranchId =
      typeof input.patch.branchId === "undefined" ? before.branchId : normalizeBranchId(input.patch.branchId ?? null);
    const nextIsDefault = typeof input.patch.isDefault === "boolean" ? input.patch.isDefault : before.isDefault;
    const nextIsActive = typeof input.patch.isActive === "boolean" ? input.patch.isActive : before.isActive;
    const nextName = typeof input.patch.name === "string" ? normalizeName(input.patch.name) : before.name;
    const nextPrefix = input.patch.prefix ?? before.prefix;

    const siblingRows = await tx.billingSeries.findMany({
      where: {
        tenantId,
        legalEntityId: nextLegalEntityId
      },
      select: {
        id: true,
        legalEntityId: true,
        branchId: true,
        name: true,
        prefix: true,
        isDefault: true,
        isActive: true
      }
    });

    const mergedRows = [
      ...siblingRows.filter((row) => row.id !== before.id),
      {
        id: before.id,
        legalEntityId: nextLegalEntityId,
        branchId: nextBranchId,
        name: nextName,
        prefix: nextPrefix,
        isDefault: nextIsDefault,
        isActive: nextIsActive
      }
    ];

    const duplicateViolation = validateBillingSeriesRuleSet(mergedRows).find(
      (violation) => violation.code === "DUPLICATE_NAME" || violation.code === "DUPLICATE_PREFIX"
    );

    if (duplicateViolation) {
      throw new Error(duplicateViolation.code);
    }

    if (nextIsDefault) {
      await unsetDefaultSeriesForLegalEntity(tx as any, tenantId, nextLegalEntityId);
    }

    const updated = await tx.billingSeries.update({
      where: { id: before.id },
      data: {
        legalEntityId: nextLegalEntityId,
        branchId: nextBranchId,
        name: nextName,
        prefix: nextPrefix,
        nextNumber: input.patch.nextNumber,
        isDefault: nextIsDefault,
        isActive: nextIsActive,
        updatedAt: new Date()
      }
    });

    const activeDefaultCount = await tx.billingSeries.count({
      where: {
        tenantId,
        legalEntityId: updated.legalEntityId,
        isDefault: true,
        isActive: true
      }
    });

    if (activeDefaultCount === 0) {
      await tx.billingSeries.update({
        where: { id: updated.id },
        data: { isDefault: true, isActive: true }
      });
      return tx.billingSeries.findUniqueOrThrow({ where: { id: updated.id } });
    }

    return updated;
  });
}

export async function toggleBillingSeries(input: {
  tenantId: unknown;
  seriesId: string;
  isActive?: boolean;
}) {
  const tenantId = normalizeTenantId(input.tenantId);

  return prisma.$transaction(async (tx) => {
    const before = await tx.billingSeries.findFirst({
      where: { id: input.seriesId, tenantId }
    });
    if (!before) throw new Error("SERIES_NOT_FOUND");

    const nextIsActive = typeof input.isActive === "boolean" ? input.isActive : !before.isActive;
    const updated = await tx.billingSeries.update({
      where: { id: before.id },
      data: {
        isActive: nextIsActive,
        updatedAt: new Date()
      }
    });

    if (!nextIsActive && before.isDefault) {
      const fallback = await tx.billingSeries.findFirst({
        where: {
          tenantId,
          legalEntityId: before.legalEntityId,
          id: { not: before.id },
          isActive: true
        },
        orderBy: [{ createdAt: "asc" }]
      });
      if (fallback) {
        await tx.billingSeries.update({ where: { id: fallback.id }, data: { isDefault: true } });
      }
    }

    if (nextIsActive) {
      const activeDefault = await tx.billingSeries.findFirst({
        where: {
          tenantId,
          legalEntityId: updated.legalEntityId,
          isDefault: true,
          isActive: true
        }
      });
      if (!activeDefault) {
        await tx.billingSeries.update({ where: { id: updated.id }, data: { isDefault: true } });
      }
    }

    return tx.billingSeries.findUniqueOrThrow({ where: { id: updated.id } });
  });
}

export async function deleteBillingSeries(input: { tenantId: unknown; seriesId: string }) {
  const tenantId = normalizeTenantId(input.tenantId);

  return prisma.$transaction(async (tx) => {
    const before = await tx.billingSeries.findFirst({
      where: { id: input.seriesId, tenantId }
    });
    if (!before) throw new Error("SERIES_NOT_FOUND");

    const invoicesCount = await tx.invoice.count({ where: { billingSeriesId: before.id } });
    if (invoicesCount > 0) {
      throw new Error("SERIES_IN_USE");
    }

    await tx.billingSeries.delete({ where: { id: before.id } });

    if (before.isDefault) {
      const fallback = await tx.billingSeries.findFirst({
        where: {
          tenantId,
          legalEntityId: before.legalEntityId,
          isActive: true
        },
        orderBy: [{ createdAt: "asc" }]
      });
      if (fallback) {
        await tx.billingSeries.update({ where: { id: fallback.id }, data: { isDefault: true } });
      }
    }

    return before;
  });
}

export async function getTenantBillingPreference(tenantIdInput: unknown) {
  const tenantId = normalizeTenantId(tenantIdInput);
  const row = await prisma.tenantBillingPreference.findUnique({ where: { tenantId } });
  if (!row) {
    return {
      tenantId,
      defaultLegalEntityId: null,
      branchDefaults: {},
      source: "defaults" as const,
      updatedAt: null
    };
  }

  return {
    tenantId,
    defaultLegalEntityId: row.defaultLegalEntityId,
    branchDefaults: (row.branchDefaults && typeof row.branchDefaults === "object" ? row.branchDefaults : {}) as Record<string, string | null>,
    source: "db" as const,
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function updateTenantBillingPreference(input: {
  tenantId: unknown;
  patch: TenantBillingPreferencePatch;
  updatedByUserId?: string | null;
}) {
  const tenantId = normalizeTenantId(input.tenantId);

  const nextDefault =
    typeof input.patch.defaultLegalEntityId === "undefined"
      ? undefined
      : normalizeBranchId(input.patch.defaultLegalEntityId ?? null);

  if (typeof nextDefault === "string") {
    await assertLegalEntityBelongsToTenant(tenantId, nextDefault);
  }

  const branchDefaultsRaw = input.patch.branchDefaults;
  const branchDefaults =
    typeof branchDefaultsRaw === "undefined"
      ? undefined
      : Object.fromEntries(
          Object.entries(branchDefaultsRaw || {}).map(([branchId, legalEntityId]) => [
            branchId,
            normalizeBranchId(legalEntityId)
          ])
        );

  const saved = await prisma.tenantBillingPreference.upsert({
    where: { tenantId },
    update: {
      ...(typeof nextDefault === "undefined" ? {} : { defaultLegalEntityId: nextDefault }),
      ...(typeof branchDefaults === "undefined" ? {} : { branchDefaults }),
      updatedByUserId: input.updatedByUserId ?? null,
      updatedAt: new Date()
    },
    create: {
      tenantId,
      defaultLegalEntityId: nextDefault ?? null,
      branchDefaults: branchDefaults ?? {},
      updatedByUserId: input.updatedByUserId ?? null
    }
  });

  return {
    tenantId,
    defaultLegalEntityId: saved.defaultLegalEntityId,
    branchDefaults: (saved.branchDefaults && typeof saved.branchDefaults === "object" ? saved.branchDefaults : {}) as Record<
      string,
      string | null
    >,
    source: "db" as const,
    updatedAt: saved.updatedAt.toISOString()
  };
}

export async function allocateBillingSeriesCorrelativo(input: {
  tenantId: unknown;
  seriesId: string;
}) {
  const tenantId = normalizeTenantId(input.tenantId);

  return prisma.$transaction(async (tx) => {
    const series = await tx.billingSeries.findFirst({
      where: {
        id: input.seriesId,
        tenantId,
        isActive: true
      }
    });

    if (!series) {
      throw new Error("SERIES_NOT_FOUND");
    }

    const serialNumber = series.nextNumber;
    await tx.billingSeries.update({
      where: { id: series.id },
      data: {
        nextNumber: { increment: 1 },
        updatedAt: new Date()
      }
    });

    return {
      seriesId: series.id,
      legalEntityId: series.legalEntityId,
      prefix: series.prefix,
      serialNumber
    };
  });
}
