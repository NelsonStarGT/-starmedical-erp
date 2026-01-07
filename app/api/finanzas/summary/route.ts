import { NextRequest, NextResponse } from "next/server";
import { AccountType, FinancialTransactionType, JournalEntryStatus, DocStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";
import { decimalToNumber } from "../_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const legalEntityId = req.nextUrl.searchParams.get("legalEntityId") || undefined;
    if (!(prisma as any).financialTransaction) {
      throw new Error("Prisma Client desactualizado, ejecuta `npx prisma generate` y reinicia el servidor");
    }

    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const accounts = legalEntityId
      ? await prisma.financialAccount.findMany({ where: { legalEntityId }, select: { id: true } })
      : null;
    const accountIds = accounts?.map((a) => a.id);

    const [txGroups, receivables, payables, draftsCount, lines] = await Promise.all([
      prisma.financialTransaction.groupBy({
        by: ["type"],
        where: accountIds?.length ? { financialAccountId: { in: accountIds } } : undefined,
        _sum: { amount: true }
      }),
      prisma.receivable.findMany({
        where: {
          status: { in: [DocStatus.OPEN, DocStatus.PARTIAL] },
          ...(legalEntityId ? { legalEntityId } : {})
        }
      }),
      prisma.payable.findMany({
        where: {
          status: { in: [DocStatus.OPEN, DocStatus.PARTIAL] },
          ...(legalEntityId ? { legalEntityId } : {})
        }
      }),
      prisma.journalEntry.count({
        where: { status: JournalEntryStatus.DRAFT, ...(legalEntityId ? { legalEntityId } : {}) }
      }),
      prisma.journalEntryLine.findMany({
        where: {
          entry: {
            status: JournalEntryStatus.POSTED,
            date: { gte: startMonth, lt: endMonth },
            ...(legalEntityId ? { legalEntityId } : {})
          },
          account: { type: { in: [AccountType.INCOME, AccountType.EXPENSE] } }
        },
        include: { account: true }
      })
    ]);

    let cashBalance = 0;
    txGroups.forEach((g) => {
      const amount = decimalToNumber(g._sum.amount);
      cashBalance += g.type === FinancialTransactionType.IN ? amount : -amount;
    });

    const receivableOpen = receivables.reduce(
      (acc, r) => acc + (decimalToNumber(r.amount) - decimalToNumber(r.paidAmount)),
      0
    );
    const payableOpen = payables.reduce(
      (acc, p) => acc + (decimalToNumber(p.amount) - decimalToNumber(p.paidAmount)),
      0
    );

    let income = 0;
    let expense = 0;
    for (const line of lines) {
      const debit = decimalToNumber(line.debit);
      const credit = decimalToNumber(line.credit);
      if (line.account.type === AccountType.INCOME) {
        income += credit - debit;
      } else if (line.account.type === AccountType.EXPENSE) {
        expense += debit - credit;
      }
    }

    return NextResponse.json({
      data: {
        cashBalance,
        receivableOpen,
        payableOpen,
        draftsCount,
        incomeMonth: income,
        expenseMonth: expense
      }
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "No se pudieron calcular los indicadores";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
