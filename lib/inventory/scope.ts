import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveInventoryAuth } from "@/lib/inventory/auth";
import type { RolInventario } from "@/lib/types/inventario";

export type InventoryScope = {
  tenantId: string;
  branchId: string | null;
  role: RolInventario;
  userId: string | null;
  source: "session" | "token";
};

export class InventoryScopeError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "InventoryScopeError";
  }
}

export function getInventoryScopeOrThrow(req: NextRequest): InventoryScope {
  const auth = resolveInventoryAuth(req);
  if (!auth) {
    throw new InventoryScopeError(401, "No autenticado");
  }

  const tenantId = typeof auth.tenantId === "string" ? auth.tenantId.trim() : "";
  if (!tenantId) {
    if (auth.source === "token") {
      throw new InventoryScopeError(
        500,
        "Token de inventario sin tenant configurado. Define INVENTORY_API_*_TENANT_ID o DEFAULT_TENANT_ID."
      );
    }
    throw new InventoryScopeError(401, "Sesión sin tenantId");
  }

  return {
    tenantId,
    branchId: auth.branchId ?? null,
    role: auth.role,
    userId: auth.userId ?? null,
    source: auth.source
  };
}

export function inventoryWhere<T extends Record<string, unknown>>(
  scope: InventoryScope,
  where?: T,
  options?: {
    includeDeleted?: boolean;
    branchScoped?: boolean;
    branchId?: string | null;
  }
) {
  const scoped: Record<string, unknown> = { ...(where || {}) };
  scoped.tenantId = scope.tenantId;

  if (!options?.includeDeleted) {
    scoped.deletedAt = null;
  }

  const branchId = options?.branchId !== undefined ? options.branchId : options?.branchScoped ? scope.branchId : null;
  if (branchId) {
    scoped.branchId = branchId;
  }

  return scoped;
}

export function inventoryCreateData<T extends Record<string, unknown>>(scope: InventoryScope, data: T) {
  return {
    ...data,
    tenantId: scope.tenantId
  };
}

export function mapInventoryScopeError(error: unknown) {
  if (error instanceof InventoryScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

export function resolveInventoryScope(req: NextRequest) {
  try {
    return {
      scope: getInventoryScopeOrThrow(req),
      errorResponse: null as NextResponse | null
    };
  } catch (error) {
    return {
      scope: null as InventoryScope | null,
      errorResponse: mapInventoryScopeError(error) ?? NextResponse.json({ error: "No se pudo resolver scope" }, { status: 500 })
    };
  }
}
