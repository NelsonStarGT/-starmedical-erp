import { NextRequest, NextResponse } from "next/server";
import {
  PaymentType,
  DocStatus,
  FinancialTransactionType,
  PaymentMethod,
  Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";
import { decimalToNumber, parseDecimal } from "../_utils";

export const dynamic = "force-dynamic";

const TYPES = Object.values(PaymentType);
const METHODS = Object.values(PaymentMethod);

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

export async function POST(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const legalEntityId = String(body.legalEntityId || "");
    const type = String(body.type || "").toUpperCase();
    const method = String(body.method || "").toUpperCase();
    const financialAccountId = String(body.financialAccountId || "");
    const reference = body.reference ? String(body.reference) : null;
    const createdById = body.createdById ? String(body.createdById) : "admin";
    const date = body.date ? new Date(body.date) : new Date();
    const amount = parseDecimal(body.amount, "amount");
    const attachments = normalizeAttachments(body.attachments);

    if (!legalEntityId) return NextResponse.json({ error: "legalEntityId requerido" }, { status: 400 });
    if (!TYPES.includes(type as PaymentType)) return NextResponse.json({ error: "type inválido" }, { status: 400 });
    if (!METHODS.includes(method as PaymentMethod)) return NextResponse.json({ error: "method inválido" }, { status: 400 });
    if (!financialAccountId) return NextResponse.json({ error: "financialAccountId requerido" }, { status: 400 });

    const [legalEntity, finAccount] = await Promise.all([
      prisma.legalEntity.findUnique({ where: { id: legalEntityId } }),
      prisma.financialAccount.findUnique({ where: { id: financialAccountId } })
    ]);
    if (!legalEntity) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    if (!finAccount || finAccount.legalEntityId !== legalEntityId) {
      return NextResponse.json({ error: "Cuenta financiera inválida" }, { status: 400 });
    }
    if (!finAccount.isActive) return NextResponse.json({ error: "Cuenta financiera inactiva" }, { status: 400 });

    if (type === PaymentType.AR) {
      const receivableId = String(body.receivableId || "");
      if (!receivableId) return NextResponse.json({ error: "receivableId requerido" }, { status: 400 });
      const receivable = await prisma.receivable.findUnique({ where: { id: receivableId } });
      if (!receivable || receivable.legalEntityId !== legalEntityId) {
        return NextResponse.json({ error: "CxC no encontrada" }, { status: 404 });
      }
      if (receivable.status === DocStatus.PAID || receivable.status === DocStatus.CANCELLED) {
        return NextResponse.json({ error: "La CxC no admite más pagos" }, { status: 400 });
      }

      const newPaid = (receivable.paidAmount as Prisma.Decimal).add(amount);
      const newStatus = newPaid.gte(receivable.amount as Prisma.Decimal) ? DocStatus.PAID : DocStatus.PARTIAL;

      const [updatedRec, payment] = await prisma.$transaction([
        prisma.receivable.update({
          where: { id: receivableId },
          data: { paidAmount: newPaid, status: newStatus }
        }),
        prisma.payment.create({
          data: {
            legalEntityId,
            type: PaymentType.AR,
            receivableId,
            financialAccountId,
            method: method as PaymentMethod,
            date,
            amount,
            reference,
            createdById,
            attachments: attachments.length
              ? {
                  create: attachments.map((a) => ({
                    fileUrl: a.fileUrl,
                    fileName: a.fileName,
                    mimeType: a.mimeType,
                    sizeBytes: a.sizeBytes
                  }))
                }
              : undefined
          }
        }),
        prisma.financialTransaction.create({
          data: {
            financialAccountId,
            type: FinancialTransactionType.IN,
            amount,
            date,
            description: `Pago CxC ${receivable.reference || receivable.id}`,
            reference,
            createdById
          }
        })
      ]);

      return NextResponse.json({
        data: {
          ...payment,
          amount: decimalToNumber(payment.amount),
          receivable: {
            ...updatedRec,
            amount: decimalToNumber(updatedRec.amount),
            paidAmount: decimalToNumber(updatedRec.paidAmount)
          }
        }
      });
    }

    const payableId = String(body.payableId || "");
    if (!payableId) return NextResponse.json({ error: "payableId requerido" }, { status: 400 });
    const payable = await prisma.payable.findUnique({ where: { id: payableId } });
    if (!payable || payable.legalEntityId !== legalEntityId) {
      return NextResponse.json({ error: "CxP no encontrada" }, { status: 404 });
    }
    if (payable.status === DocStatus.PAID || payable.status === DocStatus.CANCELLED) {
      return NextResponse.json({ error: "La CxP no admite más pagos" }, { status: 400 });
    }

    const newPaid = (payable.paidAmount as Prisma.Decimal).add(amount);
    const newStatus = newPaid.gte(payable.amount as Prisma.Decimal) ? DocStatus.PAID : DocStatus.PARTIAL;

    const [updatedPayable, payment] = await prisma.$transaction([
      prisma.payable.update({
        where: { id: payableId },
        data: { paidAmount: newPaid, status: newStatus }
      }),
      prisma.payment.create({
        data: {
          legalEntityId,
          type: PaymentType.AP,
          payableId,
          financialAccountId,
          method: method as PaymentMethod,
          date,
          amount,
          reference,
          createdById,
          attachments: attachments.length
            ? {
                create: attachments.map((a) => ({
                  fileUrl: a.fileUrl,
                  fileName: a.fileName,
                  mimeType: a.mimeType,
                  sizeBytes: a.sizeBytes
                }))
              }
            : undefined
        }
      }),
      prisma.financialTransaction.create({
        data: {
          financialAccountId,
          type: FinancialTransactionType.OUT,
          amount,
          date,
          description: `Pago CxP ${payable.reference || payable.id}`,
          reference,
          createdById
        }
      })
    ]);

    return NextResponse.json({
      data: {
        ...payment,
        amount: decimalToNumber(payment.amount),
        payable: {
          ...updatedPayable,
          amount: decimalToNumber(updatedPayable.amount),
          paidAmount: decimalToNumber(updatedPayable.paidAmount)
        }
      }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo registrar el pago" }, { status: 400 });
  }
}
