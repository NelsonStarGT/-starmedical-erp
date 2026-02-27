import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canViewClientsConfigDiagnostics } from "@/lib/clients/configDiagnostics";
import { getDomainSchemaHealthSnapshot } from "@/lib/prisma/domainSchemaHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!canViewClientsConfigDiagnostics(auth.user)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const snapshot = await getDomainSchemaHealthSnapshot();
  return NextResponse.json({
    ok: true,
    data: snapshot
  });
}
