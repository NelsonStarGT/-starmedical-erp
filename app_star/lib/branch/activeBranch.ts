import "server-only";

import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RECEPTION_ACTIVE_BRANCH_COOKIE_NAME } from "@/lib/reception/active-branch";
import { getEffectiveScope, type ActiveBranchOption as ScopeBranchOption } from "@/lib/branch/effectiveScope";

type CookieStoreLike = {
  get(name: string): { value?: string | null } | undefined;
};

export type ActiveBranchOption = ScopeBranchOption;

function cleanValue(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : null;
}

function isCompatError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("unknown field") ||
    message.includes("unknown argument") ||
    message.includes("does not exist") ||
    message.includes("delegate")
  );
}

function warnDev(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[DEV][branch.active] ${context}: ${message}`);
}

async function resolveActiveBranchInternal(user: SessionUser, cookieStore: CookieStoreLike) {
  const scope = await getEffectiveScope({
    user,
    cookieStore
  });

  return {
    branchId: scope.branchId,
    source: scope.branchId ? "preferred" as const : "none" as const,
    activeBranches: scope.selectableBranches,
    canSwitch: scope.canSwitch,
    accessMode: scope.accessMode,
    tenantId: scope.tenantId
  };
}

export async function resolveActiveBranchStrict(user: SessionUser, cookieStore: CookieStoreLike): Promise<string | null> {
  const resolved = await resolveActiveBranchInternal(user, cookieStore);
  return resolved.branchId;
}

export async function resolveActiveBranch(user: SessionUser, cookieStore: CookieStoreLike): Promise<string | null> {
  return resolveActiveBranchStrict(user, cookieStore);
}

export async function listSelectableActiveBranches(user: SessionUser): Promise<ActiveBranchOption[]> {
  const scope = await getEffectiveScope({ user });
  return scope.selectableBranches;
}

export async function persistPreferredActiveBranch(input: { user: SessionUser; branchId: string }) {
  const cleanBranchId = cleanValue(input.branchId);
  if (!cleanBranchId) {
    throw new Error("Sede requerida.");
  }

  const scope = await getEffectiveScope({
    user: input.user,
    requestedBranchId: cleanBranchId
  });

  if (!scope.branchId || !scope.activeBranch) {
    throw new Error("Sucursal no autorizada.");
  }

  await prisma.user.update({
    where: { id: input.user.id },
    data: {
      branchId: scope.branchId,
      tenantId: scope.tenantId
    }
  });

  const prismaClient = prisma as unknown as {
    userBranchAccess?: {
      updateMany: (args: unknown) => Promise<{ count: number }>;
      create: (args: unknown) => Promise<unknown>;
    };
  };

  if (prismaClient.userBranchAccess?.updateMany && prismaClient.userBranchAccess?.create) {
    try {
      if (scope.canSwitch || input.user.branchAccessMode === "SWITCH") {
        await prismaClient.userBranchAccess.updateMany({
          where: {
            userId: input.user.id,
            OR: [{ tenantId: scope.tenantId }, { tenantId: null }]
          },
          data: { isDefault: false }
        });

        const updateResult = await prismaClient.userBranchAccess.updateMany({
          where: {
            userId: input.user.id,
            branchId: scope.branchId,
            OR: [{ tenantId: scope.tenantId }, { tenantId: null }]
          },
          data: {
            isDefault: true,
            accessMode: "SWITCH",
            tenantId: scope.tenantId
          }
        });

        if (updateResult.count === 0) {
          await prismaClient.userBranchAccess.create({
            data: {
              userId: input.user.id,
              branchId: scope.branchId,
              tenantId: scope.tenantId,
              accessMode: "SWITCH",
              isDefault: true
            }
          });
        }
      } else {
        await prismaClient.userBranchAccess.updateMany({
          where: {
            userId: input.user.id,
            branchId: scope.branchId,
            OR: [{ tenantId: scope.tenantId }, { tenantId: null }]
          },
          data: {
            isDefault: true,
            accessMode: "LOCKED",
            tenantId: scope.tenantId
          }
        });
      }
    } catch (error) {
      if (!isCompatError(error)) throw error;
      warnDev("persist.userBranchAccess", error);
    }
  }

  return scope.activeBranch;
}

export function buildActiveBranchCookie(branchId: string) {
  return {
    name: RECEPTION_ACTIVE_BRANCH_COOKIE_NAME,
    value: branchId,
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  };
}

export async function resolveActiveBranchWithMeta(user: SessionUser, cookieStore: CookieStoreLike) {
  return resolveActiveBranchInternal(user, cookieStore);
}
