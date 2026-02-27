import "server-only";

import type { SessionUser } from "@/lib/auth";

export const RECEPTION_ACTIVE_BRANCH_COOKIE_NAME = "sm_reception_active_branch";

type ResolveInput = {
  requestedBranchId?: string | null;
  cookieBranchId?: string | null;
};

export function resolveReceptionBranchId(user: SessionUser, input: ResolveInput): string | null {
  const requested = input.requestedBranchId ?? null;
  const cookieBranchId = input.cookieBranchId ?? null;
  const allowedBranchIds = Array.from(
    new Set([...(user.allowedBranchIds ?? []), user.branchId].filter((value): value is string => Boolean(value?.trim())))
  );
  const allowed = new Set(allowedBranchIds);

  if (requested) {
    if (allowed.size === 0 || !allowed.has(requested)) {
      throw new Error("Sucursal no autorizada.");
    }
    return requested;
  }

  if (cookieBranchId) {
    if (allowed.size && allowed.has(cookieBranchId)) return cookieBranchId;
    return user.branchId ?? null;
  }

  return user.branchId ?? null;
}
