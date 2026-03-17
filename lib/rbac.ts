import { NextResponse } from "next/server";
import type { CrmDeal } from "@prisma/client";
import type { SessionUser } from "./auth";
import { ALL_PERMISSION_KEYS, ROLE_PERMISSION_MAP } from "@/lib/security/permissionCatalog";

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
  AUDIT_READ: "CRM:AUDIT:READ",
  MEMBERSHIPS_READ: "MEMBERSHIPS:READ",
  MEMBERSHIPS_WRITE: "MEMBERSHIPS:WRITE",
  MEMBERSHIPS_ADMIN: "MEMBERSHIPS:ADMIN",
  MEMBERSHIPS_PRICING_VIEW: "MEMBERSHIPS:PRICING:VIEW",
  MEMBERSHIPS_PAYMENTS_ADMIN: "MEMBERSHIPS:PAYMENTS:ADMIN",
  RECEPTION_VIEW: "RECEPTION_VIEW",
  RECEPTION_QUEUE_VIEW: "RECEPTION_QUEUE_VIEW",
  RECEPTION_QUEUE_WRITE: "RECEPTION_QUEUE_WRITE",
  RECEPTION_APPOINTMENTS_VIEW: "RECEPTION_APPOINTMENTS_VIEW",
  RECEPTION_APPOINTMENTS_WRITE: "RECEPTION_APPOINTMENTS_WRITE",
  RECEPTION_ADMISSIONS_VIEW: "RECEPTION_ADMISSIONS_VIEW",
  RECEPTION_ADMISSIONS_WRITE: "RECEPTION_ADMISSIONS_WRITE",
  RECEPTION_CASHIER_VIEW: "RECEPTION_CASHIER_VIEW",
  RECEPTION_CASHIER_WRITE: "RECEPTION_CASHIER_WRITE",
  RECEPTION_REGISTRATIONS_VIEW: "RECEPTION_REGISTRATIONS_VIEW",
  RECEPTION_REGISTRATIONS_WRITE: "RECEPTION_REGISTRATIONS_WRITE",
  CLIENTS_EXPORT_TEMPLATE: "CLIENTS_EXPORT_TEMPLATE",
  CLIENTS_EXPORT_DATA: "CLIENTS_EXPORT_DATA",
  CLIENTS_IMPORT_ANALYZE: "CLIENTS_IMPORT_ANALYZE",
  CLIENTS_IMPORT_PROCESS: "CLIENTS_IMPORT_PROCESS",
  CLIENTS_IMPORT_PROCESS_UPDATE: "CLIENTS_IMPORT_PROCESS_UPDATE",
  CLIENTS_REPORTS_VIEW: "CLIENTS_REPORTS_VIEW",
  CLIENTS_REPORTS_EXPORT: "CLIENTS_REPORTS_EXPORT",
  CLIENTS_REPORTS_EXPORT_FULL: "CLIENTS_REPORTS_EXPORT_FULL",
  CLIENTS_REPORTS_EXPORT_MASKED: "CLIENTS_REPORTS_EXPORT_MASKED",
  FINANCE_READ: "FINANCE:READ",
  FINANCE_WRITE: "FINANCE:WRITE",
  FINANCE_POST: "FINANCE:POST",
  FILES_UPLOAD: "FILES:UPLOAD",
  WHATSAPP_READ: "INTEGRATIONS:WHATSAPP:READ",
  WHATSAPP_SEND: "INTEGRATIONS:WHATSAPP:SEND"
} as const;

const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = ROLE_PERMISSION_MAP;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  OPS: "Operaciones",
  TENANT_ADMIN: "Tenant Admin",
  STAFF: "Staff",
  SALES: "Ventas",
  SUPERVISOR: "Supervisor",
  RECEPTION: "Recepcion",
  RECEPTIONIST: "Recepcionista",
  CASHIER: "Caja",
  FINANCE: "Finanzas"
};

export function normalizeRoleName(role?: string | null) {
  if (!role) return "";
  return role.trim().toUpperCase().replace(/\s+/g, "_");
}

function allowLegacyAdminPermissionFallback() {
  return process.env.RBAC_LEGACY_ADMIN_FALLBACK === "true" || process.env.NODE_ENV !== "production";
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
  const adminHasAll = params.adminHasAll ?? allowLegacyAdminPermissionFallback();

  if (isAdminRole && adminHasAll) {
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
      adminHasAll: allowLegacyAdminPermissionFallback()
    }).allowed
  );
}

export function hasPermission(user: SessionUser | null, permission: string) {
  if (!user) return false;
  const key = permission.toUpperCase();
  const denied = new Set((user.deniedPermissions || []).map((p) => p.toUpperCase()));
  if (denied.has(key)) return false;
  if (isAdmin(user) && allowLegacyAdminPermissionFallback()) return true;
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
  return Boolean(
    user?.roles?.some((r) => {
      const role = normalizeRoleName(r);
      return role === "ADMIN" || role === "SUPER_ADMIN";
    })
  );
}

export function isOwner(user: SessionUser | null) {
  return Boolean(user?.roles?.some((r) => normalizeRoleName(r) === "OWNER"));
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
