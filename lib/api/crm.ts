import { NextRequest, NextResponse } from "next/server";
import { requireAuth, SessionUser } from "../auth";
import { hasPermission, roleLabel, isAdmin } from "../rbac";
import { auditPermissionDenied } from "../audit";

type EnsureResult = { user: SessionUser | null; role: string | null; errorResponse: NextResponse | null };

export function ensureCrmAccess(req: NextRequest, requiredPermissions?: string | string[]) {
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
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_") === "ADMIN";
}
