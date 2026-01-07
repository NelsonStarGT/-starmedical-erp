import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { PERMISSIONS, enforceDealOwnership, isAdmin as isAdminRole } from "@/lib/rbac";
import { auditPermissionDenied } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(_req, PERMISSIONS.DEAL_READ);
  if (auth.errorResponse) return auth.errorResponse;
  const dealId = params.id;
  try {
    const deal = await prisma.crmDeal.findUnique({
      where: { id: dealId },
      include: {
        services: true,
        quotes: true,
        account: true,
        contact: true,
        pipeline: { include: { stages: { orderBy: { order: "asc" } } } }
      }
    });
    if (!deal) return NextResponse.json({ error: "Negociación no encontrada" }, { status: 404 });
    if (!isAdminRole(auth.user) && !enforceDealOwnership(auth.user!, deal)) {
      auditPermissionDenied(auth.user, _req, "DEAL", dealId);
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json({ data: deal });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener el pipeline" }, { status: 500 });
  }
}
