import { NextRequest, NextResponse } from "next/server";
import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/api/auth";
import { deriveOrderStatusFromItems, deriveRequestStatusFromOrder, mapPurchaseOrder } from "@/lib/inventory/purchases";
import { registerInventoryMovement } from "@/lib/inventory/movements";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const data = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { items: { include: { product: true } }, request: true }
    });
    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ data: mapPurchaseOrder(data) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener la orden" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const action = body.action || "update";
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { items: true, request: true }
    });
    if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

    if (action === "update") {
      if (order.status !== "DRAFT") return NextResponse.json({ error: "Solo borradores pueden editarse" }, { status: 400 });
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json({ error: "Agrega items" }, { status: 400 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: order.id } });
        return tx.purchaseOrder.update({
          where: { id: order.id },
          data: {
            supplierId: body.supplierId || order.supplierId,
            branchId: body.branchId || order.branchId,
            notes: body.notes || null,
            items: {
              create: body.items.map((it: any) => ({
                productId: it.productId,
                quantity: Number(it.quantity || 0),
                unitCost: it.unitCost ? new Prisma.Decimal(it.unitCost) : null
              }))
            }
          },
          include: { items: { include: { product: true } }, request: true }
        });
      });
      return NextResponse.json({ data: mapPurchaseOrder(updated) });
    }

    if (action === "send") {
      if (order.status !== "DRAFT") return NextResponse.json({ error: "Solo borradores pueden enviarse" }, { status: 400 });
      const updated = await prisma.purchaseOrder.update({
        where: { id: order.id },
        data: { status: "SENT" },
        include: { items: { include: { product: true } }, request: true }
      });
      return NextResponse.json({ data: mapPurchaseOrder(updated) });
    }

    if (action === "cancel") {
      if (order.status === "RECEIVED") return NextResponse.json({ error: "No se puede cancelar una orden recibida" }, { status: 400 });
      const updated = await prisma.purchaseOrder.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
        include: { items: { include: { product: true } }, request: true }
      });
      return NextResponse.json({ data: mapPurchaseOrder(updated) });
    }

    if (action === "receive") {
      const receiveItems = Array.isArray(body.items) ? body.items : [];
      if (!body.createdById) return NextResponse.json({ error: "createdById requerido" }, { status: 400 });
      if (!body.reference) return NextResponse.json({ error: "Referencia de factura o guía requerida" }, { status: 400 });
      if (receiveItems.length === 0) return NextResponse.json({ error: "No hay cantidades a recibir" }, { status: 400 });

      const updated = await prisma.$transaction(async (tx) => {
        const originalItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
        let applied = 0;

        for (const rec of receiveItems) {
          const target = originalItems.find((it) => it.id === rec.itemId || it.productId === rec.productId);
          if (!target) continue;
          const currentReceived = Number(target.receivedQty || 0);
          const remaining = target.quantity - currentReceived;
          const incoming = Number(rec.quantity || 0);
          if (incoming <= 0 || remaining <= 0) continue;
          if (incoming > remaining) throw new Error("No se puede recibir más de lo pendiente");
          const delta = Math.min(remaining, incoming);
          applied += delta;
          await tx.purchaseOrderItem.update({
            where: { id: target.id },
            data: {
              receivedQty: currentReceived + delta,
              unitCost: rec.unitCost ? new Prisma.Decimal(rec.unitCost) : target.unitCost
            }
          });
          await registerInventoryMovement(
            {
              productId: target.productId,
              branchId: order.branchId,
              type: "ENTRY",
              quantity: delta,
              unitCost: rec.unitCost ?? (target.unitCost ? Number(target.unitCost) : undefined),
              reference: `${order.code} | Ref: ${body.reference}`,
              reason: "Compra proveedor",
              createdById: body.createdById
            },
            tx
          );
        }

        if (applied === 0) throw new Error("No hay cantidades válidas para recibir");

        const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
        const nextStatus = deriveOrderStatusFromItems(
          refreshedItems.map((i) => ({ quantity: i.quantity, receivedQty: i.receivedQty })),
          order.status as PurchaseOrderStatus
        );

        const updatedOrder = await tx.purchaseOrder.update({
          where: { id: order.id },
          data: { status: nextStatus },
          include: { items: { include: { product: true } }, request: true }
        });

        if (order.requestId) {
          await tx.purchaseRequest.update({
            where: { id: order.requestId },
            data: { status: deriveRequestStatusFromOrder(nextStatus, order.request?.status || "ORDERED") }
          });
        }

        return updatedOrder;
      });

      return NextResponse.json({ data: mapPurchaseOrder(updated) });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la orden" }, { status: 400 });
  }
}
