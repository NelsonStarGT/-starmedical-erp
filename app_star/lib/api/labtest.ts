import { NextRequest, NextResponse } from "next/server";
import { LabRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { auditPermissionDenied } from "@/lib/audit";
import { getLabRoleForUser } from "@/lib/labtest/access";
import { getLabTestSettings } from "@/lib/labtest/settings";

const permRoleMap: Record<string, LabRole[]> = {
  "LABTEST:READ": ["LAB_TECH", "LAB_SUPERVISOR", "LAB_ADMIN"],
  "LABTEST:WRITE": ["LAB_TECH", "LAB_SUPERVISOR", "LAB_ADMIN"],
  "LABTEST:WORK": ["LAB_TECH", "LAB_SUPERVISOR", "LAB_ADMIN"],
  "LABTEST:VALIDATE": ["LAB_TECH", "LAB_SUPERVISOR", "LAB_ADMIN"],
  "LABTEST:RELEASE": ["LAB_TECH", "LAB_SUPERVISOR", "LAB_ADMIN"],
  "LABTEST:SEND": ["LAB_TECH", "LAB_SUPERVISOR", "LAB_ADMIN"],
  "LABTEST:ADMIN": ["LAB_SUPERVISOR", "LAB_ADMIN"]
};

export async function requireLabTestPermission(req: NextRequest, permission: string | string[]) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return { user: null, errorResponse: auth.errorResponse };
  const user = auth.user!;

  const upperRoles = (user.roles || []).map((r) => r.toUpperCase());
  const isGlobalAdmin = upperRoles.includes("SUPER_ADMIN") || upperRoles.includes("ADMIN");

  // LabAccess es fuente de verdad salvo bypass global admin.
  const role = await getLabRoleForUser(user.id, user.branchId);
  if (!role && !isGlobalAdmin) {
    return { user, errorResponse: NextResponse.json({ ok: false, error: "Sin acceso a LabTest", code: "LAB_ACCESS_REQUIRED" }, { status: 403 }) };
  }

  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = perms.every((p) => {
    if (isGlobalAdmin) return true;
    const roles = permRoleMap[p] || permRoleMap["LABTEST:READ"];
    return role ? roles.includes(role) : false;
  });
  if (!allowed) {
    auditPermissionDenied(user, req, "LABTEST", perms.join(","));
    return { user, errorResponse: NextResponse.json({ ok: false, error: "No autorizado", code: "LAB_FORBIDDEN" }, { status: 403 }) };
  }

  const settings = await getLabTestSettings();
  if (settings.requireOtpForLabTest) {
    const cookieVal = req.cookies.get("labtest-verified")?.value;
    const ts = cookieVal ? Date.parse(cookieVal) : NaN;
    const valid =
      cookieVal &&
      !Number.isNaN(ts) &&
      Date.now() - ts <= (settings.idleTimeoutMinutes || 120) * 60 * 1000;
    if (!valid) {
      return { user, errorResponse: NextResponse.json({ ok: false, error: "OTP requerido", code: "LAB_OTP_REQUIRED" }, { status: 401 }) };
    }
  }

  return { user, errorResponse: null, role: role || null };
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}
