import "server-only";

import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { listSelectableActiveBranches } from "@/lib/branch/activeBranch";

export type ReceptionBranchOption = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

export async function listReceptionBranchOptions(user: SessionUser): Promise<ReceptionBranchOption[]> {
  return listSelectableActiveBranches(user);
}

export async function assertReceptionBranchSelectable(user: SessionUser, branchId: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, isActive: true }
  });

  if (!branch || !branch.isActive) {
    throw new Error("Sede no encontrada o inactiva.");
  }

  if (isAdmin(user)) return;

  const selectable = await listSelectableActiveBranches(user);
  if (!selectable.some((row) => row.id === branchId)) {
    throw new Error("Sucursal no autorizada.");
  }
}
