import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import { normalizeRoleName } from "@/lib/rbac";
import { AccionInventario, RolInventario, hasPermission } from "@/lib/types/inventario";

export type InventoryAuthContext = {
  role: RolInventario;
  userId: string | null;
  tenantId: string | null;
  branchId: string | null;
  source: "session" | "token";
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveRoleFromSessionUser(user: SessionUser | null): RolInventario | null {
  if (!user) return null;

  const normalizedRoles = (user.roles || []).map((role) => normalizeRoleName(role));
  if (
    normalizedRoles.includes("ADMIN") ||
    normalizedRoles.includes("SUPER_ADMIN") ||
    normalizedRoles.includes("TENANT_ADMIN") ||
    normalizedRoles.includes("OWNER")
  ) {
    return "Administrador";
  }
  if (normalizedRoles.includes("OPS") || normalizedRoles.includes("OPERATOR") || normalizedRoles.includes("OPERADOR")) {
    return "Operador";
  }
  if (
    normalizedRoles.includes("RECEPTION") ||
    normalizedRoles.includes("RECEPTIONIST") ||
    normalizedRoles.includes("RECEPCION") ||
    normalizedRoles.includes("CASHIER")
  ) {
    return "Recepcion";
  }

  const normalizedPermissions = new Set((user.permissions || []).map((permission) => String(permission).toUpperCase()));
  if (normalizedPermissions.has("SYSTEM:ADMIN") || normalizedPermissions.has("USERS:ADMIN")) {
    return "Administrador";
  }

  return null;
}

type TokenConfig = {
  role: RolInventario;
  tokenEnv: "INVENTORY_API_ADMIN_TOKEN" | "INVENTORY_API_OPERATOR_TOKEN" | "INVENTORY_API_RECEPCION_TOKEN";
  tenantEnv: "INVENTORY_API_ADMIN_TENANT_ID" | "INVENTORY_API_OPERATOR_TENANT_ID" | "INVENTORY_API_RECEPCION_TENANT_ID";
};

const TOKEN_CONFIGS: TokenConfig[] = [
  {
    role: "Administrador",
    tokenEnv: "INVENTORY_API_ADMIN_TOKEN",
    tenantEnv: "INVENTORY_API_ADMIN_TENANT_ID"
  },
  {
    role: "Operador",
    tokenEnv: "INVENTORY_API_OPERATOR_TOKEN",
    tenantEnv: "INVENTORY_API_OPERATOR_TENANT_ID"
  },
  {
    role: "Recepcion",
    tokenEnv: "INVENTORY_API_RECEPCION_TOKEN",
    tenantEnv: "INVENTORY_API_RECEPCION_TENANT_ID"
  }
];

function resolveAuthFromToken(req: NextRequest): InventoryAuthContext | null {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const headerToken = req.headers.get("x-inventory-token");
  const token = normalizeOptionalString(bearer || headerToken);
  if (!token) return null;

  const defaultTenantId = normalizeOptionalString(process.env.DEFAULT_TENANT_ID);

  for (const config of TOKEN_CONFIGS) {
    const expectedToken = normalizeOptionalString(process.env[config.tokenEnv]);
    if (!expectedToken || token !== expectedToken) continue;

    // source === token: tenant/branch must never be overridden from request headers/query.
    const tenantId = normalizeOptionalString(process.env[config.tenantEnv]) || defaultTenantId;

    return {
      role: config.role,
      source: "token",
      userId: `inventory-token:${config.role.toLowerCase()}`,
      tenantId,
      branchId: null
    };
  }

  return null;
}

export function resolveInventoryAuth(req: NextRequest): InventoryAuthContext | null {
  const sessionUser = getSessionUser(req);
  const roleFromSession = resolveRoleFromSessionUser(sessionUser);
  if (roleFromSession) {
    return {
      role: roleFromSession,
      source: "session",
      userId: normalizeOptionalString(sessionUser?.id),
      tenantId: normalizeOptionalString(sessionUser?.tenantId),
      branchId: normalizeOptionalString(sessionUser?.branchId)
    };
  }

  return resolveAuthFromToken(req);
}

export function roleFromAuthenticatedRequest(req: NextRequest): RolInventario | null {
  return resolveInventoryAuth(req)?.role ?? null;
}

function resolveTenantGuardError(auth: InventoryAuthContext) {
  const tenantId = normalizeOptionalString(auth.tenantId);
  if (tenantId) return null;
  if (auth.source === "token") {
    return NextResponse.json(
      {
        error: "Token de inventario sin tenant configurado. Define INVENTORY_API_*_TENANT_ID o DEFAULT_TENANT_ID."
      },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: "Sesión sin tenantId" }, { status: 401 });
}

export function requirePermission(req: NextRequest, accion: AccionInventario) {
  const auth = resolveInventoryAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const tenantGuard = resolveTenantGuardError(auth);
  if (tenantGuard) return tenantGuard;

  if (!hasPermission(auth.role, accion)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return null;
}

export function requireRoles(req: NextRequest, roles: Array<RolInventario>) {
  const auth = resolveInventoryAuth(req);
  if (!auth) {
    return {
      role: null,
      errorResponse: NextResponse.json({ error: "No autenticado" }, { status: 401 })
    };
  }

  const tenantGuard = resolveTenantGuardError(auth);
  if (tenantGuard) {
    return {
      role: auth.role,
      errorResponse: tenantGuard
    };
  }

  if (!roles.includes(auth.role)) {
    return {
      role: auth.role,
      errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 403 })
    };
  }

  return {
    role: auth.role,
    errorResponse: null
  };
}
