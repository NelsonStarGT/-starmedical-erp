import AdminShellClient from "./AdminShellClient";
import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import { getSessionUserFromCookies } from "@/lib/auth";
import { resolveReceptionRole } from "@/lib/reception/rbac";
import { canSeePortales } from "@/components/layout/nav";
import { resolveActiveBranchWithMeta } from "@/lib/branch/activeBranch";
import { getTenantThemeConfig } from "@/lib/config-central";

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

function fontFamilyFromKey(key: string) {
  switch (key) {
    case "poppins":
      return "\"Poppins\", \"Inter\", system-ui, sans-serif";
    case "montserrat":
      return "\"Montserrat\", \"Inter\", system-ui, sans-serif";
    case "nunito":
      return "\"Nunito\", \"Inter\", system-ui, sans-serif";
    case "roboto":
      return "\"Roboto\", \"Inter\", system-ui, sans-serif";
    case "inter":
    default:
      return "\"Inter\", \"SF Pro Display\", \"SF Pro Text\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif";
  }
}

function buildThemeStyleVariables(input: Awaited<ReturnType<typeof getTenantThemeConfig>>): CSSProperties {
  return {
    "--brand-primary": input.theme.primary,
    "--brand-secondary": input.theme.secondary,
    "--brand-corporate": input.theme.primary,
    "--brand-accent": input.theme.accent,
    "--brand-soft": "#E8F2FF",
    "--brand-text": input.theme.text,
    "--diagnostics-primary": input.theme.accent,
    "--diagnostics-secondary": input.theme.secondary,
    "--diagnostics-corporate": input.theme.primary,
    "--diagnostics-background": input.theme.bg,
    "--app-bg": input.theme.bg,
    "--app-surface": input.theme.surface,
    "--app-text": input.theme.text,
    "--font-sans": fontFamilyFromKey(input.fontKey)
  } as CSSProperties;
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
  const canAccessReception = Boolean(resolveReceptionRole(user?.roles ?? []));
  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];
  const canAccessMedicalCommissions = hasAnyRole(roles, ["SUPER_ADMIN", "ADMIN"]);
  const canAccessMedicalOperations = hasAnyRole(roles, ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"]);
  const canAccessMedicalConfig = hasPermission(permissions, "SYSTEM:ADMIN") || hasAnyRole(roles, ["SUPER_ADMIN", "ADMIN"]);
  const canAccessPortales = canSeePortales({ roles, permissions });
  const themeConfig = await getTenantThemeConfig().catch(() => null);
  const themeStyle = themeConfig ? buildThemeStyleVariables(themeConfig) : undefined;

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
    >
      {children}
    </AdminShellClient>
  );
}
