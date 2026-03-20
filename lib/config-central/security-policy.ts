import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ipAllowlistSchema = z
  .array(z.string().trim().min(3).max(64))
  .max(200)
  .transform((list) => Array.from(new Set(list.map((ip) => ip.trim()).filter(Boolean))));

export const tenantSecurityPolicyPatchSchema = z
  .object({
    sessionTimeoutMinutes: z.number().int().min(5).max(24 * 60).optional(),
    enforce2FA: z.boolean().optional(),
    passwordMinLength: z.number().int().min(8).max(128).optional(),
    passwordRequireUppercase: z.boolean().optional(),
    passwordRequireLowercase: z.boolean().optional(),
    passwordRequireNumber: z.boolean().optional(),
    passwordRequireSymbol: z.boolean().optional(),
    ipAllowlist: ipAllowlistSchema.optional().nullable(),
    allowRememberMe: z.boolean().optional(),
    maxLoginAttempts: z.number().int().min(3).max(20).optional(),
    lockoutMinutes: z.number().int().min(1).max(240).optional()
  })
  .strict();

export type TenantSecurityPolicyPatch = z.infer<typeof tenantSecurityPolicyPatchSchema>;

export type TenantSecurityPolicySnapshot = {
  tenantId: string;
  sessionTimeoutMinutes: number;
  enforce2FA: boolean;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  ipAllowlist: string[];
  allowRememberMe: boolean;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  updatedByUserId: string | null;
  updatedAt: string | null;
  source: "db" | "defaults";
};

type PolicyRow = {
  tenantId: string;
  sessionTimeoutMinutes: number;
  enforce2FA: boolean;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  ipAllowlist: unknown;
  allowRememberMe: boolean;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  updatedByUserId: string | null;
  updatedAt: Date;
};

function normalizeTenantId(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || "global";
}

function normalizeIpAllowlistInput(value: unknown): string[] {
  const parsed = ipAllowlistSchema.safeParse(Array.isArray(value) ? value : []);
  return parsed.success ? parsed.data : [];
}

export function buildTenantSecurityPolicyDefaults(tenantIdInput: unknown): TenantSecurityPolicySnapshot {
  const tenantId = normalizeTenantId(tenantIdInput);

  return {
    tenantId,
    sessionTimeoutMinutes: 480,
    enforce2FA: false,
    passwordMinLength: 10,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumber: true,
    passwordRequireSymbol: false,
    ipAllowlist: [],
    allowRememberMe: true,
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
    updatedByUserId: null,
    updatedAt: null,
    source: "defaults"
  };
}

function rowToSnapshot(row: PolicyRow): TenantSecurityPolicySnapshot {
  return {
    tenantId: normalizeTenantId(row.tenantId),
    sessionTimeoutMinutes: row.sessionTimeoutMinutes,
    enforce2FA: row.enforce2FA,
    passwordMinLength: row.passwordMinLength,
    passwordRequireUppercase: row.passwordRequireUppercase,
    passwordRequireLowercase: row.passwordRequireLowercase,
    passwordRequireNumber: row.passwordRequireNumber,
    passwordRequireSymbol: row.passwordRequireSymbol,
    ipAllowlist: normalizeIpAllowlistInput(row.ipAllowlist),
    allowRememberMe: row.allowRememberMe,
    maxLoginAttempts: row.maxLoginAttempts,
    lockoutMinutes: row.lockoutMinutes,
    updatedByUserId: row.updatedByUserId,
    updatedAt: row.updatedAt.toISOString(),
    source: "db"
  };
}

function getDelegate() {
  return (prisma as any).tenantSecurityPolicy as
    | {
        findUnique?: (args: unknown) => Promise<PolicyRow | null>;
        upsert?: (args: unknown) => Promise<PolicyRow>;
      }
    | undefined;
}

export function parseTenantSecurityPolicyPatch(input: unknown): TenantSecurityPolicyPatch {
  return tenantSecurityPolicyPatchSchema.parse(input);
}

