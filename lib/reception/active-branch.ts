import "server-only";

import type { SessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export const RECEPTION_ACTIVE_BRANCH_COOKIE_NAME = "sm_reception_active_branch";

type ResolveInput = {
  requestedBranchId?: string | null;
  cookieBranchId?: string | null;
};

export function resolveReceptionBranchId(user: SessionUser, input: ResolveInput): string | null {
  const requested = input.requestedBranchId ?? null;
  const cookieBranchId = input.cookieBranchId ?? null;

  if (requested) {
    if (!isAdmin(user)) {
      if (!user.branchId || requested !== user.branchId) {
        throw new Error("Sucursal no autorizada.");
      }
    }
    return requested;
  }

  if (cookieBranchId) {
    if (!isAdmin(user) && !user.branchId) {
      return null;
    }
    if (user.branchId && cookieBranchId !== user.branchId && !isAdmin(user)) {
      return user.branchId ?? null;
    }
    return cookieBranchId;
  }

  return user.branchId ?? null;
}
