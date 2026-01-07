import { NextRequest, NextResponse } from "next/server";
import { FinancialAccountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";
import { decimalToNumber } from "../_utils";

export const dynamic = "force-dynamic";

const TYPES = Object.values(FinancialAccountType);

function normalize(body: any, requireAll = true) {
  const legalEntityId = body.legalEntityId !== undefined ? String(body.legalEntityId || "") : undefined;
  const name = body.name !== undefined ? String(body.name || "").trim() : undefined;
  const type = body.type !== undefined ? String(body.type || "").toUpperCase() : undefined;
  const bankName = body.bankName !== undefined ? String(body.bankName || "").trim() : undefined;
  const accountNumber = body.accountNumber !== undefined ? String(body.accountNumber || "").trim() : undefined;
  const branchId = body.branchId !== undefined ? (body.branchId ? String(body.branchId) : null) : undefined;
  const currency = body.currency !== undefined ? String(body.currency || "").trim() : undefined;
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : undefined;

  if (requireAll) {
    if (!legalEntityId) throw new Error("legalEntityId requerido");
    if (!name) throw new Error("name requerido");
    if (!type || !TYPES.includes(type as FinancialAccountType)) throw new Error("type inválido");
  } else if (type && !TYPES.includes(type as FinancialAccountType)) {
    throw new Error("type inválido");
  }

  return {
    legalEntityId,
    name,
    type: type as FinancialAccountType | undefined,
    bankName,
    accountNumber,
    branchId,
    currency,
    isActive
  };
}

export async function GET(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const legalEntityId = req.nextUrl.searchParams.get("legalEntityId") || undefined;
    const accounts = await prisma.financialAccount.findMany({
      where: legalEntityId ? { legalEntityId } : undefined,
      orderBy: { name: "asc" }
    });

    const accountIds = accounts.map((a) => a.id);
    const grouped = accountIds.length
      ? await prisma.financialTransaction.groupBy({
          by: ["financialAccountId", "type"],
          where: { financialAccountId: { in: accountIds } },
          _sum: { amount: true }
        })
      : [];

    const balanceMap: Record<string, number> = {};
    grouped.forEach((g) => {
      const base = balanceMap[g.financialAccountId] || 0;
      const amount = decimalToNumber(g._sum.amount);
      balanceMap[g.financialAccountId] =
        g.type === "IN" ? base + amount : base - amount;
    });

    return NextResponse.json({
      data: accounts.map((a) => ({
        ...a,
        balance: balanceMap[a.id] || 0
      }))
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener las cuentas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { legalEntityId, name, type, bankName, accountNumber, branchId, currency, isActive } = normalize(body, true);

    const legalEntity = await prisma.legalEntity.findUnique({ where: { id: legalEntityId! } });
    if (!legalEntity) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

    const saved = await prisma.financialAccount.create({
      data: {
        legalEntityId: legalEntityId!,
        name: name!,
        type: type!,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        currency: currency || "GTQ",
        branchId: branchId || null,
        isActive: isActive ?? true
      }
    });
    return NextResponse.json({ data: { ...saved, balance: 0 } });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la cuenta financiera" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { legalEntityId, name, type, bankName, accountNumber, branchId, currency, isActive } = normalize(body, false);
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const data: any = {};
    if (legalEntityId !== undefined) data.legalEntityId = legalEntityId;
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (bankName !== undefined) data.bankName = bankName;
    if (accountNumber !== undefined) data.accountNumber = accountNumber;
    if (branchId !== undefined) data.branchId = branchId;
    if (currency !== undefined) data.currency = currency || "GTQ";
    if (isActive !== undefined) data.isActive = isActive;
    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.financialAccount.update({
      where: { id },
      data
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la cuenta financiera" }, { status: 400 });
  }
}
