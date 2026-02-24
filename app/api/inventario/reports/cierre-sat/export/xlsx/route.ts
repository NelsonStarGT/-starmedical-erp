import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/api/auth";
import { generateCierreSatXlsx } from "@/lib/inventory/cierreSat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = req.nextUrl;
  const dateFromRaw = searchParams.get("dateFrom");
  const dateToRaw = searchParams.get("dateTo");
  const branchId = searchParams.get("branchId") || undefined;

  if (!dateFromRaw || !dateToRaw) return NextResponse.json({ error: "dateFrom y dateTo son requeridos" }, { status: 400 });
  const dateFrom = new Date(dateFromRaw);
  const dateTo = new Date(dateToRaw);
  if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
    return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
  }

  try {
    const buffer = await generateCierreSatXlsx({ dateFrom, dateTo, branchId });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"cierre-sat-${dateFromRaw}-${dateToRaw}.xlsx\"`
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo generar el Excel" }, { status: 500 });
  }
}
