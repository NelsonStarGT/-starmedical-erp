import { NextRequest, NextResponse } from "next/server";
import { MovementType } from "@prisma/client";
import { requireRoles } from "@/lib/inventory/auth";
import { resolveInventoryScope } from "@/lib/inventory/scope";
import { generateMovementsPdf } from "@/lib/inventory/movementsReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador", "Operador", "Recepcion"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const params = req.nextUrl.searchParams;
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: "dateFrom y dateTo son requeridos" }, { status: 400 });
    }

    const branchIdParam = params.get("branchId") || undefined;
    if (scope.branchId && branchIdParam && branchIdParam !== scope.branchId) {
      return NextResponse.json({ error: "Branch fuera de alcance" }, { status: 403 });
    }
    const branchId = scope.branchId || branchIdParam;
    const type = (params.get("type") as MovementType | null) || undefined;
    const productId = params.get("productId") || undefined;
    const createdById = params.get("createdById") || undefined;
    const generatedBy = params.get("generatedBy") || undefined;

    const buffer = await generateMovementsPdf({
      tenantId: scope.tenantId,
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      branchId,
      type,
      productId,
      createdById,
      generatedBy
    });

    const filename = `movimientos-${formatDate(dateFrom)}-${formatDate(dateTo)}.pdf`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 500 });
  }
}

function formatDate(date: string) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
