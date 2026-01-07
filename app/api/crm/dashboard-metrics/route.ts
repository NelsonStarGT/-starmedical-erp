import { NextRequest, NextResponse } from "next/server";
import { CrmPipelineType, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { PERMISSIONS, dealScopeWhere } from "@/lib/rbac";

export const dynamic = "force-dynamic";

type Range = { from?: Date; to?: Date };

function parseRange(params: URLSearchParams): Range {
  const month = params.get("month");
  const year = params.get("year");
  const fromParam = params.get("from");
  const toParam = params.get("to");

  if (month && year) {
    const m = Number(month);
    const y = Number(year);
    if (Number.isInteger(m) && Number.isInteger(y) && m >= 1 && m <= 12) {
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m, 0, 23, 59, 59, 999);
      return { from, to };
    }
  }

  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;
  const isValid = (d?: Date) => !d || !Number.isNaN(d.getTime());
  return isValid(from) && isValid(to) ? { from, to } : {};
}

function parseTypes(raw?: string | null): CrmPipelineType[] {
  const normalized = String(raw || "").toLowerCase();
  if (["empresas", "b2b"].includes(normalized)) return [CrmPipelineType.B2B];
  if (["pacientes", "b2c"].includes(normalized)) return [CrmPipelineType.B2C];
  return [CrmPipelineType.B2B, CrmPipelineType.B2C];
}

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req, [PERMISSIONS.DEAL_READ, PERMISSIONS.QUOTE_READ]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const searchParams = req.nextUrl.searchParams;
    const range = parseRange(searchParams);
    const pipelineTypes = parseTypes(searchParams.get("type"));
    const scope = dealScopeWhere(auth.user!);
    const dateFilter = range.from || range.to ? { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } : undefined;

    const dealWhere: any = { AND: [scope], pipelineType: { in: pipelineTypes } };
    if (dateFilter) dealWhere.createdAt = dateFilter;

    const quoteWhere: any = { deal: { AND: [scope, { pipelineType: { in: pipelineTypes } }] } };
    if (dateFilter) quoteWhere.createdAt = dateFilter;

    const [quotes, deals] = await Promise.all([
      prisma.quote.findMany({
        where: quoteWhere,
        select: {
          id: true,
          status: true,
          total: true,
          dealId: true,
          createdAt: true,
          deal: { select: { id: true, pipelineType: true, accountId: true, contactId: true, account: { select: { address: true } }, contact: { select: { firstName: true, lastName: true } } } }
        }
      }),
      prisma.crmDeal.findMany({
        where: dealWhere,
        select: {
          id: true,
          pipelineType: true,
          createdAt: true,
          slaStatus: true,
          nextAction: true,
          nextActionAt: true,
          account: { select: { address: true, name: true } },
          contact: { select: { firstName: true, lastName: true } },
          quotesV2: { select: { status: true, total: true, isActive: true, createdAt: true }, orderBy: { createdAt: "desc" } }
        }
      })
    ]);

    const quoteTotals = quotes.reduce(
      (acc, quote) => {
        acc.created += 1;
        if (quote.status === QuoteStatus.SENT || quote.status === QuoteStatus.APPROVAL_PENDING) acc.sent += 1;
        if (quote.status === QuoteStatus.APPROVED || quote.status === QuoteStatus.REJECTED) acc.responded += 1;
        const pendingStatuses: QuoteStatus[] = [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.APPROVAL_PENDING];
        if (pendingStatuses.includes(quote.status)) acc.pending += 1;
        if (quote.status === QuoteStatus.APPROVED) acc.approvedAmount += Number(quote.total || 0);
        return acc;
      },
      { created: 0, sent: 0, responded: 0, pending: 0, approvedAmount: 0 }
    );

    const dealsWithoutQuotes = deals.filter((deal) => !deal.quotesV2.length).length;
    quoteTotals.pending += dealsWithoutQuotes;

    const semaforo = deals.reduce(
      (acc, deal) => {
        const key = deal.slaStatus || "GREEN";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { GREEN: 0, YELLOW: 0, RED: 0 } as Record<string, number>
    );

    const pendingDeals = deals.filter((deal) => {
      const latest = deal.quotesV2[0];
      const pendingStatuses: QuoteStatus[] = [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.APPROVAL_PENDING];
      const hasPendingQuote = latest ? pendingStatuses.includes(latest.status) : true;
      const missingAction = !deal.nextAction || !deal.nextActionAt;
      return hasPendingQuote || missingAction;
    }).length;

    const approvedQuotes = quotes.filter((q) => q.status === QuoteStatus.APPROVED);
    const recurrentMap = new Map<string, number>();
    approvedQuotes.forEach((q) => {
      const key = q.deal?.accountId || q.deal?.contactId || q.dealId;
      if (!key) return;
      recurrentMap.set(key, (recurrentMap.get(key) || 0) + 1);
    });
    const recurrentClients = Array.from(recurrentMap.values()).filter((count) => count > 1).length;

    const locationsMap = new Map<string, number>();
    deals.forEach((deal) => {
      const location = (deal.account?.address || "").trim() || "Sin ubicación";
      locationsMap.set(location, (locationsMap.get(location) || 0) + 1);
    });
    const topLocations = Array.from(locationsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }));

    return NextResponse.json({
      data: {
        range: { from: range.from?.toISOString() || null, to: range.to?.toISOString() || null, type: pipelineTypes },
        quotes: {
          created: quoteTotals.created,
          sent: quoteTotals.sent,
          responded: quoteTotals.responded,
          pending: quoteTotals.pending
        },
        income: { total: quoteTotals.approvedAmount },
        pendingDeals,
        newClients: deals.length,
        recurrentClients,
        locations: topLocations,
        semaforo
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener métricas de CRM" }, { status: 500 });
  }
}
