import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { DEV_ROLE_HEADER_ENABLED } from "@/lib/constants";
import { AccionInventario, hasPermission } from "@/lib/types/inventario";

export function requestedRoleFromRequest(req: NextRequest) {
  return req.headers.get("x-role") || req.headers.get("x-user-role") || req.nextUrl.searchParams.get("role");
}

function roleFromSession(req: NextRequest): string | null {
  const user = getSessionUser(req);
  if (!user) return null;

  const normalizedRoles = (user.roles || []).map((role) => String(role || "").trim().toUpperCase());
  if (normalizedRoles.includes("ADMIN") || normalizedRoles.includes("ADMINISTRADOR")) return "Administrador";
  if (normalizedRoles.includes("FINANCE") || normalizedRoles.includes("CONTADOR")) return "Contador";
  if (normalizedRoles.includes("RECEPTION") || normalizedRoles.includes("RECEPCION")) return "Recepcion";
  if (normalizedRoles.includes("OPERADOR") || normalizedRoles.includes("OPERATOR") || normalizedRoles.includes("STAFF")) {
    return "Operador";
  }

  return null;
}

function roleFromToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const headerToken = req.headers.get("x-inventory-token");
  const token = bearer || headerToken;
  const adminToken = process.env.INVENTORY_API_ADMIN_TOKEN;
  const operatorToken = process.env.INVENTORY_API_OPERATOR_TOKEN;
  const recepcionToken = process.env.INVENTORY_API_RECEPCION_TOKEN;
  if (token && adminToken && token === adminToken) return "Administrador";
  if (token && operatorToken && token === operatorToken) return "Operador";
  if (token && recepcionToken && token === recepcionToken) return "Recepcion";
  return null;
}

export function roleFromRequest(req: NextRequest) {
  return roleFromSession(req) || roleFromToken(req) || (DEV_ROLE_HEADER_ENABLED ? requestedRoleFromRequest(req) : null);
}

export function requirePermission(req: NextRequest, accion: AccionInventario) {
  const role = roleFromRequest(req);
  if (!role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const ok = hasPermission(role as any, accion);
  if (!ok) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return null;
}

export function requireRoles(req: NextRequest, roles: Array<"Administrador" | "Operador" | "Recepcion">) {
  const role = roleFromRequest(req);
  if (!role || !roles.includes(role as any)) {
    return { errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 403 }), role: null };
  }
  return { role, errorResponse: null };
}
