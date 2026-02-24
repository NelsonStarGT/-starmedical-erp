import { NextRequest, NextResponse } from "next/server";
import { buildTemplate, ImportKind } from "@/lib/inventory/import";
import { requirePermission } from "@/lib/api/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { kind: string } }) {
  try {
    const perm = requirePermission(_, "importar_inventario");
    if (perm) return perm;
    const kind = params.kind as ImportKind;
    if (!["productos", "stock", "precios", "costos", "servicios", "combos"].includes(kind)) {
      return new NextResponse("Plantilla no soportada", { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    const buffer = await buildTemplate(kind);
    const filename = `${kind}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.byteLength.toString()
      }
    });
  } catch (err) {
    console.error(err);
    return new NextResponse("No se pudo generar la plantilla", {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
}
