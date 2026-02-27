import type { SessionUser } from "@/lib/auth";
import { hasPermission, normalizeRoleName } from "@/lib/rbac";
import {
  RECEPCION_CAPABILITIES,
  RECEPCION_CAPABILITIES_BY_ROLE,
  type RecepcionCapability,
  type RecepcionSuggestedRole
} from "@/lib/recepcion/permissions";

const ROLE_ALIASES: Record<string, RecepcionSuggestedRole> = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "SUPER_ADMIN",
  OPS: "OPS",
  TENANT_ADMIN: "TENANT_ADMIN",
  RECEPTIONIST: "RECEPTIONIST",
  RECEPTION: "RECEPTIONIST",
  RECEPTION_OPERATOR: "RECEPTIONIST",
  RECEPTION_SUPERVISOR: "RECEPTIONIST",
  RECEPTION_ADMIN: "TENANT_ADMIN",
  SECRETARY: "RECEPTIONIST",
  CASHIER: "CASHIER",
  FINANCE: "CASHIER"
};

const LEGACY_PERMISSION_MAP: Partial<Record<string, RecepcionCapability>> = {
  RECEPTION_DASHBOARD_VIEW: "RECEPTION_VIEW",
  RECEPTION_QUEUE_VIEW: "RECEPTION_QUEUE_VIEW",
  RECEPTION_QUEUE_WRITE: "RECEPTION_QUEUE_WRITE",
  RECEPTION_APPOINTMENTS_VIEW: "RECEPTION_APPOINTMENTS_VIEW",
  RECEPTION_APPOINTMENTS_WRITE: "RECEPTION_APPOINTMENTS_WRITE",
  RECEPTION_ADMISSIONS_VIEW: "RECEPTION_ADMISSIONS_VIEW",
  RECEPTION_ADMISSIONS_WRITE: "RECEPTION_ADMISSIONS_WRITE",
  RECEPTION_CASHIER_VIEW: "RECEPTION_CASHIER_VIEW",
  RECEPTION_CASHIER_WRITE: "RECEPTION_CASHIER_WRITE",
  RECEPTION_REGISTRATIONS_VIEW: "RECEPTION_REGISTRATIONS_VIEW",
  RECEPTION_REGISTRATIONS_WRITE: "RECEPTION_REGISTRATIONS_WRITE"
};

function orderedCapabilities(values: Set<RecepcionCapability>) {
  return RECEPCION_CAPABILITIES.filter((capability) => values.has(capability));
}

function normalizePermission(permission?: string | null) {
  return String(permission || "").trim().toUpperCase();
}

export function resolveRecepcionRoleAliases(roles?: Array<string | null | undefined>) {
  const normalizedRoles = Array.from(new Set((roles || []).map((role) => normalizeRoleName(role)).filter(Boolean)));
  return normalizedRoles.map((role) => ROLE_ALIASES[role]).filter((role): role is RecepcionSuggestedRole => Boolean(role));
}

export function resolveRecepcionCapabilities(user: SessionUser | null | undefined): RecepcionCapability[] {
  if (!user) return [];

  const granted = new Set<RecepcionCapability>();
  const denied = new Set((user.deniedPermissions || []).map((permission) => normalizePermission(permission)));

  const aliasedRoles = resolveRecepcionRoleAliases(user.roles);
  for (const role of aliasedRoles) {
    for (const capability of RECEPCION_CAPABILITIES_BY_ROLE[role] || []) {
      granted.add(capability);
    }
  }

  for (const capability of RECEPCION_CAPABILITIES) {
    if (hasPermission(user, capability)) {
      granted.add(capability);
    }
  }

  for (const rawPermission of user.permissions || []) {
    const permission = normalizePermission(rawPermission);
    const mapped = LEGACY_PERMISSION_MAP[permission];
    if (mapped) granted.add(mapped);
  }

  for (const deniedPermission of denied) {
    if (RECEPCION_CAPABILITIES.includes(deniedPermission as RecepcionCapability)) {
      granted.delete(deniedPermission as RecepcionCapability);
    }
  }

  if (granted.size > 0) granted.add("RECEPTION_VIEW");
  return orderedCapabilities(granted);
}

export function hasRecepcionCapability(user: SessionUser | null | undefined, capability: RecepcionCapability) {
  return resolveRecepcionCapabilities(user).includes(capability);
}

export type RecepcionAccess = {
  capabilities: RecepcionCapability[];
  canViewModule: boolean;
  canViewQueue: boolean;
  canWriteQueue: boolean;
  canViewAppointments: boolean;
  canWriteAppointments: boolean;
  canViewAdmissions: boolean;
  canWriteAdmissions: boolean;
  canViewCashier: boolean;
  canWriteCashier: boolean;
  canViewRegistrations: boolean;
  canWriteRegistrations: boolean;
};

export function buildRecepcionAccess(user: SessionUser | null | undefined): RecepcionAccess {
  const capabilities = resolveRecepcionCapabilities(user);
  const capabilitySet = new Set(capabilities);

  return {
    capabilities,
    canViewModule: capabilitySet.has("RECEPTION_VIEW"),
    canViewQueue: capabilitySet.has("RECEPTION_QUEUE_VIEW"),
    canWriteQueue: capabilitySet.has("RECEPTION_QUEUE_WRITE"),
    canViewAppointments: capabilitySet.has("RECEPTION_APPOINTMENTS_VIEW"),
    canWriteAppointments: capabilitySet.has("RECEPTION_APPOINTMENTS_WRITE"),
    canViewAdmissions: capabilitySet.has("RECEPTION_ADMISSIONS_VIEW"),
    canWriteAdmissions: capabilitySet.has("RECEPTION_ADMISSIONS_WRITE"),
    canViewCashier: capabilitySet.has("RECEPTION_CASHIER_VIEW"),
    canWriteCashier: capabilitySet.has("RECEPTION_CASHIER_WRITE"),
    canViewRegistrations: capabilitySet.has("RECEPTION_REGISTRATIONS_VIEW"),
    canWriteRegistrations: capabilitySet.has("RECEPTION_REGISTRATIONS_WRITE")
  };
}

export function canAccessRecepcion(user: SessionUser | null | undefined) {
  return buildRecepcionAccess(user).canViewModule;
}

export function assertRecepcionCapability(
  user: SessionUser | null | undefined,
  capability: RecepcionCapability
): RecepcionAccess {
  const access = buildRecepcionAccess(user);
  if (!access.capabilities.includes(capability)) {
    throw new Error(`No autorizado para ${capability}.`);
  }
  return access;
}
