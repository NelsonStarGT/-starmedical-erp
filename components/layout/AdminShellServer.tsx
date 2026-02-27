import AdminShellClient from "./AdminShellClient";
import { cookies } from "next/headers";
import { getSessionUserFromCookies } from "@/lib/auth";
import { resolveReceptionRole } from "@/lib/reception/rbac";
import { canAccessRecepcion } from "@/lib/recepcion/rbac";
import { canSeePortales } from "@/components/layout/nav";
import { resolveActiveBranchWithMeta } from "@/lib/branch/activeBranch";
import { getTenantNavigationPolicy, getTenantThemeConfig } from "@/lib/config-central";
import { resolveConfigCapabilities } from "@/lib/security/configCapabilities";
import { tenantIdFromUser } from "@/lib/tenant";
import { buildThemeCssVariables } from "@/lib/theme/utils";

function normalizeRole(role: string) {
  return role.trim().toUpperCase().replace(/\s+/g, "_");
}

function hasAnyRole(roles: string[], allowed: string[]) {
  const roleSet = new Set(roles.map(normalizeRole));
  return allowed.map(normalizeRole).some((role) => roleSet.has(role));
}

function hasPermission(permissions: string[], key: string) {
  const permissionSet = new Set(permissions.map((perm) => perm.toUpperCase()));
  return permissionSet.has(key.toUpperCase());
}

export default async function AdminShellServer({
  children,
  showDevBanner = false
}: {
  children: React.ReactNode;
  showDevBanner?: boolean;
}) {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  const canAccessReception = Boolean(resolveReceptionRole(user?.roles ?? [])) || canAccessRecepcion(user);
  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];
  const canAccessMedicalCommissions = hasAnyRole(roles, ["SUPER_ADMIN", "ADMIN"]);
  const canAccessMedicalOperations = hasAnyRole(roles, ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"]);
  const canAccessMedicalConfig = hasPermission(permissions, "SYSTEM:ADMIN") || hasAnyRole(roles, ["SUPER_ADMIN", "ADMIN"]);
  const canAccessPortales = canSeePortales({ roles, permissions });
  const configCapabilities = resolveConfigCapabilities(user);
  const tenantId = tenantIdFromUser(user);
  const [themeConfig, navigationPolicy] = await Promise.all([
    getTenantThemeConfig(tenantId).catch(() => null),
    getTenantNavigationPolicy(tenantId).catch(() => null)
  ]);
  const themeStyle = themeConfig ? buildThemeCssVariables(themeConfig) : undefined;

  let activeBranchId: string | null = null;
  let activeBranchName: string | null = null;
  let activeBranchOptions: Array<{ id: string; name: string; code: string | null; isActive: boolean }> = [];
  let canSwitchActiveBranch = false;
  if (user) {
    try {
      const resolved = await resolveActiveBranchWithMeta(user, cookieStore);
      activeBranchId = resolved.branchId;
      activeBranchOptions = resolved.activeBranches;
      canSwitchActiveBranch = resolved.canSwitch;
    } catch {
      activeBranchId = null;
      activeBranchOptions = [];
      canSwitchActiveBranch = false;
    }
  }

  if (activeBranchId) {
    const selected = activeBranchOptions.find((branch) => branch.id === activeBranchId);
    activeBranchName = selected?.name ?? activeBranchId;
  }

  return (
    <AdminShellClient
      showDevBanner={showDevBanner}
      themeStyle={themeStyle}
      activeBranchId={activeBranchId}
      activeBranchName={activeBranchName}
      activeBranchOptions={activeBranchOptions}
      canSwitchActiveBranch={canSwitchActiveBranch}
      canAccessReception={canAccessReception}
      canAccessMedicalCommissions={canAccessMedicalCommissions}
      canAccessMedicalOperations={canAccessMedicalOperations}
      canAccessMedicalConfig={canAccessMedicalConfig}
      canAccessPortales={canAccessPortales}
      canAccessConfigOps={configCapabilities.canAccessConfigOps}
      canAccessConfigProcessing={configCapabilities.canViewConfigProcessing}
      defaultDensityMode={themeConfig?.densityDefault}
      tenantNavigationPolicy={
        navigationPolicy
          ? {
              defaultSidebarCollapsed: navigationPolicy.defaultSidebarCollapsed,
              forceSidebarCollapsed: navigationPolicy.forceSidebarCollapsed,
              moduleOrderingEnabled: navigationPolicy.moduleOrderingEnabled,
              moduleOrder: navigationPolicy.moduleOrder
            }
          : undefined
      }
    >
      {children}
    </AdminShellClient>
  );
}
