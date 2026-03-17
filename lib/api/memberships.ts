import { NextRequest, NextResponse } from "next/server";
import { requireAuth, type SessionUser } from "@/lib/auth";
import { auditPermissionDenied } from "@/lib/audit";
import { hasPermission, isAdmin, normalizeRoleName, roleLabel } from "@/lib/rbac";

type EnsureMembershipResult = {
  user: SessionUser | null;
  role: string | null;
  errorResponse: NextResponse | null;
};

export function ensureMembershipAccess(req: NextRequest, requiredPermissions?: string | string[]) {
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
