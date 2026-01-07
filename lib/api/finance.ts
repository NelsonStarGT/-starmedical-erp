import { NextRequest, NextResponse } from "next/server";
import { roleFromRequest, requireRoles } from "./auth";

type FinanceRole = "Administrador" | "Contador";

const FINANCE_ROLES: FinanceRole[] = ["Administrador", "Contador"];

function hasRole(role: string | null, allowed: FinanceRole[]) {
  return role && allowed.includes(role as FinanceRole);
}

export function ensureFinanceAccess(req: NextRequest, allowed: FinanceRole[] = FINANCE_ROLES) {
  const roleHeader = roleFromRequest(req);
  if (hasRole(roleHeader, allowed)) return { role: roleHeader as FinanceRole, errorResponse: null };

  const tokenAuth = requireRoles(req, ["Administrador"]);
  if (!tokenAuth.errorResponse) return { role: (tokenAuth.role as FinanceRole) || "Administrador", errorResponse: null };

  return { role: null, errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
}

export function ensureFinancePoster(req: NextRequest) {
  return ensureFinanceAccess(req, ["Administrador", "Contador"]);
}
