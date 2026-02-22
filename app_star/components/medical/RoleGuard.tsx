import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

function normalizeRole(role: string) {
  return role.trim().toUpperCase().replace(/\s+/g, "_");
}

export default async function RoleGuard({
  children,
  allowRoles,
  requirePermissions,
  redirectTo = "/modulo-medico/dashboard"
}: {
  children: React.ReactNode;
  allowRoles?: string[];
  requirePermissions?: string | string[];
  redirectTo?: string;
}) {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");

  const roleSet = new Set((user.roles || []).map(normalizeRole));
  const allowedRoles =
    allowRoles && allowRoles.length > 0 ? allowRoles.map(normalizeRole).some((r) => roleSet.has(r)) : true;

  const perms = Array.isArray(requirePermissions) ? requirePermissions : requirePermissions ? [requirePermissions] : [];
  const allowedPerms = perms.length > 0 ? perms.every((p) => hasPermission(user, p)) : true;

  if (allowedRoles && allowedPerms) return <>{children}</>;

  redirect(redirectTo);
}
