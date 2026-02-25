export type ConfigCapability =
  | "CONFIG_OPS_VIEW"
  | "CONFIG_PROCESSING_VIEW"
  | "CONFIG_PROCESSING_WRITE";

export type ConfigAccessUser = {
  roles?: string[] | null;
  permissions?: string[] | null;
  deniedPermissions?: string[] | null;
};

type CapabilityPolicy = {
  roles: readonly string[];
  permissions: readonly string[];
};

const CAPABILITY_POLICIES: Record<ConfigCapability, CapabilityPolicy> = {
  CONFIG_OPS_VIEW: {
    roles: ["SUPER_ADMIN", "SUPERADMIN", "OPS"],
    permissions: []
  },
  CONFIG_PROCESSING_VIEW: {
    roles: ["SUPER_ADMIN", "SUPERADMIN", "OPS", "TENANT_ADMIN"],
    permissions: ["CONFIG_SERVICES_READ"]
  },
  CONFIG_PROCESSING_WRITE: {
    roles: ["SUPER_ADMIN", "SUPERADMIN", "OPS"],
    permissions: ["CONFIG_SERVICES_WRITE"]
  }
};

function normalizeToken(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function normalizedRoleSet(user: ConfigAccessUser | null | undefined) {
  return new Set((user?.roles || []).map((role) => normalizeToken(role)).filter(Boolean));
}

function normalizedPermissionSet(user: ConfigAccessUser | null | undefined) {
  return new Set((user?.permissions || []).map((permission) => String(permission || "").trim().toUpperCase()));
}

function normalizedDeniedSet(user: ConfigAccessUser | null | undefined) {
  return new Set((user?.deniedPermissions || []).map((permission) => String(permission || "").trim().toUpperCase()));
}

export function hasAnyRole(
  user: ConfigAccessUser | null | undefined,
  allowedRoles: readonly string[]
): boolean {
  if (!user) return false;
  const roles = normalizedRoleSet(user);
  return allowedRoles.some((role) => roles.has(normalizeToken(role)));
}

export function hasAnyPermission(
  user: ConfigAccessUser | null | undefined,
  allowedPermissions: readonly string[]
): boolean {
  if (!user) return false;
  const allowed = normalizedPermissionSet(user);
  const denied = normalizedDeniedSet(user);

  return allowedPermissions.some((permission) => {
    const normalized = String(permission || "").trim().toUpperCase();
    if (!normalized) return false;
    if (denied.has(normalized)) return false;
    return allowed.has(normalized);
  });
}

export function hasConfigCapability(
  user: ConfigAccessUser | null | undefined,
  capability: ConfigCapability
): boolean {
  if (!user) return false;
  const policy = CAPABILITY_POLICIES[capability];
  if (!policy) return false;
  return hasAnyRole(user, policy.roles) || hasAnyPermission(user, policy.permissions);
}

export function canAccessConfigOps(user: ConfigAccessUser | null | undefined) {
  return hasConfigCapability(user, "CONFIG_OPS_VIEW");
}

export function canViewConfigProcessing(user: ConfigAccessUser | null | undefined) {
  return hasConfigCapability(user, "CONFIG_PROCESSING_VIEW");
}

export function canWriteConfigProcessing(user: ConfigAccessUser | null | undefined) {
  return hasConfigCapability(user, "CONFIG_PROCESSING_WRITE");
}

export function resolveConfigCapabilities(user: ConfigAccessUser | null | undefined) {
  return {
    canAccessConfigOps: canAccessConfigOps(user),
    canViewConfigProcessing: canViewConfigProcessing(user),
    canWriteConfigProcessing: canWriteConfigProcessing(user)
  };
}
