import type { SessionUser } from "@/lib/auth";
import { hasAnyRole } from "@/lib/security/configCapabilities";
import { canAccessConfigOps } from "@/lib/security/configCapabilities";

const SUPERADMIN_ROLES = ["SUPER_ADMIN", "SUPERADMIN"] as const;

export function canAccessOpsHealth(user: SessionUser | null | undefined) {
  return canAccessConfigOps(user);
}

export function canManageOpsResources(user: SessionUser | null | undefined) {
  return canAccessOpsHealth(user);
}

export function canAccessOpsObservability(user: SessionUser | null | undefined) {
  return canAccessOpsHealth(user);
}

export function canExecuteOpsCritical(user: SessionUser | null | undefined) {
  return hasAnyRole(user, SUPERADMIN_ROLES);
}

export function canManageOpsSchedulerConfig(user: SessionUser | null | undefined) {
  return canExecuteOpsCritical(user);
}
