import "server-only";

import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { RECEPTION_ACTIVE_BRANCH_COOKIE_NAME } from "@/lib/reception/active-branch";
import { isRequestedBranchAllowed, resolveEffectiveBranchId } from "@/lib/branch/scopeRules";

type CookieStoreLike = {
  get(name: string): { value?: string | null } | undefined;
};

export type BranchAccessModeLike = "LOCKED" | "SWITCH";

export type EffectiveScopeBranchOption = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

export type ActiveBranchOption = EffectiveScopeBranchOption;

export type EffectiveScope = {
  tenantId: string;
  branchId: string | null;
  activeBranch: EffectiveScopeBranchOption | null;
  allowedBranchIds: string[];
  selectableBranches: EffectiveScopeBranchOption[];
  accessMode: BranchAccessModeLike;
  canSwitch: boolean;
};

type UserBranchAccessRow = {
  branchId: string;
  accessMode: BranchAccessModeLike;
  isDefault: boolean;
  branch: EffectiveScopeBranchOption | null;
};

function clean(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : null;
}

function unique(values: Array<string | null | undefined>) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = clean(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function isCompatError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("unknown field") ||
    message.includes("unknown argument") ||
    message.includes("does not exist") ||
    message.includes("table") ||
    message.includes("delegate")
  );
}

function warnDev(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[DEV][branch.scope] ${context}: ${message}`);
}

async function listActiveBranchesByTenant(tenantId: string) {
  return prisma.branch.findMany({
    where: {
      isActive: true,
      OR: [{ tenantId }, { tenantId: null }]
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true
    }
  }) as Promise<EffectiveScopeBranchOption[]>;
}

async function listUserBranchAccessRows(userId: string, tenantId: string): Promise<UserBranchAccessRow[]> {
  const prismaClient = prisma as unknown as {
    userBranchAccess?: {
      findMany: (args: unknown) => Promise<UserBranchAccessRow[]>;
    };
  };

  if (!prismaClient.userBranchAccess?.findMany) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[DEV][branch.scope] Prisma delegate missing: userBranchAccess");
    }
    return [];
  }

  try {
    return await prismaClient.userBranchAccess.findMany({
      where: {
        userId,
        OR: [{ tenantId }, { tenantId: null }],
        branch: {
          isActive: true,
          OR: [{ tenantId }, { tenantId: null }]
        }
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        branchId: true,
        accessMode: true,
        isDefault: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true
          }
        }
      }
    });
  } catch (error) {
    if (isCompatError(error)) {
      warnDev("userBranchAccess.findMany", error);
      return [];
    }
    throw error;
  }
}

export async function getEffectiveScope(input: {
  user: SessionUser;
  cookieStore?: CookieStoreLike;
  requestedBranchId?: string | null;
}): Promise<EffectiveScope> {
  const tenantId = clean(input.user.tenantId) ?? "global";
  const requestedBranchId = clean(input.requestedBranchId);
  const sessionBranchId = clean(input.user.branchId);
  const cookieBranchId = clean(input.cookieStore?.get(RECEPTION_ACTIVE_BRANCH_COOKIE_NAME)?.value ?? null);
  const adminUser = isAdmin(input.user);

  const [activeBranches, accessRows] = await Promise.all([
    listActiveBranchesByTenant(tenantId),
    listUserBranchAccessRows(input.user.id, tenantId)
  ]);

  const activeById = new Map(activeBranches.map((row) => [row.id, row]));
  const allowedFromRows = unique(accessRows.map((row) => row.branchId)).filter((branchId) => activeById.has(branchId));
  const rowWithDefault = accessRows.find((row) => row.isDefault && row.branch && activeById.has(row.branch.id));

  let accessMode: BranchAccessModeLike = "LOCKED";
  if (accessRows.some((row) => row.accessMode === "SWITCH")) {
    accessMode = "SWITCH";
  }

  let allowedBranchIds: string[] = [];
  if (allowedFromRows.length > 0) {
    if (accessMode === "LOCKED") {
      const lockedBranchId = clean(rowWithDefault?.branchId) ?? sessionBranchId ?? allowedFromRows[0] ?? null;
      allowedBranchIds = lockedBranchId ? [lockedBranchId] : [allowedFromRows[0]!];
    } else {
      allowedBranchIds = allowedFromRows;
    }
  } else if (sessionBranchId && activeById.has(sessionBranchId)) {
    allowedBranchIds = [sessionBranchId];
  } else if (adminUser) {
    allowedBranchIds = activeBranches.map((row) => row.id);
    accessMode = "SWITCH";
  } else if (activeBranches.length > 0) {
    allowedBranchIds = [activeBranches[0]!.id];
    accessMode = "LOCKED";
  }

  if (adminUser && accessRows.length === 0) {
    accessMode = "SWITCH";
  }

  if (requestedBranchId && !isRequestedBranchAllowed(requestedBranchId, allowedBranchIds)) {
    throw new Error("Sucursal no autorizada.");
  }

  const preferredBranchId = clean(rowWithDefault?.branchId) ?? sessionBranchId;
  const fallbackBranchId = allowedBranchIds[0] ?? null;

  const resolvedBranchId = requestedBranchId
    ?? resolveEffectiveBranchId({
      allowedBranchIds,
      preferredBranchId,
      cookieBranchId,
      sessionBranchId,
      fallbackBranchId
    });

  const selectableBranches = activeBranches.filter((branch) => allowedBranchIds.includes(branch.id));
  const activeBranch = resolvedBranchId ? activeById.get(resolvedBranchId) ?? null : null;
  const canSwitch = accessMode === "SWITCH" && selectableBranches.length > 1;

  return {
    tenantId,
    branchId: resolvedBranchId,
    activeBranch,
    allowedBranchIds,
    selectableBranches,
    accessMode,
    canSwitch
  };
}
