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
    const entry = await prisma.journalEntry.findUnique({
      where: { id: params.id },
      include: { lines: true }
    });
    if (!entry) return NextResponse.json({ error: "Asiento no encontrado" }, { status: 404 });
    if (entry.status !== JournalEntryStatus.DRAFT) {
      return NextResponse.json({ error: "Solo se pueden postear asientos en borrador" }, { status: 400 });
    }
    if (!entry.lines || entry.lines.length < 2) {
      return NextResponse.json({ error: "Se requieren al menos 2 líneas para postear" }, { status: 400 });
    }

    const totals = computeTotals(entry.lines);
    if (!totals.debit.equals(totals.credit)) {
      return NextResponse.json({ error: "Debe y Haber deben cuadrar" }, { status: 400 });
    }

    const updated = await prisma.journalEntry.update({
      where: { id: entry.id },
      data: {
        status: JournalEntryStatus.POSTED,
        totalDebit: totals.debit,
        totalCredit: totals.credit
      },
      include: { lines: { include: { account: true } } }
    });

    return NextResponse.json({ data: serializeEntry(updated) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo postear el asiento" }, { status: 400 });
  }
}
