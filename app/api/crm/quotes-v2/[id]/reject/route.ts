import { NextRequest, NextResponse } from "next/server";
import { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { mapQuoteResponse } from "../../utils";
import { auditLog } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_APPROVE);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const rejectionReason = body.rejectionReason ? String(body.rejectionReason) : "";
    if (!rejectionReason) return NextResponse.json({ error: "rejectionReason requerido" }, { status: 400 });

    const quoteId = params.id;
    if (!quoteId) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { items: true } });
    if (!quote) return NextResponse.json({ error: "Cotizacion no encontrada" }, { status: 404 });
    if ([QuoteStatus.SENT, QuoteStatus.APPROVED].includes(quote.status)) {
      return NextResponse.json({ error: "No puedes rechazar una cotizacion ya enviada o aprobada" }, { status: 400 });
    }

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: QuoteStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedById: auth.user?.id || auth.role,
        rejectionReason,
        isActive: false
      },
      include: { items: true }
    });

    await auditLog({
      action: "QUOTE_REJECTED",
      entityType: "QUOTE",
      entityId: quoteId,
      before: { status: quote.status },
      after: { status: updated.status, rejectionReason },
      user: auth.user,
      req
    });

    return NextResponse.json({ data: mapQuoteResponse(updated) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo rechazar la cotizacion" }, { status: 400 });
  }
}
