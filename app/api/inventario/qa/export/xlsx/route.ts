import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/api/auth";
import { qaToWorkbook, runInventoryQA } from "@/lib/inventory/qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "QA solo disponible en desarrollo" }, { status: 403 });
  }
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { findings } = await runInventoryQA(new Date());
    const buffer = await qaToWorkbook(findings);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=\"qa-inventario.xlsx\""
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo exportar QA" }, { status: 500 });
  }
}
