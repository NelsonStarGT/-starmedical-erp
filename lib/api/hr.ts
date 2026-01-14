import { NextRequest, NextResponse } from "next/server";
import { requireAuth, SessionUser } from "@/lib/auth";
import { auditPermissionDenied } from "@/lib/audit";
import { hasPermission, normalizeRoleName } from "@/lib/rbac";

export const HR_ROLES = ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF", "VIEWER"] as const;
export type HrRole = (typeof HR_ROLES)[number];
export type HrAction = "read" | "create" | "update" | "manage";
export type HrResource = "employee" | "department" | "position" | "document";

const ROLE_ACTIONS: Record<HrRole, HrAction[]> = {
  ADMIN: ["manage", "create", "update", "read"],
  HR_ADMIN: ["manage", "create", "update", "read"],
  HR_USER: ["read"],
  STAFF: ["read"],
  VIEWER: ["read"]
};

function mapRole(raw: string | null | undefined): HrRole | null {
  if (!raw) return null;
  const normalized = normalizeRoleName(raw).replace(/\s+/g, "_");
  if (normalized === "ADMINISTRADOR") return "ADMIN";
  if (normalized === "HR_ADMIN" || normalized === "HRADMIN" || normalized === "RRHH") return "HR_ADMIN";
  if (normalized === "HR_USER" || normalized === "HRUSER" || normalized === "RRHH_USER") return "HR_USER";
  if (normalized === "STAFF") return "STAFF";
  if (normalized === "VIEWER" || normalized === "VISOR") return "VIEWER";
  if ((HR_ROLES as readonly string[]).includes(normalized as HrRole)) return normalized as HrRole;
  return null;
}

function allowedActionsFor(user: SessionUser | null): HrAction[] {
  if (!user) return [];
  const roles = (user.roles || [])
    .map((r) => mapRole(r))
    .filter(Boolean) as HrRole[];
  if (roles.includes("ADMIN")) return ROLE_ACTIONS.ADMIN;
  if (roles.includes("HR_ADMIN")) return ROLE_ACTIONS.HR_ADMIN;
  if (roles.includes("HR_USER")) return ROLE_ACTIONS.HR_USER;
  if (roles.includes("VIEWER")) return ROLE_ACTIONS.VIEWER;
  return [];
}

export function can(user: SessionUser | null, action: HrAction, _resource: HrResource) {
  const actions = allowedActionsFor(user);
  if (actions.includes("manage")) return true;
  return actions.includes(action);
}

function allowedPermissions(allowed: HrRole[]) {
  const perms = new Set<string>();
  for (const role of allowed) {
    if (role === "ADMIN" || role === "HR_ADMIN") {
      [
        "HR:EMPLOYEES:READ",
        "HR:EMPLOYEES:WRITE",
        "HR:EMPLOYEES:DELETE",
        "HR:DOCS:READ",
        "HR:DOCS:EDIT",
        "HR:ATTENDANCE:READ",
        "HR:ATTENDANCE:WRITE",
        "HR:ATTENDANCE:APPROVE",
        "HR:PAYROLL:READ",
        "HR:PAYROLL:WRITE",
        "HR:PAYROLL:APPROVE",
        "HR:PAYROLL:PUBLISH",
        "HR:LEAVE:READ",
        "HR:LEAVE:APPROVE",
        "HR:SETTINGS:ADMIN"
      ].forEach((p) => perms.add(p));
    }
    if (role === "HR_USER") {
      ["HR:EMPLOYEES:READ", "HR:ATTENDANCE:READ", "HR:ATTENDANCE:WRITE", "HR:DOCS:READ", "HR:LEAVE:READ"].forEach((p) =>
        perms.add(p)
      );
    }
    if (role === "STAFF" || role === "VIEWER") {
      ["HR:EMPLOYEES:READ", "HR:ATTENDANCE:READ", "HR:LEAVE:READ"].forEach((p) => perms.add(p));
    }
  }
  return perms;
}

export function requireRole(req: NextRequest, allowed: HrRole[] = ["ADMIN", "HR_ADMIN"], permissionKey?: string) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return { user: null, errorResponse: auth.errorResponse };

  const user = auth.user!;
  const normalizedRoles = (user.roles || [])
    .map((r) => mapRole(r))
    .filter(Boolean) as HrRole[];
  const okByPermission =
    Boolean(permissionKey && hasPermission(user, permissionKey)) ||
    Array.from(allowedPermissions(allowed)).some((p) => hasPermission(user, p));
  const ok = normalizedRoles.some((r) => allowed.includes(r) || r === "ADMIN") || okByPermission;
  if (!ok) {
    auditPermissionDenied(user, req, "HR", "role");
    return { user, errorResponse: NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 }) };
  }

  return { user, errorResponse: null };
}
