import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { isPrismaSchemaMismatchError } from "@/lib/config-central/errors";
import { normalizeTenantId } from "@/lib/tenant";

const moduleOrderSchema = z.array(z.string().trim().min(1).max(120)).max(80);

export const tenantNavigationPolicyPatchSchema = z
  .object({
    defaultSidebarCollapsed: z.boolean().optional(),
    forceSidebarCollapsed: z.boolean().optional(),
    moduleOrderingEnabled: z.boolean().optional(),
    moduleOrder: moduleOrderSchema.optional().nullable()
  })
  .strict();

export type TenantNavigationPolicyPatch = z.infer<typeof tenantNavigationPolicyPatchSchema>;

export type TenantNavigationPolicySnapshot = {
  tenantId: string;
  defaultSidebarCollapsed: boolean;
  forceSidebarCollapsed: boolean;
  moduleOrderingEnabled: boolean;
  moduleOrder: string[];
  updatedByUserId: string | null;
  updatedAt: string | null;
  source: "db" | "defaults";
};

export function buildTenantNavigationPolicyDefaults(tenantId: string): TenantNavigationPolicySnapshot {
  return {
    tenantId,
    defaultSidebarCollapsed: false,
    forceSidebarCollapsed: false,
    moduleOrderingEnabled: false,
    moduleOrder: [],
    updatedByUserId: null,
    updatedAt: null,
    source: "defaults"
  };
}

function normalizeModuleOrder(value: unknown): string[] {
  const parsed = moduleOrderSchema.safeParse(Array.isArray(value) ? value : []);
  if (!parsed.success) return [];
  return Array.from(new Set(parsed.data));
}

type PolicyRow = {
  tenantId: string;
  defaultSidebarCollapsed: boolean;
  forceSidebarCollapsed: boolean;
  moduleOrderingEnabled: boolean;
  moduleOrder: unknown;
  updatedByUserId: string | null;
  updatedAt: Date;
};

function getDelegate() {
  return (prisma as unknown as {
    tenantNavigationPolicy?: {
      findUnique?: (args: unknown) => Promise<PolicyRow | null>;
      upsert?: (args: unknown) => Promise<PolicyRow>;
    };
  }).tenantNavigationPolicy;
}

function rowToSnapshot(row: PolicyRow): TenantNavigationPolicySnapshot {
  return {
    tenantId: normalizeTenantId(row.tenantId),
    defaultSidebarCollapsed: row.defaultSidebarCollapsed,
    forceSidebarCollapsed: row.forceSidebarCollapsed,
    moduleOrderingEnabled: row.moduleOrderingEnabled,
    moduleOrder: normalizeModuleOrder(row.moduleOrder),
    updatedByUserId: row.updatedByUserId,
    updatedAt: row.updatedAt.toISOString(),
    source: "db"
  };
}

export function parseTenantNavigationPolicyPatch(input: unknown): TenantNavigationPolicyPatch {
  return tenantNavigationPolicyPatchSchema.parse(input);
}

export async function getTenantNavigationPolicy(tenantIdInput: unknown): Promise<TenantNavigationPolicySnapshot> {
  const tenantId = normalizeTenantId(tenantIdInput);
  const delegate = getDelegate();
  if (!delegate?.findUnique || !delegate?.upsert) {
    return buildTenantNavigationPolicyDefaults(tenantId);
  }

  try {
    const row = await delegate.findUnique({ where: { tenantId } });
    if (!row) {
      const defaults = buildTenantNavigationPolicyDefaults(tenantId);
      const created = await delegate.upsert({
        where: { tenantId },
        update: {},
        create: {
          tenantId,
          defaultSidebarCollapsed: defaults.defaultSidebarCollapsed,
          forceSidebarCollapsed: defaults.forceSidebarCollapsed,
          moduleOrderingEnabled: defaults.moduleOrderingEnabled,
          moduleOrder: defaults.moduleOrder,
          updatedByUserId: null
        }
      });
      return rowToSnapshot(created);
    }
    return rowToSnapshot(row);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("config.navigationPolicy.get", error);
      return buildTenantNavigationPolicyDefaults(tenantId);
    }
    if (isPrismaSchemaMismatchError(error)) {
      return buildTenantNavigationPolicyDefaults(tenantId);
    }
    throw error;
  }
}

export async function updateTenantNavigationPolicy(input: {
  tenantId: unknown;
  patch: TenantNavigationPolicyPatch;
  updatedByUserId?: string | null;
}): Promise<TenantNavigationPolicySnapshot> {
  const tenantId = normalizeTenantId(input.tenantId);
  const delegate = getDelegate();
  if (!delegate?.upsert) {
    return buildTenantNavigationPolicyDefaults(tenantId);
  }

  const current = await getTenantNavigationPolicy(tenantId);
  const row = await delegate.upsert({
    where: { tenantId },
    update: {
      defaultSidebarCollapsed: input.patch.defaultSidebarCollapsed ?? current.defaultSidebarCollapsed,
      forceSidebarCollapsed: input.patch.forceSidebarCollapsed ?? current.forceSidebarCollapsed,
      moduleOrderingEnabled: input.patch.moduleOrderingEnabled ?? current.moduleOrderingEnabled,
      moduleOrder:
        typeof input.patch.moduleOrder === "undefined"
          ? current.moduleOrder
          : normalizeModuleOrder(input.patch.moduleOrder ?? []),
      updatedByUserId: input.updatedByUserId ?? null,
      updatedAt: new Date()
    },
    create: {
      tenantId,
      defaultSidebarCollapsed: input.patch.defaultSidebarCollapsed ?? current.defaultSidebarCollapsed,
      forceSidebarCollapsed: input.patch.forceSidebarCollapsed ?? current.forceSidebarCollapsed,
      moduleOrderingEnabled: input.patch.moduleOrderingEnabled ?? current.moduleOrderingEnabled,
      moduleOrder:
        typeof input.patch.moduleOrder === "undefined"
          ? current.moduleOrder
          : normalizeModuleOrder(input.patch.moduleOrder ?? []),
      updatedByUserId: input.updatedByUserId ?? null
    }
  });

  return rowToSnapshot(row);
}
