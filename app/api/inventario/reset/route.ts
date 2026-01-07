import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Reset deshabilitado en producción" }, { status: 403 });
  }
  const confirm = req.headers.get("x-reset-confirm");
  if (confirm !== "YES") {
    return NextResponse.json({ error: "Falta confirmación x-reset-confirm: YES" }, { status: 400 });
  }
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "wipe_all_runtime" ? "wipe_all_runtime" : "wipe_movements";

    const deletedMovements = await prisma.inventoryMovement.deleteMany({});
    let resetStocks = 0;
    let deletedPriceItems = 0;

    if (mode === "wipe_all_runtime") {
      const delStocks = await prisma.productStock.deleteMany({});
      resetStocks = delStocks.count;
      const delPrices = await prisma.priceListItem.deleteMany({});
      deletedPriceItems = delPrices.count;
    } else {
      // set all stocks to zero
      const stocks = await prisma.productStock.findMany();
      for (const s of stocks) {
        await prisma.productStock.update({ where: { id: s.id }, data: { stock: 0 } });
        resetStocks += 1;
      }
    }

    return NextResponse.json({
      mode,
      deletedMovements: deletedMovements.count,
      resetStocks,
      deletedPriceItems
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo ejecutar reset" }, { status: 500 });
  }
}
