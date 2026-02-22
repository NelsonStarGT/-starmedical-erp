import { NextRequest, NextResponse } from "next/server";
import { JournalEntryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";
import { computeTotals, parseDecimal, serializeEntry } from "../../_utils";

export const dynamic = "force-dynamic";

function normalizeLines(rawLines: any[]) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) throw new Error("Líneas requeridas");
  if (rawLines.length < 2) throw new Error("Al menos 2 líneas");

  return rawLines.map((line: any, idx: number) => {
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: params.id },
      include: { lines: { include: { account: true } } }
    });
    if (!entry) return NextResponse.json({ error: "Asiento no encontrado" }, { status: 404 });
    return NextResponse.json({ data: serializeEntry(entry) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener el asiento" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const entry = await prisma.journalEntry.findUnique({ where: { id: params.id }, include: { lines: true } });
    if (!entry) return NextResponse.json({ error: "Asiento no encontrado" }, { status: 404 });
    if (entry.status === JournalEntryStatus.POSTED) {
      return NextResponse.json({ error: "No se puede editar un asiento posteado" }, { status: 400 });
    }

    const data: Prisma.JournalEntryUpdateInput = {};
    if (body.date) data.date = new Date(body.date);
    if (body.reference !== undefined) data.reference = body.reference ? String(body.reference) : null;
    if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
    if (body.branchId !== undefined) data.branchId = body.branchId ? String(body.branchId) : null;
    if (body.legalEntityId !== undefined) {
      data.legalEntity = body.legalEntityId ? { connect: { id: String(body.legalEntityId) } } : { disconnect: true };
    }
    if (body.sourceType !== undefined) data.sourceType = body.sourceType ? String(body.sourceType) : null;
    if (body.sourceId !== undefined) data.sourceId = body.sourceId ? String(body.sourceId) : null;
    const createdById = body.createdById ? String(body.createdById) : undefined;
    if (createdById) data.createdById = createdById;

    let linesUpdate: ReturnType<typeof normalizeLines> | null = null;
    if (body.lines) {
      linesUpdate = normalizeLines(body.lines);
    }

    const legalEntityId =
      data.legalEntity && "connect" in data.legalEntity ? (data.legalEntity.connect as { id: string }).id : undefined;
    if (legalEntityId) {
      const entity = await prisma.legalEntity.findUnique({ where: { id: legalEntityId } });
      if (!entity) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    const operations: any[] = [];
    if (linesUpdate) {
      const totals = computeTotals(linesUpdate);
      data.totalDebit = totals.debit;
      data.totalCredit = totals.credit;
      operations.push(
        prisma.journalEntry.update({
          where: { id: params.id },
          data
        }),
        prisma.journalEntryLine.deleteMany({ where: { entryId: params.id } }),
        prisma.journalEntryLine.createMany({
          data: linesUpdate.map((l) => ({
            entryId: params.id,
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            memo: l.memo,
            entityType: l.entityType,
            entityId: l.entityId
          }))
        })
      );
    } else {
      operations.push(
        prisma.journalEntry.update({
          where: { id: params.id },
          data
        })
      );
    }

    await prisma.$transaction(operations);

    const refreshed = await prisma.journalEntry.findUnique({
      where: { id: params.id },
      include: { lines: { include: { account: true } } }
    });
    return NextResponse.json({ data: serializeEntry(refreshed!) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo actualizar el asiento" }, { status: 400 });
  }
}
