import { NextRequest, NextResponse } from "next/server";
import { requireRoles } from "@/lib/inventory/auth";
import { resolveInventoryScope } from "@/lib/inventory/scope";
import { computeIntegrityFindingsForTenant } from "@/lib/inventory/integrity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const findings = await computeIntegrityFindingsForTenant(scope.tenantId, new Date());
    return NextResponse.json({ findings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo calcular integridad" }, { status: 500 });
  }
}
