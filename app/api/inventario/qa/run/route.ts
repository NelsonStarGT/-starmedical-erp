import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/api/auth";
import { runInventoryQA } from "@/lib/inventory/qa";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "QA solo disponible en desarrollo" }, { status: 403 });
  }
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const result = await runInventoryQA(new Date());
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo ejecutar QA" }, { status: 500 });
  }
}
