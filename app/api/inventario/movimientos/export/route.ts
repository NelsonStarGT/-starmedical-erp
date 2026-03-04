import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MovementType } from "@prisma/client";
import { requireRoles } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";
import { exportExcelViaProcessingService } from "@/lib/processing-service/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador", "Operador", "Recepcion"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;

  try {
    const searchParams = req.nextUrl.searchParams;
    const productId = searchParams.get("productId") || undefined;
    const branchIdParam = searchParams.get("branchId") || undefined;
    if (scope.branchId && branchIdParam && branchIdParam !== scope.branchId) {
      return NextResponse.json({ error: "Branch fuera de alcance" }, { status: 403 });
    }
    const branchId = scope.branchId || branchIdParam;
    const type = searchParams.get("type") || undefined;
    const from = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom") as string) : undefined;
    const to = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo") as string) : undefined;

    const where: any = {};
    if (productId) where.productId = productId;
    if (branchId) where.branchId = branchId;
    if (type) where.type = type as MovementType;
    if (from || to) where.createdAt = { gte: from, lte: to };

    const data = await prisma.inventoryMovement.findMany({
      where: inventoryWhere(scope, where, { branchScoped: true }),
      include: { product: true },
      orderBy: { createdAt: "desc" }
    });

    const headers = [
      "Fecha",
      "Producto",
      "Tipo",
      "Cantidad",
      "Costo",
      "Precio",
      "Stock resultante",
      "Usuario",
      "Referencia",
      "Motivo"
    ];
    const rows = data.map((movement) => [
      movement.createdAt.toISOString(),
      `${movement.product?.name || ""} (${(movement.product as any)?.code || movement.productId})`,
      movement.type,
      movement.quantity ?? "",
      movement.unitCost !== null && movement.unitCost !== undefined ? Number(movement.unitCost) : "",
      movement.salePrice !== null && movement.salePrice !== undefined ? Number(movement.salePrice) : "",
      "",
      movement.createdById,
      movement.reference || "",
      movement.reason || ""
    ]);
    const { buffer } = await exportExcelViaProcessingService({
      context: {
        tenantId: scope.tenantId,
        actorId: `inventory-${auth.role || "operator"}`
      },
      fileName: "kardex.xlsx",
      sheets: [
        {
          name: "Movimientos",
          headers,
          rows
        }
      ],
      limits: {
        maxFileMb: 8,
        maxRows: 30_000,
        maxCols: 120,
        timeoutMs: 20_000
      }
    });
    return new NextResponse(new Uint8Array(buffer), {
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
