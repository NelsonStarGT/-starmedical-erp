import { NextRequest, NextResponse } from "next/server";
import { MovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerInventoryMovement } from "@/lib/inventory/movements";
import { requireRoles } from "@/lib/api/auth";
import { hasPermission } from "@/lib/types/inventario";

export async function GET(req: NextRequest) {
  try {
    const auth = requireRoles(req, ["Administrador", "Operador", "Recepcion"]);
    if (auth.errorResponse) return auth.errorResponse;

    const searchParams = req.nextUrl.searchParams;
    const productId = searchParams.get("productId") || undefined;
    const branchId = searchParams.get("branchId") || undefined;
    const type = searchParams.get("type") || undefined;
    const user = searchParams.get("createdById") || undefined;
    const from = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom") as string) : undefined;
    const to = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo") as string) : undefined;
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "20")));

    const where: any = {};
    if (productId) where.productId = productId;
    if (branchId) where.branchId = branchId;
    if (type) where.type = type as MovementType;
    if (user) where.createdById = user;
    if (from || to) where.createdAt = { gte: from, lte: to };

    const [total, data] = await Promise.all([
      prisma.inventoryMovement.count({ where }),
      prisma.inventoryMovement.findMany({
        where,
        include: { product: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const mapped = data.map((m) => ({
      ...m,
      productName: m.product?.name,
      productCode: (m.product as any)?.code
    }));

    return NextResponse.json({ data: mapped, total, totalPages, page, pageSize });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener los movimientos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireRoles(req, ["Administrador", "Operador"]);
    if (auth.errorResponse) return auth.errorResponse;
    const role = auth.role as any;
    const body = await req.json();
    const { productId, branchId, type, quantity, unitCost, salePrice, reference, reason, createdById } = body;
    if (!productId || !branchId || !type || !createdById) {
      return NextResponse.json({ error: "productId, branchId, type y createdById son requeridos" }, { status: 400 });
    }
    const movementType = type as MovementType;

    const permError = enforceMovementPermission(role as any, movementType);
    if (permError) return permError;

    if (["EXIT", "ADJUSTMENT", "COST_UPDATE", "PRICE_UPDATE"].includes(movementType) && !reference) {
      return NextResponse.json({ error: "Referencia requerida para este tipo de movimiento" }, { status: 400 });
    }
    if (["EXIT", "ADJUSTMENT", "COST_UPDATE", "PRICE_UPDATE"].includes(movementType) && !reason) {
      return NextResponse.json({ error: "Motivo requerido para este tipo de movimiento" }, { status: 400 });
    }
    const result = await registerInventoryMovement({
      productId,
      branchId,
      type: movementType,
      quantity,
      unitCost,
      salePrice,
      reference,
      reason,
      createdById
    });
    return NextResponse.json({ data: result });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo registrar el movimiento" }, { status: 400 });
  }
}

function enforceMovementPermission(role: any, type: MovementType) {
  const deny = (msg: string) => NextResponse.json({ error: msg }, { status: 403 });
  if (type === "ENTRY" && !hasPermission(role, "registrar_entrada")) return deny("No autorizado para entradas");
  if (type === "EXIT" && !hasPermission(role, "registrar_salida")) return deny("No autorizado para salidas");
  if (type === "ADJUSTMENT" && !hasPermission(role, "registrar_ajuste")) return deny("No autorizado para ajustes");
  if (type === "PRICE_UPDATE" && !hasPermission(role, "actualizar_precio")) return deny("No autorizado para actualizar precio");
  if (type === "COST_UPDATE" && !hasPermission(role, "actualizar_costo")) return deny("No autorizado para actualizar costo");
  return null;
}
