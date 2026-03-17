import { NextRequest, NextResponse } from "next/server";
import { AccionInventario, hasPermission } from "@/lib/types/inventario";

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

export function requirePermission(req: NextRequest, accion: AccionInventario) {
  const role = roleFromToken(req);
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
  const role = roleFromToken(req);
  if (!role || !roles.includes(role as any)) {
    return { errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 403 }), role: null };
  }
  return { role, errorResponse: null };
}
