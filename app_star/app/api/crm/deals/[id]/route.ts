import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { computeSlaStatus } from "@/lib/crmConfig";
import { PERMISSIONS, enforceDealOwnership, isAdmin as isAdminRole } from "@/lib/rbac";
import { auditPermissionDenied } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.DEAL_READ);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const resolvedParams = await params;
    const idParam = resolvedParams?.id || req.nextUrl.searchParams.get("id") || req.nextUrl.pathname.split("/").pop() || "";
    if (!idParam) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const deal = await prisma.crmDeal.findUnique({
      where: { id: idParam },
      include: {
        account: true,
        contact: true,
        services: true,
        activities: { orderBy: { dateTime: "desc" } },
        quotes: { orderBy: { createdAt: "desc" } },
        quotesV2: { orderBy: { createdAt: "desc" }, include: { items: true } },
        stageHistory: { orderBy: { changedAt: "desc" } },
        calendarEvents: { orderBy: { startAt: "desc" } }
      }
    });
    if (!deal) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });
    if (!isAdminRole(auth.user) && !enforceDealOwnership(auth.user!, deal)) {
      auditPermissionDenied(auth.user, req, "DEAL", idParam);
      return NextResponse.json({ error: "Solo puedes ver tus oportunidades" }, { status: 403 });
    }
    const missingAction = !deal.nextAction || !deal.nextActionAt;
    const slaStatus = missingAction ? "RED" : computeSlaStatus(deal.stage, deal.stageEnteredAt);
    return NextResponse.json({
      data: {
        ...deal,
        amount: Number(deal.amount),
        amountEstimated: Number(deal.amountEstimated),
        missingAction,
        slaStatus,
        quotes: deal.quotes.map((quote) => ({
          ...quote,
          totalAmount: Number(quote.totalAmount),
          internalCost: Number(quote.internalCost),
          internalMargin: Number(quote.internalMargin)
        })),
        quotesV2: deal.quotesV2.map((quote) => ({
          ...quote,
          subtotal: Number(quote.subtotal),
          discountTotal: Number(quote.discountTotal),
          taxTotal: Number(quote.taxTotal),
          total: Number(quote.total),
          items: quote.items.map((it) => ({
            ...it,
            qty: Number(it.qty),
            unitPrice: Number(it.unitPrice),
            discountPct: it.discountPct ? Number(it.discountPct) : null,
            lineTotal: Number(it.lineTotal)
          }))
        }))
      }
    });
  } catch (err) {
    console.error("crm/deals/[id] error", err);
    const message = err instanceof Error ? err.message : "No se pudo cargar el deal";
    return NextResponse.json({ error: "No se pudo cargar el deal", detail: message }, { status: 500 });
  }
}
