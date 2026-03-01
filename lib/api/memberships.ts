import { NextRequest, NextResponse } from "next/server";
import { CRM_DEV_ROLE_HEADER_ENABLED } from "@/lib/constants";
import { requireAuth, type SessionUser } from "@/lib/auth";
import { auditPermissionDenied } from "@/lib/audit";
import { buildPermissionsFromRoles, hasPermission, isAdmin, normalizeRoleName, roleLabel } from "@/lib/rbac";
import { roleFromRequest } from "@/lib/api/auth";

type EnsureMembershipResult = {
  user: SessionUser | null;
  role: string | null;
  errorResponse: NextResponse | null;
};

function devFallback(req: NextRequest): EnsureMembershipResult | null {
  if (!CRM_DEV_ROLE_HEADER_ENABLED) return null;
  const rawRole = roleFromRequest(req);
  if (!rawRole) return null;

  const normalized = normalizeRoleName(rawRole);
  const permissions = buildPermissionsFromRoles([normalized]);
  const user: SessionUser = {
    id: "dev",
    email: "dev@local",
    name: "Developer",
    roles: [normalized],
    permissions,
    branchId: null,
    legalEntityId: null
  };

  return { user, role: roleLabel(user), errorResponse: null };
}

export function ensureMembershipAccess(req: NextRequest, requiredPermissions?: string | string[]) {
  const dev = devFallback(req);
  if (dev) return dev;

  const auth = requireAuth(req);
  if (auth.errorResponse) return { user: null, role: null, errorResponse: auth.errorResponse };

  const user = auth.user!;
  const role = roleLabel(user);
  if (requiredPermissions) {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const normalizedRoles = new Set((user.roles || []).map((role) => normalizeRoleName(role)));
    const receptionOrOpsMembershipWriter = normalizedRoles.has("RECEPTION") || normalizedRoles.has("RECEPTIONIST") || normalizedRoles.has("OPS");

    const allowed = permissions.every((permission) => {
      const key = String(permission || "").toUpperCase();

      // Runtime hardening: pricing visibility is admin-only regardless of stale role catalogs.
      if (key === "MEMBERSHIPS:PRICING:VIEW") return isAdmin(user);

      if ((key === "MEMBERSHIPS:READ" || key === "MEMBERSHIPS:WRITE") && receptionOrOpsMembershipWriter) return true;

      return hasPermission(user, key);
    });
    if (!allowed) {
      auditPermissionDenied(user, req, "MEMBERSHIPS", "permission");
      return {
        user,
        role,
        errorResponse: NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 })
      };
    }
  }

  return { user, role, errorResponse: null };
}
