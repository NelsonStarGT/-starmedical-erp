import { NextRequest, NextResponse } from "next/server";
import { CRM_DEV_ROLE_HEADER_ENABLED } from "../constants";
import { requireAuth, SessionUser } from "../auth";
import { normalizeRoleName, hasPermission, roleLabel, buildPermissionsFromRoles, isAdmin } from "../rbac";
import { auditPermissionDenied } from "../audit";
import { requestedRoleFromRequest } from "./auth";

type EnsureResult = { user: SessionUser | null; role: string | null; errorResponse: NextResponse | null };

function devFallback(req: NextRequest): EnsureResult | null {
  if (!CRM_DEV_ROLE_HEADER_ENABLED) return null;
  const rawRole = requestedRoleFromRequest(req);
  if (!rawRole) return null;
  const normalized = normalizeRoleName(rawRole);
  const roleDisplay = roleLabel({ id: "dev", email: "dev@local", roles: [normalized], permissions: [], branchId: null });
  const permissions = buildPermissionsFromRoles([normalized]);
  return {
    user: {
      id: "dev",
      email: "dev@local",
      name: "Developer",
      roles: [normalized],
      permissions,
      branchId: null
    },
    role: roleDisplay,
    errorResponse: null
  };
}

export function ensureCrmAccess(req: NextRequest, requiredPermissions?: string | string[]) {
  const dev = devFallback(req);
  if (dev) return dev;

  const auth = requireAuth(req);
  if (auth.errorResponse) return { user: null, role: null, errorResponse: auth.errorResponse };

  const user = auth.user!;
  const displayRole = roleLabel(user);
  if (requiredPermissions) {
    const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const allowed = perms.every((perm) => hasPermission(user, perm));
    if (!allowed) {
      auditPermissionDenied(user, req, "SECURITY", "permission");
      return {
        user,
        role: displayRole,
        errorResponse: NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 })
      };
    }
  }

  return { user, role: displayRole, errorResponse: null };
}

export function ensureCrmAdmin(req: NextRequest) {
  const result = ensureCrmAccess(req);
  if (result.errorResponse) return result;
  if (!isAdmin(result.user)) {
    auditPermissionDenied(result.user, req, "SECURITY", "admin");
    return {
      ...result,
      errorResponse: NextResponse.json({ error: "Solo ADMIN", code: "FORBIDDEN" }, { status: 403 })
    };
  }
  return result;
}

export function isCrmAdmin(role: string | null) {
  return normalizeRoleName(role) === "ADMIN";
}
