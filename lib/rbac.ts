import { NextResponse } from "next/server";
import type { CrmDeal } from "@prisma/client";
import type { SessionUser } from "./auth";
import { ALL_PERMISSION_KEYS, BASE_ROLES } from "@/lib/security/permissionCatalog";

export const PERMISSIONS = {
  LEAD_READ: "CRM:LEADS:READ",
  LEAD_WRITE: "CRM:LEADS:WRITE",
  DEAL_READ: "CRM:DEALS:READ",
  DEAL_WRITE: "CRM:DEALS:WRITE",
  QUOTE_READ: "CRM:QUOTES:READ",
  QUOTE_WRITE: "CRM:QUOTES:WRITE",
  QUOTE_SEND: "CRM:QUOTES:PUBLISH",
  QUOTE_APPROVE: "CRM:QUOTES:APPROVE",
  PROPOSAL_READ: "CRM:PROPOSALS:READ",
  PROPOSAL_WRITE: "CRM:PROPOSALS:WRITE",
  PROPOSAL_SEND: "CRM:PROPOSALS:PUBLISH",
  FILE_READ: "CRM:FILES:READ",
  FILE_WRITE: "CRM:FILES:WRITE",
  CONFIG_READ: "CRM:SETTINGS:ADMIN",
  CONFIG_WRITE: "CRM:SETTINGS:ADMIN",
  AUDIT_READ: "CRM:AUDIT:READ"
} as const;

const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: BASE_ROLES.ADMIN.permissions,
  STAFF: BASE_ROLES.STAFF.permissions,
  SUPERVISOR: [
    PERMISSIONS.LEAD_READ,
    PERMISSIONS.LEAD_WRITE,
    PERMISSIONS.DEAL_READ,
    PERMISSIONS.DEAL_WRITE,
    PERMISSIONS.QUOTE_READ,
    PERMISSIONS.QUOTE_WRITE,
    PERMISSIONS.QUOTE_SEND,
    PERMISSIONS.QUOTE_APPROVE,
    PERMISSIONS.PROPOSAL_READ,
    PERMISSIONS.PROPOSAL_WRITE,
    PERMISSIONS.PROPOSAL_SEND,
    PERMISSIONS.FILE_READ,
    PERMISSIONS.FILE_WRITE,
    PERMISSIONS.CONFIG_READ,
    PERMISSIONS.AUDIT_READ
  ],
  SALES: [
    PERMISSIONS.LEAD_READ,
    PERMISSIONS.LEAD_WRITE,
    PERMISSIONS.DEAL_READ,
    PERMISSIONS.DEAL_WRITE,
    PERMISSIONS.QUOTE_READ,
    PERMISSIONS.QUOTE_WRITE,
    PERMISSIONS.QUOTE_SEND,
    PERMISSIONS.PROPOSAL_READ,
    PERMISSIONS.PROPOSAL_WRITE,
    PERMISSIONS.PROPOSAL_SEND,
    PERMISSIONS.FILE_READ,
    PERMISSIONS.FILE_WRITE
  ],
  RECEPTION: [PERMISSIONS.LEAD_READ, PERMISSIONS.DEAL_READ, PERMISSIONS.QUOTE_READ],
  FINANCE: [PERMISSIONS.QUOTE_READ, PERMISSIONS.QUOTE_APPROVE]
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  STAFF: "Staff",
  SALES: "Ventas",
  SUPERVISOR: "Supervisor",
  RECEPTION: "Recepcion",
  FINANCE: "Finanzas"
};

export function normalizeRoleName(role?: string | null) {
  if (!role) return "";
  return role.trim().toUpperCase().replace(/\s+/g, "_");
}

export function buildEffectivePermissionSet(params: {
  roleNames: string[];
  rolePermissionSets?: string[][];
  userGrants?: string[];
  userDenies?: string[];
  adminHasAll?: boolean;
}) {
  const denied = new Set((params.userDenies || []).map((p) => p.toUpperCase()));
  const allowed = new Set<string>();
  const inherited = new Set<string>();
  const normalizedRoles = params.roleNames.map(normalizeRoleName).filter(Boolean);
  const isAdminRole = normalizedRoles.includes("ADMIN");

  if (isAdminRole && params.adminHasAll !== false) {
    ALL_PERMISSION_KEYS.forEach((key) => allowed.add(key));
  }

  normalizedRoles.forEach((role, idx) => {
    (ROLE_DEFAULT_PERMISSIONS[role] || []).forEach((perm) => {
      const key = perm.toUpperCase();
      allowed.add(key);
      inherited.add(key);
    });
    const dbPerms = params.rolePermissionSets?.[idx] || [];
    dbPerms.forEach((perm) => {
      const key = perm.toUpperCase();
      allowed.add(key);
      inherited.add(key);
    });
  });

  (params.userGrants || []).forEach((perm) => allowed.add(perm.toUpperCase()));
  denied.forEach((perm) => allowed.delete(perm));

  return { allowed, denied, inherited, isAdmin: isAdminRole };
}

export function buildPermissionsFromRoles(roleNames: string[], dbRolePermissions?: string[][]) {
  return Array.from(
    buildEffectivePermissionSet({
      roleNames,
      rolePermissionSets: dbRolePermissions,
      adminHasAll: true
    }).allowed
  );
}

export function hasPermission(user: SessionUser | null, permission: string) {
  if (!user) return false;
  const key = permission.toUpperCase();
  const denied = new Set((user.deniedPermissions || []).map((p) => p.toUpperCase()));
  if (denied.has(key)) return false;
  if (isAdmin(user)) return true;
  const allowed = new Set((user.permissions || []).map((p) => p.toUpperCase()));
  return allowed.has(key);
}

export function requirePermission(user: SessionUser | null, permission: string | string[]) {
  const list = Array.isArray(permission) ? permission : [permission];
  const ok = list.every((perm) => hasPermission(user, perm));
  if (ok) return { errorResponse: null };
  return {
    errorResponse: NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 })
  };
}

export function isAdmin(user: SessionUser | null) {
  return Boolean(user?.roles?.some((r) => normalizeRoleName(r) === "ADMIN"));
}

export function isSupervisor(user: SessionUser | null) {
  return Boolean(user?.roles?.some((r) => normalizeRoleName(r) === "SUPERVISOR"));
}

export function roleLabel(user: SessionUser | null) {
  const role = user?.roles?.[0];
  const normalized = normalizeRoleName(role);
  return ROLE_LABELS[normalized] || role || "";
}

export function enforceDealOwnership(user: SessionUser, deal: Pick<CrmDeal, "ownerUserId" | "ownerId" | "branchId">) {
  if (isAdmin(user)) return true;
  if (isSupervisor(user)) {
    if (user.branchId && deal.branchId && user.branchId === deal.branchId) return true;
  }
  const ownerMatch = deal.ownerUserId ? deal.ownerUserId === user.id : deal.ownerId === user.id || deal.ownerId === user.email;
  return ownerMatch;
}

export function dealScopeWhere(user: SessionUser) {
  if (isAdmin(user)) return {};
  const or: any[] = [{ ownerUserId: user.id }, { ownerId: user.id }, { ownerId: user.email }];
  if (isSupervisor(user) && user.branchId) {
    or.push({ branchId: user.branchId });
  }
  return { OR: or };
}
