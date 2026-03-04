import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/inventory/auth";
import { resolveInventoryScope } from "@/lib/inventory/scope";
import { calculateCierreSat } from "@/lib/inventory/cierreSat";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;

  const { searchParams } = req.nextUrl;
  const dateFromRaw = searchParams.get("dateFrom");
  const dateToRaw = searchParams.get("dateTo");
  const branchIdParam = searchParams.get("branchId") || undefined;
  if (scope.branchId && branchIdParam && branchIdParam !== scope.branchId) {
    return NextResponse.json({ error: "Branch fuera de alcance" }, { status: 403 });
  }
  const branchId = scope.branchId || branchIdParam;

  if (!dateFromRaw || !dateToRaw) return NextResponse.json({ error: "dateFrom y dateTo son requeridos" }, { status: 400 });

  const dateFrom = new Date(dateFromRaw);
  const dateTo = new Date(dateToRaw);
  if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
    return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
  }

  try {
    const result = await calculateCierreSat({ tenantId: scope.tenantId, dateFrom, dateTo, branchId });
    return NextResponse.json({ data: result.rows, totals: result.totals, range: result.range });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo calcular el cierre SAT" }, { status: 500 });
  }
}
