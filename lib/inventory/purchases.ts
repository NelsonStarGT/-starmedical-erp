import { Prisma, PurchaseOrderStatus, PurchaseRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RequestWithItems = Prisma.PurchaseRequestGetPayload<{
  include: { items: { include: { product: true } }; orders: true };
}>;

type OrderWithItems = Prisma.PurchaseOrderGetPayload<{
  include: { items: { include: { product: true } }; request: true };
}>;

const CODE_PADDING = 6;

export async function generateSequentialCode(kind: "request" | "order", tenantId: string) {
  const prefix = kind === "request" ? "PR" : "PO";
  const latest =
    kind === "request"
      ? await prisma.purchaseRequest.findFirst({
          where: { tenantId, deletedAt: null },
          orderBy: { code: "desc" }
        })
      : await prisma.purchaseOrder.findFirst({
          where: { tenantId, deletedAt: null },
          orderBy: { code: "desc" }
        });
  const lastNum = parseCodeNumber(latest?.code, prefix);
  const next = lastNum + 1;
  return `${prefix}-${String(next).padStart(CODE_PADDING, "0")}`;
}

export function mapPurchaseRequest(data: RequestWithItems) {
  return {
    ...data,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
    items: data.items.map((item) => ({
      ...item,
      productName: item.product?.name,
      productCode: (item.product as any)?.code
    })),
    orders: data.orders?.map((o) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : (o as any).createdAt
    }))
  };
}

export function mapPurchaseOrder(data: OrderWithItems) {
  return {
    ...data,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
    items: data.items.map((item) => ({
      ...item,
      unitCost: item.unitCost ? Number((item.unitCost as any).toString()) : item.unitCost,
      productName: item.product?.name,
      productCode: (item.product as any)?.code
    })),
    request: data.request
      ? {
          id: data.request.id,
          code: data.request.code,
          status: data.request.status
        }
      : undefined
  };
}

export function deriveOrderStatusFromItems(items: { quantity: number; receivedQty: number }[], current: PurchaseOrderStatus) {
  const allReceived = items.length > 0 && items.every((i) => i.receivedQty >= i.quantity);
  const anyReceived = items.some((i) => i.receivedQty > 0);
  if (allReceived) return "RECEIVED" as PurchaseOrderStatus;
  if (anyReceived) return "RECEIVED_PARTIAL" as PurchaseOrderStatus;
  return current;
}

export function deriveRequestStatusFromOrder(orderStatus: PurchaseOrderStatus, current: PurchaseRequestStatus) {
  if (orderStatus === "RECEIVED") return "RECEIVED";
  if (orderStatus === "RECEIVED_PARTIAL") return current === "RECEIVED" ? "RECEIVED" : "RECEIVED_PARTIAL";
  if (orderStatus === "DRAFT" || orderStatus === "SENT") return current;
  return current;
}

function parseCodeNumber(code?: string | null, prefix?: string) {
  if (!code || !prefix) return 0;
  const parts = code.split("-");
  if (parts.length < 2) return 0;
  const num = Number(parts[1]);
  return Number.isNaN(num) ? 0 : num;
}
