import { NextRequest, NextResponse } from "next/server";
import { createLoginResponse, validatePassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { computeUserPermissionProfile } from "@/lib/security/permissionService";
import { isAdmin } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BranchAccessSnapshot = {
  allowedBranchIds: string[];
  branchAccessMode: "LOCKED" | "SWITCH";
  canSwitchBranch: boolean;
  preferredBranchId: string | null;
};

function normalizeText(value: string | null | undefined) {
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

async function loadBranchAccessSnapshot(params: {
  userId: string;
  fallbackBranchId: string | null;
  fallbackIsAdmin: boolean;
  tenantId: string;
}): Promise<BranchAccessSnapshot> {
  const prismaClient = prisma as unknown as {
    userBranchAccess?: {
      findMany: (args: unknown) => Promise<Array<{ branchId: string; isDefault: boolean; accessMode: "LOCKED" | "SWITCH" }>>;
    };
  };

  const activeBranches = await prisma.branch.findMany({
    where: {
      isActive: true,
      OR: [{ tenantId: params.tenantId }, { tenantId: null }]
    },
    orderBy: [{ name: "asc" }],
    select: { id: true }
  });
  const activeIds = new Set(activeBranches.map((row) => row.id));

  let rows: Array<{ branchId: string; isDefault: boolean; accessMode: "LOCKED" | "SWITCH" }> = [];
  if (prismaClient.userBranchAccess?.findMany) {
    try {
      rows = await prismaClient.userBranchAccess.findMany({
        where: {
          userId: params.userId,
          OR: [{ tenantId: params.tenantId }, { tenantId: null }],
          branch: {
            isActive: true,
            OR: [{ tenantId: params.tenantId }, { tenantId: null }]
          }
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: {
          branchId: true,
          isDefault: true,
          accessMode: true
        }
      });
    } catch (error) {
      if (!isCompatError(error)) throw error;
      if (process.env.NODE_ENV !== "production") {
        console.warn("[DEV][login] userBranchAccess compat fallback:", error instanceof Error ? error.message : String(error));
      }
    }
  }

  const allowedBranchIdsFromRows = Array.from(
    new Set(
      rows
        .map((row) => normalizeText(row.branchId))
        .filter((branchId): branchId is string => typeof branchId === "string" && activeIds.has(branchId))
    )
  );
  const defaultFromRows = rows.find((row) => row.isDefault && activeIds.has(row.branchId));

  let allowedBranchIds: string[] = [];
  let branchAccessMode: "LOCKED" | "SWITCH" = rows.some((row) => row.accessMode === "SWITCH") ? "SWITCH" : "LOCKED";

  if (allowedBranchIdsFromRows.length > 0) {
    if (branchAccessMode === "LOCKED") {
      const lockedBranchId =
        normalizeText(defaultFromRows?.branchId)
        ?? normalizeText(params.fallbackBranchId)
        ?? allowedBranchIdsFromRows[0]
        ?? null;
      allowedBranchIds = lockedBranchId ? [lockedBranchId] : [allowedBranchIdsFromRows[0]!];
    } else {
      allowedBranchIds = allowedBranchIdsFromRows;
    }
  } else {
    const fallbackBranchId = normalizeText(params.fallbackBranchId);
    if (fallbackBranchId && activeIds.has(fallbackBranchId)) {
      allowedBranchIds = [fallbackBranchId];
      branchAccessMode = "LOCKED";
    } else if (params.fallbackIsAdmin) {
      allowedBranchIds = activeBranches.map((row) => row.id);
      branchAccessMode = "SWITCH";
    } else if (activeBranches.length > 0) {
      allowedBranchIds = [activeBranches[0]!.id];
      branchAccessMode = "LOCKED";
    }
  }

  const preferredBranchId = normalizeText(defaultFromRows?.branchId) ?? normalizeText(params.fallbackBranchId) ?? allowedBranchIds[0] ?? null;
  const canSwitchBranch = branchAccessMode === "SWITCH" && allowedBranchIds.length > 1;

  return {
    allowedBranchIds,
    branchAccessMode,
    canSwitchBranch,
    preferredBranchId
  };
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        userPermissions: { include: { permission: true } }
      }
    });

    if (!user || !user.isActive) {
      await auditLog({
        action: "LOGIN_FAILED",
        entityType: "SECURITY",
        entityId: "login",
        metadata: { email },
        req: request,
        before: null,
        after: null,
        user: null
      });
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const ok = await validatePassword(password, user.passwordHash);
    if (!ok) {
      await auditLog({
        action: "LOGIN_FAILED",
        entityType: "SECURITY",
        entityId: user.id,
        metadata: { email },
        req: request,
        before: null,
        after: null,
        user: null
      });
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const profile = computeUserPermissionProfile(user);
    const tenantId = normalizeText((user as { tenantId?: string | null }).tenantId) ?? "global";
    const branchAccess = await loadBranchAccessSnapshot({
      userId: user.id,
      fallbackBranchId: user.branchId || null,
      fallbackIsAdmin: isAdmin({ id: user.id, email: user.email, roles: profile.roleNames, permissions: profile.effective }),
      tenantId
    });

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: profile.roleNames,
      permissions: profile.effective,
      deniedPermissions: profile.denies,
      branchId: branchAccess.preferredBranchId,
      tenantId,
      branchAccessMode: branchAccess.branchAccessMode,
      allowedBranchIds: branchAccess.allowedBranchIds,
      canSwitchBranch: branchAccess.canSwitchBranch,
      legalEntityId: null
    };

    await auditLog({
      action: "LOGIN_SUCCESS",
      entityType: "SECURITY",
      entityId: user.id,
      metadata: { email },
      req: request,
      user: sessionUser
    });

    return createLoginResponse(sessionUser);
  } catch (err: any) {
    console.error("login error", err);
    return NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 500 });
  }
}
