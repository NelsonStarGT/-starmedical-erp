import { NextRequest, NextResponse } from "next/server";
import { JournalEntryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureFinancePoster } from "@/lib/api/finance";
import { computeTotals, serializeEntry } from "../../../_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureFinancePoster(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json().catch(() => ({}));
    const entry = await prisma.journalEntry.findUnique({
      where: { id: params.id },
      include: { lines: true }
    });
    if (!entry) return NextResponse.json({ error: "Asiento no encontrado" }, { status: 404 });
    if (entry.status !== JournalEntryStatus.POSTED) {
      return NextResponse.json({ error: "Solo asientos posteados pueden reversarse" }, { status: 400 });
    }

    const reversedLines = entry.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
      memo: `Reversa ${line.memo || ""}`.trim()
    }));
    const totals = computeTotals(reversedLines);

    const reversalDate = body.date ? new Date(body.date) : new Date();
    const createdById = body.createdById ? String(body.createdById) : "admin";

    const [, reversal] = await prisma.$transaction([
      prisma.journalEntry.update({
        where: { id: entry.id },
        data: { status: JournalEntryStatus.REVERSED }
      }),
      prisma.journalEntry.create({
        data: {
          date: reversalDate,
          reference: `REV-${entry.reference || entry.id}`,
          description: `Reversa de ${entry.reference || entry.id}`,
          branchId: entry.branchId,
          createdById,
          status: JournalEntryStatus.POSTED,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          lines: {
            create: reversedLines
          }
        },
        include: { lines: { include: { account: true } } }
      })
    ]);

    return NextResponse.json({ data: serializeEntry(reversal) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo reversar el asiento" }, { status: 400 });
  }
}
