import { NextRequest, NextResponse } from "next/server";
import { PurchaseRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";
import { mapPurchaseRequest } from "@/lib/inventory/purchases";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRoles(req, ["Administrador", "Operador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const data = await prisma.purchaseRequest.findFirst({
      where: inventoryWhere(scope, { id: params.id }, { branchScoped: true }),
      include: {
        items: { where: inventoryWhere(scope, {}), include: { product: true } },
        orders: { where: inventoryWhere(scope, {}) }
      }
    });
    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ data: mapPurchaseRequest(data) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener la solicitud" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRoles(req, ["Administrador", "Operador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  const role = auth.role;
  try {
    const body = await req.json();
    const action = body.action || "update";
    const request = await prisma.purchaseRequest.findFirst({
      where: inventoryWhere(scope, { id: params.id }, { branchScoped: true }),
      include: {
        items: { where: inventoryWhere(scope, {}) },
        orders: { where: inventoryWhere(scope, {}) }
      }
    });
    if (!request) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

    if (action === "update") {
      if (request.status !== "DRAFT") {
        return NextResponse.json({ error: "Solo se puede editar un borrador" }, { status: 400 });
      }
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json({ error: "Agrega al menos un producto" }, { status: 400 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        await tx.purchaseRequestItem.deleteMany({ where: inventoryWhere(scope, { purchaseRequestId: request.id }) });
        return tx.purchaseRequest.update({
          where: { id: request.id },
          data: {
            branchId: body.branchId || request.branchId,
            notes: body.notes || null,
            items: {
              create: body.items.map((it: any) => ({
                tenantId: scope.tenantId,
                productId: it.productId,
                quantity: Number(it.quantity || 0),
                unitId: it.unitId || null,
                supplierId: it.supplierId || null,
                notes: it.notes || null
              }))
            }
          },
          include: {
            items: { where: inventoryWhere(scope, {}), include: { product: true } },
            orders: { where: inventoryWhere(scope, {}) }
          }
        });
      });
      return NextResponse.json({ data: mapPurchaseRequest(updated) });
    }

    if (action === "submit") {
      if (!["Administrador", "Operador"].includes(role as any)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      if (request.status !== "DRAFT") {
        return NextResponse.json({ error: "Solo borradores pueden enviarse" }, { status: 400 });
      }
      const updated = await prisma.purchaseRequest.update({
        where: { id: request.id },
        data: { status: "SUBMITTED" },
        include: {
          items: { where: inventoryWhere(scope, {}), include: { product: true } },
          orders: { where: inventoryWhere(scope, {}) }
        }
      });
      return NextResponse.json({ data: mapPurchaseRequest(updated) });
    }

    if (action === "approve") {
      if (role !== "Administrador") return NextResponse.json({ error: "Solo administrador puede aprobar" }, { status: 403 });
      if (request.status !== "SUBMITTED") return NextResponse.json({ error: "Debe estar enviada" }, { status: 400 });
      const updated = await prisma.purchaseRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED" },
        include: {
          items: { where: inventoryWhere(scope, {}), include: { product: true } },
          orders: { where: inventoryWhere(scope, {}) }
        }
      });
      return NextResponse.json({ data: mapPurchaseRequest(updated) });
    }

    if (action === "reject") {
      if (role !== "Administrador") return NextResponse.json({ error: "Solo administrador puede rechazar" }, { status: 403 });
      if (request.status !== "SUBMITTED") return NextResponse.json({ error: "Debe estar enviada" }, { status: 400 });
      const updated = await prisma.purchaseRequest.update({
        where: { id: request.id },
        data: { status: "REJECTED", notes: body.notes || request.notes },
        include: {
          items: { where: inventoryWhere(scope, {}), include: { product: true } },
          orders: { where: inventoryWhere(scope, {}) }
        }
      });
      return NextResponse.json({ data: mapPurchaseRequest(updated) });
    }

    if (action === "cancel") {
      if (role !== "Administrador") return NextResponse.json({ error: "Solo administrador puede cancelar" }, { status: 403 });
      const allowed: PurchaseRequestStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "ORDERED"];
      if (!allowed.includes(request.status as PurchaseRequestStatus)) {
        return NextResponse.json({ error: "Estado no permite cancelación" }, { status: 400 });
      }
      const updated = await prisma.purchaseRequest.update({
        where: { id: request.id },
        data: { status: "CANCELLED" },
        include: {
          items: { where: inventoryWhere(scope, {}), include: { product: true } },
          orders: { where: inventoryWhere(scope, {}) }
        }
      });
      return NextResponse.json({ data: mapPurchaseRequest(updated) });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la solicitud" }, { status: 400 });
  }
}
