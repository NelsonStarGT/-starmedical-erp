import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireRoles } from "@/lib/inventory/auth";
import { inventoryCreateData, inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";
import { inventoryServiceUnavailable, mapFallbackServicesForApi, runtimeFallbackEnabled } from "@/lib/inventory/runtime-fallback";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveStatusScope(req: NextRequest) {
  const raw = normalizeOptionalString(req.nextUrl.searchParams.get("status"));
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function mapServiceForApi(s: any) {
  return {
    id: s.id,
    nombre: s.name,
    categoriaId: s.categoryId,
    subcategoriaId: s.subcategoryId || undefined,
    area: s.category?.area,
    proveedorId: "",
    codigoServicio: s.code || undefined,
    duracionMin: s.durationMin,
    precioVenta: Number(s.price || 0),
    costoBase: undefined,
    productosAsociados: [],
    costoCalculado: 0,
    imageUrl: (s as any).imageUrl || undefined,
    estado: (s as any).status || "Activo",
    categoriaNombre: s.category?.name,
    subcategoriaNombre: s.subcategory?.name
  };
}

function serializePrismaError(error: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError) {
  return {
    name: error.name,
    message: error.message,
    ...(error instanceof Prisma.PrismaClientKnownRequestError
      ? {
          code: error.code,
          meta: error.meta
        }
      : {})
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireRoles(req, ["Administrador", "Operador", "Recepcion"]);
    if (auth.errorResponse) return auth.errorResponse;
    const { scope, errorResponse } = resolveInventoryScope(req);
    if (errorResponse || !scope) return errorResponse;
    const search = req.nextUrl.searchParams.get("q")?.toLowerCase() || "";
    const statusScope = resolveStatusScope(req);
    const where: Prisma.ServiceWhereInput = {};
    if (statusScope.length === 1) where.status = statusScope[0];
    if (statusScope.length > 1) where.status = { in: statusScope };

    const items = await prisma.service.findMany({
      where: inventoryWhere(scope, where),
      include: {
        category: true,
        subcategory: true
      },
      orderBy: { updatedAt: "desc" }
    });

    const data = items
      .filter((s) => {
        if (!search) return true;
        const haystack = `${s.name} ${s.code || ""} ${s.category?.name || ""} ${s.subcategory?.name || ""}`.toLowerCase();
        return search.split(/\s+/).every((t) => haystack.includes(t));
      })
      .map(mapServiceForApi);

    return NextResponse.json({
      data,
      meta: {
        scope: {
          tenantId: scope.tenantId,
          branchId: scope.branchId,
          status: statusScope,
          deletedAt: null
        }
      }
    });
  } catch (err) {
    console.error(err);
    if (!runtimeFallbackEnabled()) {
      return NextResponse.json(
        inventoryServiceUnavailable("inventario.servicios", "No se pudo consultar servicios en este entorno."),
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, data: mapFallbackServicesForApi(), source: "runtime_fallback" }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const perm = requirePermission(req, "editar_servicio");
  if (perm) return perm;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;

  let payload: Record<string, unknown> = {};
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido" }, { status: 400 });
  }

  console.info("[inventory.services.post] request", {
    tenantId: scope.tenantId,
    branchId: scope.branchId,
    userId: scope.userId,
    payload
  });

  const nombre = normalizeOptionalString(payload.nombre);
  const categoriaId = normalizeOptionalString(payload.categoriaId);
  const subcategoriaId = normalizeOptionalString(payload.subcategoriaId);
  const codigoServicio = normalizeOptionalString(payload.codigoServicio);
  const duracionMin = Number(payload.duracionMin ?? 0);
  const precioVenta = Number(payload.precioVenta ?? 0);
  const estado = normalizeOptionalString(payload.estado) || "Activo";
  const marginPctRaw = payload.marginPct;
  const marginPct = marginPctRaw === undefined || marginPctRaw === null ? null : Number(marginPctRaw);

  if (!nombre || !categoriaId) {
    return NextResponse.json({ error: "nombre y categoriaId son requeridos" }, { status: 400 });
  }
  if (!Number.isFinite(duracionMin) || duracionMin <= 0) {
    return NextResponse.json({ error: "duracionMin inválida" }, { status: 400 });
  }
  if (!Number.isFinite(precioVenta) || precioVenta < 0) {
    return NextResponse.json({ error: "precioVenta inválido" }, { status: 400 });
  }
  if (marginPct !== null && (!Number.isFinite(marginPct) || marginPct < 0)) {
    return NextResponse.json({ error: "marginPct inválido" }, { status: 400 });
  }

  try {
    const created = await prisma.service.create({
      data: inventoryCreateData(scope, {
        name: nombre,
        code: codigoServicio,
        categoryId: categoriaId,
        subcategoryId: subcategoriaId,
        price: precioVenta,
        durationMin: Math.trunc(duracionMin),
        status: estado,
        marginPct
      }),
      include: {
        category: true,
        subcategory: true
      }
    });

    const response = { data: mapServiceForApi(created) };
    console.info("[inventory.services.post] response", {
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      userId: scope.userId,
      status: 201,
      response
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientValidationError) {
      console.error("[inventory.services.post] prisma_error", {
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        userId: scope.userId,
        payload,
        error: serializePrismaError(error)
      });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return NextResponse.json({ error: "Código de servicio duplicado" }, { status: 409 });
        }
        if (error.code === "P2003") {
          return NextResponse.json({ error: "Categoría o subcategoría inválida" }, { status: 400 });
        }
      }
      return NextResponse.json({ error: "No se pudo crear el servicio" }, { status: 500 });
    }

    console.error("[inventory.services.post] unexpected_error", {
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      userId: scope.userId,
      payload,
      error
    });
    return NextResponse.json({ error: "No se pudo crear el servicio" }, { status: 500 });
  }
}
