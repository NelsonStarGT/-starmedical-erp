import { NextRequest, NextResponse } from "next/server";
import { PurchaseRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/inventory/auth";
import { inventoryCreateData, inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";
import { generateSequentialCode, mapPurchaseRequest } from "@/lib/inventory/purchases";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador", "Operador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const params = req.nextUrl.searchParams;
    const statuses = (params.get("status") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as PurchaseRequestStatus[];
    const branchIdParam = params.get("branchId") || undefined;
    if (scope.branchId && branchIdParam && branchIdParam !== scope.branchId) {
      return NextResponse.json({ error: "Branch fuera de alcance" }, { status: 403 });
    }
    const branchId = scope.branchId || branchIdParam;
    const q = params.get("q")?.toLowerCase().trim() || "";
    const from = params.get("dateFrom") ? new Date(params.get("dateFrom") as string) : undefined;
    const to = params.get("dateTo") ? new Date(params.get("dateTo") as string) : undefined;

    const where: any = {};
    if (statuses.length > 0) where.status = { in: statuses };
    if (branchId) where.branchId = branchId;
    if (from || to) where.createdAt = { gte: from, lte: to };
    if (q) {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } }
      ];
    }

    const data = await prisma.purchaseRequest.findMany({
      where: inventoryWhere(scope, where, { branchScoped: true }),
      include: { items: { include: { product: true } }, orders: true },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ data: data.map(mapPurchaseRequest) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener las solicitudes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador", "Operador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const body = await req.json();
    const { branchId: branchIdParam, requestedById, notes, items, status } = body;
    if (scope.branchId && branchIdParam && branchIdParam !== scope.branchId) {
      return NextResponse.json({ error: "Branch fuera de alcance" }, { status: 403 });
    }
    const branchId = scope.branchId || branchIdParam;
    const requestedBy = requestedById || scope.userId;
    if (!branchId || !requestedBy) {
      return NextResponse.json({ error: "branchId y requestedById son requeridos" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Agrega al menos un producto a la solicitud" }, { status: 400 });
    }

    const code = await generateSequentialCode("request", scope.tenantId);
    const initialStatus: PurchaseRequestStatus = status === "SUBMITTED" ? "SUBMITTED" : "DRAFT";

    const created = await prisma.purchaseRequest.create({
      data: inventoryCreateData(scope, {
        code,
        branchId,
        requestedById: requestedBy,
        status: initialStatus,
        notes: notes || null,
        items: {
          create: items.map((it: any) => ({
            tenantId: scope.tenantId,
            productId: it.productId,
            quantity: Number(it.quantity || 0),
            unitId: it.unitId || null,
            supplierId: it.supplierId || null,
            notes: it.notes || null
          }))
        }
      }),
      include: { items: { include: { product: true } }, orders: true }
    });

    return NextResponse.json({ data: mapPurchaseRequest(created) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la solicitud" }, { status: 400 });
  }
}
