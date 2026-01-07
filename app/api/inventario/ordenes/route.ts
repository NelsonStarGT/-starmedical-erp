import { NextRequest, NextResponse } from "next/server";
import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/api/auth";
import { generateSequentialCode, mapPurchaseOrder } from "@/lib/inventory/purchases";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const params = req.nextUrl.searchParams;
    const statuses = (params.get("status") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as PurchaseOrderStatus[];
    const supplierId = params.get("supplierId") || undefined;
    const branchId = params.get("branchId") || undefined;
    const q = params.get("q")?.toLowerCase().trim() || "";
    const from = params.get("dateFrom") ? new Date(params.get("dateFrom") as string) : undefined;
    const to = params.get("dateTo") ? new Date(params.get("dateTo") as string) : undefined;

    const where: any = {};
    if (statuses.length > 0) where.status = { in: statuses };
    if (supplierId) where.supplierId = supplierId;
    if (branchId) where.branchId = branchId;
    if (from || to) where.createdAt = { gte: from, lte: to };
    if (q) {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } }
      ];
    }

    const data = await prisma.purchaseOrder.findMany({
      where,
      include: { items: { include: { product: true } }, request: true },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ data: data.map(mapPurchaseOrder) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener las órdenes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { supplierId, branchId, createdById, requestId, items, notes, status } = body;
    if (!supplierId || !branchId || !createdById) {
      return NextResponse.json({ error: "supplierId, branchId y createdById son requeridos" }, { status: 400 });
    }

    let requestItems: any[] = [];
    if (requestId) {
      const request = await prisma.purchaseRequest.findUnique({ where: { id: requestId }, include: { items: true } });
      if (!request) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
      if (request.status !== "APPROVED") return NextResponse.json({ error: "La solicitud debe estar aprobada" }, { status: 400 });
      requestItems = request.items;
    }

    const itemsToCreate = (items?.length ? items : requestItems)?.map((it: any) => ({
      productId: it.productId,
      quantity: Number(it.quantity || 0),
      unitCost: it.unitCost ? new Prisma.Decimal(it.unitCost) : null
    }));

    if (!itemsToCreate || itemsToCreate.length === 0) {
      return NextResponse.json({ error: "La orden requiere al menos un item" }, { status: 400 });
    }

    const code = await generateSequentialCode("order");
    const targetStatus: PurchaseOrderStatus = status === "SENT" ? "SENT" : "DRAFT";

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          code,
          supplierId,
          branchId,
          createdById,
          status: targetStatus,
          requestId: requestId || null,
          notes: notes || null,
          items: { create: itemsToCreate }
        },
        include: { items: { include: { product: true } }, request: true }
      });
      if (requestId) {
        await tx.purchaseRequest.update({ where: { id: requestId }, data: { status: "ORDERED" } });
      }
      return created;
    });

    return NextResponse.json({ data: mapPurchaseOrder(order) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la orden" }, { status: 400 });
  }
}
