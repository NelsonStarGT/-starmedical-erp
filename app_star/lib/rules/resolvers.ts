import { prisma } from "@/lib/prisma";
import { CrmDealStage, QuoteStatus } from "@prisma/client";

export type RuleContext = {
  deal: any;
  account?: any;
  contact?: any;
  quotes?: any[];
  pipeline?: any;
};

export async function loadRuleContext(dealId: string) {
  const deal = await prisma.crmDeal.findUnique({
    where: { id: dealId },
    include: {
      account: true,
      contact: true,
      services: true,
      activities: true,
      quotesV2: { orderBy: { createdAt: "desc" } },
      pipeline: true
    }
  });
  if (!deal) return null;
  return {
    deal,
    account: deal.account,
    contact: deal.contact,
    quotes: deal.quotesV2,
    pipeline: deal.pipeline
  } as RuleContext;
}

export function resolveField(ctx: RuleContext, path: string) {
  const [head, ...rest] = path.split(".");
  const base =
    head === "deal"
      ? ctx.deal
      : head === "contact"
        ? ctx.contact
        : head === "account"
          ? ctx.account
          : head === "quote"
            ? (ctx.quotes && ctx.quotes[0]) || null
            : null;
  if (!base) return undefined;
  return rest.reduce((acc: any, key) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, base);
}

export function hasActiveApprovedQuote(quotes?: any[]) {
  return (quotes || []).some((q) => q.status === QuoteStatus.APPROVED && q.isActive);
}

export function hasSentQuote(quotes?: any[]) {
  return (quotes || []).some((q) => [QuoteStatus.SENT, QuoteStatus.APPROVAL_PENDING, QuoteStatus.APPROVED].includes(q.status));
}

export function stageKeyFromDeal(deal: any) {
  const stage: CrmDealStage = deal.stage;
  return stage;
}