export async function getTenantSecurityPolicy(tenantIdInput: unknown): Promise<TenantSecurityPolicySnapshot> {
  const tenantId = normalizeTenantId(tenantIdInput);
  const delegate = getDelegate();

  if (!delegate?.findUnique || !delegate?.upsert) {
    return buildTenantSecurityPolicyDefaults(tenantId);
  }

  try {
    const row = await delegate.findUnique({ where: { tenantId } });
    if (!row) {
      const defaults = buildTenantSecurityPolicyDefaults(tenantId);
      const created = await delegate.upsert({
        where: { tenantId },
        update: {},
        create: {
          tenantId,
          sessionTimeoutMinutes: defaults.sessionTimeoutMinutes,
          enforce2FA: defaults.enforce2FA,
          passwordMinLength: defaults.passwordMinLength,
          passwordRequireUppercase: defaults.passwordRequireUppercase,
          passwordRequireLowercase: defaults.passwordRequireLowercase,
          passwordRequireNumber: defaults.passwordRequireNumber,
          passwordRequireSymbol: defaults.passwordRequireSymbol,
          ipAllowlist: defaults.ipAllowlist,
          allowRememberMe: defaults.allowRememberMe,
          maxLoginAttempts: defaults.maxLoginAttempts,
          lockoutMinutes: defaults.lockoutMinutes,
          updatedByUserId: null
        }
      });
      return rowToSnapshot(created);
    }

    return rowToSnapshot(row);
  } catch (error) {
    console.warn("tenantSecurityPolicy fallback", error);
    return buildTenantSecurityPolicyDefaults(tenantId);
  }
}

export async function updateTenantSecurityPolicy(input: {
  tenantId: unknown;
  patch: TenantSecurityPolicyPatch;
  updatedByUserId?: string | null;
}): Promise<TenantSecurityPolicySnapshot> {
  const tenantId = normalizeTenantId(input.tenantId);
  const delegate = getDelegate();

  if (!delegate?.upsert) {
    return buildTenantSecurityPolicyDefaults(tenantId);
  }

  const current = await getTenantSecurityPolicy(tenantId);
  const row = await delegate.upsert({
    where: { tenantId },
    update: {
      sessionTimeoutMinutes: input.patch.sessionTimeoutMinutes ?? current.sessionTimeoutMinutes,
      enforce2FA: input.patch.enforce2FA ?? current.enforce2FA,
      passwordMinLength: input.patch.passwordMinLength ?? current.passwordMinLength,
      passwordRequireUppercase: input.patch.passwordRequireUppercase ?? current.passwordRequireUppercase,
      passwordRequireLowercase: input.patch.passwordRequireLowercase ?? current.passwordRequireLowercase,
      passwordRequireNumber: input.patch.passwordRequireNumber ?? current.passwordRequireNumber,
      passwordRequireSymbol: input.patch.passwordRequireSymbol ?? current.passwordRequireSymbol,
      ipAllowlist:
        typeof input.patch.ipAllowlist === "undefined"
          ? current.ipAllowlist
          : normalizeIpAllowlistInput(input.patch.ipAllowlist ?? []),
      allowRememberMe: input.patch.allowRememberMe ?? current.allowRememberMe,
      maxLoginAttempts: input.patch.maxLoginAttempts ?? current.maxLoginAttempts,
      lockoutMinutes: input.patch.lockoutMinutes ?? current.lockoutMinutes,
      updatedByUserId: input.updatedByUserId ?? null,
      updatedAt: new Date()
    },
    create: {
      tenantId,
      sessionTimeoutMinutes: input.patch.sessionTimeoutMinutes ?? current.sessionTimeoutMinutes,
      enforce2FA: input.patch.enforce2FA ?? current.enforce2FA,
      passwordMinLength: input.patch.passwordMinLength ?? current.passwordMinLength,
      passwordRequireUppercase: input.patch.passwordRequireUppercase ?? current.passwordRequireUppercase,
      passwordRequireLowercase: input.patch.passwordRequireLowercase ?? current.passwordRequireLowercase,
      passwordRequireNumber: input.patch.passwordRequireNumber ?? current.passwordRequireNumber,
      passwordRequireSymbol: input.patch.passwordRequireSymbol ?? current.passwordRequireSymbol,
      ipAllowlist:
        typeof input.patch.ipAllowlist === "undefined"
          ? current.ipAllowlist
          : normalizeIpAllowlistInput(input.patch.ipAllowlist ?? []),
      allowRememberMe: input.patch.allowRememberMe ?? current.allowRememberMe,
      maxLoginAttempts: input.patch.maxLoginAttempts ?? current.maxLoginAttempts,
      lockoutMinutes: input.patch.lockoutMinutes ?? current.lockoutMinutes,
      updatedByUserId: input.updatedByUserId ?? null
    }
  });

  return rowToSnapshot(row);
}
