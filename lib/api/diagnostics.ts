import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { normalizeRoleName, requirePermission } from "@/lib/rbac";
import { auditPermissionDenied } from "@/lib/audit";
const INTAKE_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "SECRETARY", "NURSE"]);

export function requireDiagnosticsPermission(req: NextRequest, permission: string) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return { user: null, errorResponse: auth.errorResponse };

  const permCheck = requirePermission(auth.user, permission);
  if (permCheck.errorResponse) {
    auditPermissionDenied(auth.user, req, "DIAGNOSTICS", permission);
    return { user: auth.user, errorResponse: permCheck.errorResponse };
  }

  return { user: auth.user!, errorResponse: null };
}

export function requireDiagnosticsIntakeRole(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return { user: null, errorResponse: auth.errorResponse };

  const roles = (auth.user?.roles || []).map(normalizeRoleName);
  const allowed = roles.some((role) => INTAKE_ROLES.has(role));
  if (!allowed) {
    auditPermissionDenied(auth.user, req, "DIAGNOSTICS_INTAKE", "role");
    return {
      user: auth.user,
      errorResponse: NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 })
    };
  }
  return { user: auth.user!, errorResponse: null };
}

// Backwards compatible alias (deprecated): use requireDiagnosticsIntakeRole.
export function requireDiagnosticsReceptionRole(req: NextRequest) {
  return requireDiagnosticsIntakeRole(req);
}
