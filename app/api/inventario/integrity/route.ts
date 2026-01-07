import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/api/auth";
import { computeIntegrityFindings } from "@/lib/inventory/integrity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const findings = await computeIntegrityFindings(new Date());
    return NextResponse.json({ findings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo calcular integridad" }, { status: 500 });
  }
}
