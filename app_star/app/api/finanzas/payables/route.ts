import { NextRequest, NextResponse } from "next/server";
import { DocStatus, FlowType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";
import { decimalToNumber, parseDecimal } from "../_utils";

export const dynamic = "force-dynamic";

const STATUSES = Object.values(DocStatus);

function normalizeAttachments(raw: any) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => ({
      fileUrl: String(a.fileUrl || ""),
      fileName: String(a.fileName || ""),
      mimeType: String(a.mimeType || ""),
      sizeBytes: Number(a.sizeBytes || 0)
    }))
    .filter((a) => a.fileUrl && a.fileName && a.mimeType && a.sizeBytes > 0);
}

export async function GET(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const params = req.nextUrl.searchParams;
    const status = params.get("status");
    const legalEntityId = params.get("legalEntityId");
    const where: Prisma.PayableWhereInput = {};
    if (status && STATUSES.includes(status as DocStatus)) where.status = status as DocStatus;
    if (legalEntityId) where.legalEntityId = legalEntityId;
    const payables = await prisma.payable.findMany({
      where,
      orderBy: [{ date: "desc" }],
      take: 200,
      include: { party: true, attachments: true, category: true, subcategory: true }
    });
    return NextResponse.json({
      data: payables.map((p) => ({
        ...p,
        amount: decimalToNumber(p.amount),
        paidAmount: decimalToNumber(p.paidAmount)
      }))
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener las CxP" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const legalEntityId = String(body.legalEntityId || "");
    const partyId = String(body.partyId || "");
    if (!legalEntityId) return NextResponse.json({ error: "legalEntityId requerido" }, { status: 400 });
    if (!partyId) return NextResponse.json({ error: "partyId requerido" }, { status: 400 });
    const date = body.date ? new Date(body.date) : new Date();
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    const amount = parseDecimal(body.amount, "amount");
    const reference = body.reference ? String(body.reference) : null;
    const categoryId = body.categoryId ? String(body.categoryId) : null;
    const subcategoryId = body.subcategoryId ? String(body.subcategoryId) : null;
    const attachments = normalizeAttachments(body.attachments);

    if (!attachments.length) return NextResponse.json({ error: "Adjunta factura/recibo" }, { status: 400 });

    const [entity, party] = await Promise.all([
      prisma.legalEntity.findUnique({ where: { id: legalEntityId } }),
      prisma.party.findUnique({ where: { id: partyId } })
    ]);
    if (!entity) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    if (!party) return NextResponse.json({ error: "Tercero no encontrado" }, { status: 404 });

    if (categoryId) {
      const category = await prisma.financeCategory.findUnique({ where: { id: categoryId } });
      if (!category || category.flowType !== FlowType.EXPENSE) {
        return NextResponse.json({ error: "Categoría de gasto inválida" }, { status: 400 });
      }
    }
    if (subcategoryId) {
      const sub = await prisma.financeSubcategory.findUnique({ where: { id: subcategoryId } });
      if (!sub) return NextResponse.json({ error: "Subcategoría inválida" }, { status: 400 });
    }

    const saved = await prisma.payable.create({
      data: {
        legalEntityId,
        partyId,
        date,
        dueDate,
        amount,
        paidAmount: new Prisma.Decimal(0),
        status: DocStatus.OPEN,
        reference,
        categoryId,
        subcategoryId,
        attachments: {
          create: attachments.map((a) => ({
            fileUrl: a.fileUrl,
            fileName: a.fileName,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes
          }))
        }
      },
      include: { party: true, attachments: true, category: true, subcategory: true }
    });
    return NextResponse.json({
      data: { ...saved, amount: decimalToNumber(saved.amount), paidAmount: decimalToNumber(saved.paidAmount) }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la CxP" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const data: Prisma.PayableUpdateInput = {};
    if (body.partyId !== undefined) data.party = { connect: { id: String(body.partyId) } };
    if (body.date) data.date = new Date(body.date);
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.amount !== undefined) data.amount = parseDecimal(body.amount, "amount");
    if (body.paidAmount !== undefined) data.paidAmount = parseDecimal(body.paidAmount, "paidAmount");
    if (body.reference !== undefined) data.reference = body.reference ? String(body.reference) : null;
    if (body.status && STATUSES.includes(String(body.status) as DocStatus)) {
      data.status = String(body.status) as DocStatus;
    }
    if (body.categoryId !== undefined) {
      data.category = body.categoryId ? { connect: { id: String(body.categoryId) } } : { disconnect: true };
    }
    if (body.subcategoryId !== undefined) {
      data.subcategory = body.subcategoryId ? { connect: { id: String(body.subcategoryId) } } : { disconnect: true };
    }
    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.payable.update({
      where: { id },
      data,
      include: { party: true, attachments: true, category: true, subcategory: true }
    });
    return NextResponse.json({
      data: { ...saved, amount: decimalToNumber(saved.amount), paidAmount: decimalToNumber(saved.paidAmount) }
    });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la CxP" }, { status: 400 });
  }
}
