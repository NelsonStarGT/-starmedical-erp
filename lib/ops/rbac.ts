import type { SessionUser } from "@/lib/auth";
import { normalizeRoleName } from "@/lib/rbac";

const SUPERADMIN_ROLES = new Set(["SUPER_ADMIN", "SUPERADMIN"]);
const OPS_ALLOWED_ROLES = new Set(["SUPER_ADMIN", "OPS", "SUPERADMIN"]);

function normalizeRoles(user: SessionUser | null | undefined) {
  return (user?.roles || []).map((role) => normalizeRoleName(role));
}

export function canAccessOpsHealth(user: SessionUser | null | undefined) {
  if (!user) return false;
  const roles = normalizeRoles(user);
  return roles.some((role) => OPS_ALLOWED_ROLES.has(role));
}

export function canManageOpsResources(user: SessionUser | null | undefined) {
  return canAccessOpsHealth(user);
}

export function canAccessOpsObservability(user: SessionUser | null | undefined) {
  return canAccessOpsHealth(user);
}

export function canExecuteOpsCritical(user: SessionUser | null | undefined) {
  if (!user) return false;
  const roles = normalizeRoles(user);
  return roles.some((role) => SUPERADMIN_ROLES.has(role));
}

export function canManageOpsSchedulerConfig(user: SessionUser | null | undefined) {
  return canExecuteOpsCritical(user);
}
