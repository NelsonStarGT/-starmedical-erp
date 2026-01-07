import { NextResponse } from "next/server";
import type { CrmDeal } from "@prisma/client";
import type { SessionUser } from "./auth";

export const PERMISSIONS = {
  LEAD_READ: "crm.lead.read",
  LEAD_WRITE: "crm.lead.write",
  DEAL_READ: "crm.deal.read",
  DEAL_WRITE: "crm.deal.write",
  QUOTE_READ: "crm.quote.read",
  QUOTE_WRITE: "crm.quote.write",
  QUOTE_SEND: "crm.quote.send",
  QUOTE_APPROVE: "crm.quote.approve",
  PROPOSAL_READ: "crm.proposal.read",
  PROPOSAL_WRITE: "crm.proposal.write",
  PROPOSAL_SEND: "crm.proposal.send",
  FILE_READ: "crm.files.read",
  FILE_WRITE: "crm.files.write",
  CONFIG_READ: "crm.config.read",
  CONFIG_WRITE: "crm.config.write",
  AUDIT_READ: "crm.audit.read"
} as const;

const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: Object.values(PERMISSIONS),
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
  SALES: "Ventas",
  SUPERVISOR: "Supervisor",
  RECEPTION: "Recepcion",
  FINANCE: "Finanzas"
};

export function normalizeRoleName(role?: string | null) {
  if (!role) return "";
  const upper = role.toUpperCase();
  if (ROLE_DEFAULT_PERMISSIONS[upper]) return upper;
  return upper;
}

export function buildPermissionsFromRoles(roleNames: string[], dbRolePermissions?: string[][]) {
  const merged = new Set<string>();
  roleNames.forEach((role) => {
    const normalized = normalizeRoleName(role);
    (ROLE_DEFAULT_PERMISSIONS[normalized] || []).forEach((p) => merged.add(p));
  });
  (dbRolePermissions || []).forEach((list) => list.forEach((p) => merged.add(p)));
  return Array.from(merged);
}

export function hasPermission(user: SessionUser | null, permission: string) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return user.permissions.includes(permission);
}

export function requirePermission(user: SessionUser | null, permission: string) {
  if (hasPermission(user, permission)) return { errorResponse: null };
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
