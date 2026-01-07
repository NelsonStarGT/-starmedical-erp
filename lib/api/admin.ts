import { NextRequest } from "next/server";
import { requireRoles, roleFromRequest } from "./auth";

export function ensureAdmin(req: NextRequest) {
  const tokenAuth = requireRoles(req, ["Administrador"]);
  if (!tokenAuth.errorResponse) {
    return { role: tokenAuth.role || "Administrador", errorResponse: null };
  }
  const role = roleFromRequest(req);
  if (role === "Administrador") {
    return { role, errorResponse: null };
  }
  return { role: null, errorResponse: tokenAuth.errorResponse };
}
