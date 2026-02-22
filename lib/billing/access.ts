import type { SessionUser } from "@/lib/auth";
import { hasPermission, normalizeRoleName } from "@/lib/rbac";

const BILLING_ALLOWED_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "RECEPTION", "FINANCE"]);
const BILLING_SUPERVISOR_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "SUPERVISOR"]);

export function canAccessBillingActions(user: SessionUser | null) {
  if (!user) return false;
  const roles = (user.roles || []).map(normalizeRoleName);
  if (roles.some((role) => BILLING_ALLOWED_ROLES.has(role))) return true;
  if (hasPermission(user, "SYSTEM:ADMIN")) return true;
  return false;
}

export function canRunBillingSupervisorActions(user: SessionUser | null) {
  if (!user) return false;
  const roles = (user.roles || []).map(normalizeRoleName);
  if (roles.some((role) => BILLING_SUPERVISOR_ROLES.has(role))) return true;
  if (hasPermission(user, "USERS:ADMIN") || hasPermission(user, "SYSTEM:ADMIN")) return true;
  return false;
}
