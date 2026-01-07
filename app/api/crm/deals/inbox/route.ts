import { NextRequest, NextResponse } from "next/server";
import { CrmPipelineType, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { PERMISSIONS, dealScopeWhere } from "@/lib/rbac";
import { CRM_QUOTE_FOLLOWUP_DAYS, computeSlaStatus } from "@/lib/crmConfig";

export const dynamic = "force-dynamic";

const SLA_ORDER: Record<string, number> = { RED: 0, YELLOW: 1, GREEN: 2 };

function getPipelineType(raw?: string | null) {
  const normalized = String(raw || "").toUpperCase();
  if (normalized === "B2C") return CrmPipelineType.B2C;
  return CrmPipelineType.B2B;
}

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.DEAL_READ);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const typeParam = req.nextUrl.searchParams.get("type") || req.nextUrl.searchParams.get("pipelineType");
    const pipelineType = getPipelineType(typeParam);
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const followupCutoff = new Date(now);
    followupCutoff.setDate(followupCutoff.getDate() - CRM_QUOTE_FOLLOWUP_DAYS);

    const scope = dealScopeWhere(auth.user!);
    const deals = await prisma.crmDeal.findMany({
      where: { pipelineType, status: "OPEN", AND: [scope] },
      include: {
        account: true,
        contact: true,
        quotesV2: {
          select: { id: true, status: true, isActive: true, createdAt: true, approvedAt: true },
          orderBy: { createdAt: "desc" }
        },
        _count: { select: { quotesV2: true } }
      },
      orderBy: [{ updatedAt: "desc" }]
    });

    const normalizedDeals = deals.map((deal) => {
      const missingNextAction = !deal.nextAction || !deal.nextActionAt;
      const slaStatus = missingNextAction ? "RED" : computeSlaStatus(deal.stage, deal.stageEnteredAt);
      const quoteCount = deal._count?.quotesV2 ?? 0;
      const v2 = deal.quotesV2 || [];
      const approvedActive = v2.find((q) => q.status === QuoteStatus.APPROVED && q.isActive);
      const approvalPending = v2.find((q) => q.status === QuoteStatus.APPROVAL_PENDING);
      const sent = v2.find((q) => q.status === QuoteStatus.SENT);
      const draft = v2.find((q) => q.status === QuoteStatus.DRAFT);
      const rejected = v2.find((q) => q.status === QuoteStatus.REJECTED);
      const latestQuote = approvedActive || approvalPending || sent || draft || rejected || v2[0];
      const quoteStatus =
        (approvedActive && QuoteStatus.APPROVED) ||
        (approvalPending && QuoteStatus.APPROVAL_PENDING) ||
        (sent && QuoteStatus.SENT) ||
        (draft && QuoteStatus.DRAFT) ||
        (rejected && QuoteStatus.REJECTED) ||
        latestQuote?.status ||
        (quoteCount ? "SIN_COTIZAR" : "SIN_COTIZAR");
      return {
        ...deal,
        amount: Number(deal.amount),
        amountEstimated: Number(deal.amountEstimated),
        slaStatus,
        missingNextAction,
        quoteCount,
        quoteStatus,
        latestQuoteId: latestQuote?.id || null
      };
    });

    const pipelineActive = normalizedDeals.reduce(
      (acc, deal) => {
        acc.total += deal.amount || 0;
        acc.count += 1;
        return acc;
      },
      { total: 0, count: 0 }
    );

    const riskDeals = normalizedDeals
      .slice()
      .sort((a, b) => {
        const missingDiff = Number(b.missingNextAction) - Number(a.missingNextAction);
        if (missingDiff !== 0) return missingDiff;
        const orderDiff = (SLA_ORDER[a.slaStatus] ?? 99) - (SLA_ORDER[b.slaStatus] ?? 99);
        if (orderDiff !== 0) return orderDiff;
        return a.stageEnteredAt.getTime() - b.stageEnteredAt.getTime();
      })
      .slice(0, 12);

    const riskSummary = normalizedDeals.reduce(
      (acc, deal) => {
        if (deal.missingNextAction || deal.slaStatus === "RED" || deal.slaStatus === "YELLOW") {
          acc.total += deal.amount || 0;
          acc.count += 1;
        }
        return acc;
      },
      { total: 0, count: 0 }
    );

    const nextActions = normalizedDeals
      .filter((deal) => deal.nextActionAt && deal.nextActionAt >= startOfDay && deal.nextActionAt <= endOfDay)
      .sort((a, b) => (a.nextActionAt?.getTime() || 0) - (b.nextActionAt?.getTime() || 0))
      .slice(0, 20);

    const wonThisMonth = await prisma.crmDeal.aggregate({
      where: {
        pipelineType,
        stage: "GANADO",
        updatedAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1)
        },
        AND: [scope]
      },
      _count: { _all: true },
      _sum: { amount: true }
    });

    const quoteFollowups = await prisma.quote.findMany({
      where: {
        status: QuoteStatus.SENT,
        createdAt: { lt: followupCutoff },
        deal: { pipelineType, status: "OPEN" }
      },
      include: { deal: { include: { account: true, contact: true } } },
      orderBy: [{ createdAt: "asc" }],
      take: 12
    });

    return NextResponse.json({
      data: {
        summary: {
          pipelineActive: {
            total: pipelineActive.total,
            count: pipelineActive.count
          },
          risk: riskSummary,
          nextActionsToday: nextActions.length,
          wonThisMonth: {
          total: Number(wonThisMonth._sum.amount || 0),
          count: wonThisMonth._count._all
        }
      },
        riskDeals,
        nextActions,
        quoteFollowups: quoteFollowups.map((quote) => ({
          ...quote,
          subtotal: Number(quote.subtotal),
          discountTotal: Number(quote.discountTotal),
          total: Number(quote.total),
          quoteNumber: quote.number,
          deal: quote.deal
            ? {
                ...quote.deal,
                amount: Number(quote.deal.amount),
                amountEstimated: Number(quote.deal.amountEstimated)
              }
            : null
        }))
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo cargar la bandeja" }, { status: 500 });
  }
}
