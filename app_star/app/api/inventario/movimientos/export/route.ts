import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { MovementType } from "@prisma/client";
import { requireRoles } from "@/lib/api/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador", "Operador", "Recepcion"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const searchParams = req.nextUrl.searchParams;
    const productId = searchParams.get("productId") || undefined;
    const branchId = searchParams.get("branchId") || undefined;
    const type = searchParams.get("type") || undefined;
    const from = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom") as string) : undefined;
    const to = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo") as string) : undefined;

    const where: any = {};
    if (productId) where.productId = productId;
    if (branchId) where.branchId = branchId;
    if (type) where.type = type as MovementType;
    if (from || to) where.createdAt = { gte: from, lte: to };

    const data = await prisma.inventoryMovement.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: "desc" }
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Movimientos");
    ws.columns = [
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "Producto", key: "producto", width: 30 },
      { header: "Tipo", key: "tipo", width: 15 },
      { header: "Cantidad", key: "cantidad", width: 12 },
      { header: "Costo", key: "costo", width: 12 },
      { header: "Precio", key: "precio", width: 12 },
      { header: "Stock resultante", key: "stock", width: 18 },
      { header: "Usuario", key: "usuario", width: 16 },
      { header: "Referencia", key: "referencia", width: 24 },
      { header: "Motivo", key: "motivo", width: 20 }
    ];

    data.forEach((m) => {
      ws.addRow({
        fecha: m.createdAt.toISOString(),
        producto: `${m.product?.name || ""} (${(m.product as any)?.code || m.productId})`,
        tipo: m.type,
        cantidad: m.quantity ?? "",
        costo: m.unitCost ?? "",
        precio: m.salePrice ?? "",
        stock: "",
        usuario: m.createdById,
        referencia: m.reference || "",
        motivo: m.reason || ""
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=\"kardex.xlsx\""
      }
    });
  } catch (err) {
    console.error(err);
    return new NextResponse("No se pudo exportar", { status: 500 });
  }
}
