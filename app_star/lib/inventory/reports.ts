import ExcelJS from "exceljs";
import { MovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Kardex");
  ws.columns = [
    { header: "Fecha", key: "fecha", width: 20 },
    { header: "Producto", key: "producto", width: 30 },
    { header: "Código", key: "codigo", width: 18 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Cantidad", key: "cantidad", width: 12 },
    { header: "Costo", key: "costo", width: 12 },
    { header: "Precio", key: "precio", width: 12 },
    { header: "Sucursal", key: "sucursal", width: 16 },
    { header: "Usuario", key: "usuario", width: 16 },
    { header: "Referencia", key: "referencia", width: 24 },
    { header: "Motivo", key: "motivo", width: 20 },
    { header: "Delta", key: "delta", width: 12 }
  ];

  data.forEach((m) => {
    const qty = m.quantity ?? 0;
    const delta = movementDelta(m.type, qty);
    ws.addRow({
      fecha: m.createdAt.toISOString(),
      producto: `${m.product?.name || ""}`.trim(),
      codigo: (m.product as any)?.code || m.productId,
      tipo: m.type,
      cantidad: qty,
      costo: m.unitCost ?? "",
      precio: m.salePrice ?? "",
      sucursal: m.branchId,
      usuario: m.createdById,
      referencia: m.reference || "",
      motivo: m.reason || "",
      delta
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function movementDelta(type: MovementType, quantity: number) {
  if (type === "EXIT") return -quantity;
  if (type === "ADJUSTMENT") return quantity;
  return quantity;
}
