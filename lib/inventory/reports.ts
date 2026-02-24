import { MovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exportExcelViaProcessingService } from "@/lib/processing-service/excel";

type KardexParams = {
  dateFrom: Date;
  dateTo: Date;
  branchId?: string;
};

export async function generateKardexXlsx({ dateFrom, dateTo, branchId }: KardexParams) {
  const where: any = {
    createdAt: {
      gte: dateFrom,
      lte: dateTo
    }
  };
  if (branchId) where.branchId = branchId;

  const data = await prisma.inventoryMovement.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: "desc" }
  });

  const headers = [
    "Fecha",
    "Producto",
    "Código",
    "Tipo",
    "Cantidad",
    "Costo",
    "Precio",
    "Sucursal",
    "Usuario",
    "Referencia",
    "Motivo",
    "Delta"
  ];
  const rows = data.map((m) => {
    const qty = m.quantity ?? 0;
    const delta = movementDelta(m.type, qty);
    return [
      m.createdAt.toISOString(),
      `${m.product?.name || ""}`.trim(),
      (m.product as any)?.code || m.productId,
      m.type,
      qty,
      m.unitCost ?? "",
      m.salePrice ?? "",
      m.branchId,
      m.createdById,
      m.reference || "",
      m.reason || "",
      delta
    ];
  });

  const { buffer } = await exportExcelViaProcessingService({
    context: {
      tenantId: process.env.DEFAULT_TENANT_ID || "global",
      actorId: "inventory-report"
    },
    fileName: "kardex.xlsx",
    sheets: [{ name: "Kardex", headers, rows }],
    limits: {
      maxFileMb: 16,
      maxRows: 60_000,
      maxCols: 120,
      timeoutMs: 25_000
    }
  });
  return buffer;
}

function movementDelta(type: MovementType, quantity: number) {
  if (type === "EXIT") return -quantity;
  if (type === "ADJUSTMENT") return quantity;
  return quantity;
}
