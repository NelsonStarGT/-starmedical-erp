import { NextRequest, NextResponse } from "next/server";
import { JournalEntryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";
import { computeTotals, parseDecimal, serializeEntry } from "../_utils";

export const dynamic = "force-dynamic";

const STATUSES = Object.values(JournalEntryStatus);

function normalizeLines(rawLines: any[]) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) throw new Error("Líneas requeridas");
  if (rawLines.length < 2) throw new Error("Al menos 2 líneas");

  return rawLines.map((line, idx) => {
    const accountId = String(line.accountId || "").trim();
    if (!accountId) throw new Error(`accountId requerido en línea ${idx + 1}`);
    const debit = line.debit !== undefined ? parseDecimal(line.debit, "debit") : new Prisma.Decimal(0);
    const credit = line.credit !== undefined ? parseDecimal(line.credit, "credit") : new Prisma.Decimal(0);
    if (debit.equals(0) && credit.equals(0)) throw new Error(`Debe o Haber requerido en línea ${idx + 1}`);

    return {
      accountId,
      debit,
      credit,
      memo: line.memo ? String(line.memo) : undefined,
      entityType: line.entityType || null,
      entityId: line.entityId ? String(line.entityId) : null
    };
  });
}

export async function GET(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const params = req.nextUrl.searchParams;
    const status = params.get("status");
    const from = params.get("from");
    const to = params.get("to");
    const branchId = params.get("branchId");
    const legalEntityId = params.get("legalEntityId");

    const where: Prisma.JournalEntryWhereInput = {};
    if (status && STATUSES.includes(status as JournalEntryStatus)) where.status = status as JournalEntryStatus;
    if (branchId) where.branchId = branchId;
    if (legalEntityId) where.legalEntityId = legalEntityId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: { lines: { include: { account: true } } }
    });

    return NextResponse.json({ data: entries.map(serializeEntry) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener los asientos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const legalEntityId = body.legalEntityId ? String(body.legalEntityId) : null;
    const date = body.date ? new Date(body.date) : new Date();
    const reference = body.reference ? String(body.reference) : null;
    const description = body.description ? String(body.description) : null;
    const branchId = body.branchId ? String(body.branchId) : null;
    const createdById = body.createdById ? String(body.createdById) : "admin";
    const lines = normalizeLines(body.lines || []);

    // validate accounts exist
    const accountIds = lines.map((l) => l.accountId);
    const accounts = await prisma.account.findMany({ where: { id: { in: accountIds } } });
    if (accounts.length !== accountIds.length) {
      return NextResponse.json({ error: "Alguna cuenta no existe" }, { status: 400 });
    }

    if (legalEntityId) {
      const entity = await prisma.legalEntity.findUnique({ where: { id: legalEntityId } });
      if (!entity) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    const totals = computeTotals(lines);
    const entry = await prisma.journalEntry.create({
      data: {
        legalEntityId,
        date,
        reference,
        description,
        branchId,
        createdById,
        status: JournalEntryStatus.DRAFT,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        lines: {
          create: lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            memo: l.memo,
            entityType: l.entityType,
            entityId: l.entityId
          }))
        }
      },
      include: { lines: { include: { account: true } } }
    });

    return NextResponse.json({ data: serializeEntry(entry) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear el asiento" }, { status: 400 });
  }
}
