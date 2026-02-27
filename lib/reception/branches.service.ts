import "server-only";

import type { SessionUser } from "@/lib/auth";
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
  const selectable = await listSelectableActiveBranches(user);
  if (!selectable.some((row) => row.id === branchId)) {
    throw new Error("Sucursal no autorizada.");
  }
}
