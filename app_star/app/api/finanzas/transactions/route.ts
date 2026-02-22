import { NextRequest, NextResponse } from "next/server";
import { FinancialTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";
import { parseDecimal, decimalToNumber } from "../_utils";

export const dynamic = "force-dynamic";

const TYPES = Object.values(FinancialTransactionType);

export async function GET(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const accountId = req.nextUrl.searchParams.get("accountId");
    const legalEntityId = req.nextUrl.searchParams.get("legalEntityId");
    const transactions = await prisma.financialTransaction.findMany({
      where: accountId
        ? { financialAccountId: accountId }
        : legalEntityId
          ? { account: { legalEntityId } }
          : undefined,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { account: true },
      take: 100
    });
    return NextResponse.json({
      data: transactions.map((t) => ({
        ...t,
        amount: decimalToNumber(t.amount)
      }))
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener las transacciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const legalEntityId = body.legalEntityId ? String(body.legalEntityId) : undefined;
    const financialAccountId = String(body.financialAccountId || "");
    const type = String(body.type || "").toUpperCase();
    const description = String(body.description || "").trim();
    const reference = body.reference ? String(body.reference) : null;
    const createdById = body.createdById ? String(body.createdById) : "admin";
    const date = body.date ? new Date(body.date) : new Date();
    const amount = parseDecimal(body.amount, "amount");

    if (!financialAccountId) return NextResponse.json({ error: "financialAccountId requerido" }, { status: 400 });
    if (!TYPES.includes(type as FinancialTransactionType)) return NextResponse.json({ error: "type inválido" }, { status: 400 });
    if (!description) return NextResponse.json({ error: "description requerida" }, { status: 400 });

    const account = await prisma.financialAccount.findUnique({ where: { id: financialAccountId } });
    if (!account) return NextResponse.json({ error: "Cuenta financiera no encontrada" }, { status: 404 });
    if (!account.isActive) return NextResponse.json({ error: "Cuenta financiera inactiva" }, { status: 400 });
    if (legalEntityId && account.legalEntityId !== legalEntityId) {
      return NextResponse.json({ error: "La cuenta pertenece a otra empresa" }, { status: 400 });
    }

    const saved = await prisma.financialTransaction.create({
      data: {
        financialAccountId,
        type: type as FinancialTransactionType,
        date,
        amount,
        description,
        reference,
        createdById
      }
    });
    return NextResponse.json({ data: { ...saved, amount: decimalToNumber(saved.amount) } });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la transacción" }, { status: 400 });
  }
}
