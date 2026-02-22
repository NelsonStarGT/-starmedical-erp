import { NextRequest, NextResponse } from "next/server";
import { DiagnosticItemKind, DiagnosticItemStatus, IntegrationInboxStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";
import { hl7OruSchema } from "@/lib/diagnostics/schemas";
import { computeResultFlag, syncDiagnosticOrderStatus } from "@/lib/diagnostics/service";
import { auditLog } from "@/lib/audit";

export const runtime = "nodejs";

function tokenAuthorized(req: NextRequest) {
  const token =
    req.headers.get("x-integration-token") ||
    (req.headers.get("authorization") || "").replace(/Bearer\s+/i, "");
  const expected = process.env.DIAGNOSTICS_INTEGRATION_TOKEN || process.env.INTEGRATION_SHARED_TOKEN;
  return Boolean(expected && token && token === expected);
}

export async function POST(req: NextRequest) {
  const useToken = tokenAuthorized(req);
  const auth = useToken ? { user: null, errorResponse: null } : requireDiagnosticsPermission(req, "DIAG:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = hl7OruSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Payload inválido" }, { status: 400 });
    }
    const input = parsed.data;

    const specimen = await prisma.labSpecimen.findUnique({
      where: { specimenCode: input.orderExternalId },
      include: {
        orderItem: {
          include: {
            catalogItem: { select: { kind: true } }
          }
        }
      }
    });

    if (!specimen || specimen.orderItem.catalogItem.kind !== DiagnosticItemKind.LAB) {
      const inbox = await prisma.integrationInbox.create({
        data: {
          source: "HL7_ORU",
          externalId: input.orderExternalId,
          patientExternalId: input.patientExternalId,
          status: IntegrationInboxStatus.FAILED,
          reason: "No se encontró la muestra/orden",
          payloadJson: input
        }
      });
      return NextResponse.json({ error: "No se encontró la orden", inboxId: inbox.id }, { status: 202 });
    }

    const orderItemId = specimen.orderItemId;
    const orderId = specimen.orderItem.orderId;

    await prisma.$transaction(async (tx) => {
      for (const res of input.results) {
        const valueAsNumber = typeof res.value === "number" ? res.value : Number(res.value);
        const hasNumeric = !Number.isNaN(valueAsNumber);
        const refLow = res.refLow !== undefined ? Number(res.refLow) : undefined;
        const refHigh = res.refHigh !== undefined ? Number(res.refHigh) : undefined;
        const flag = computeResultFlag(hasNumeric ? valueAsNumber : null, refLow ?? null, refHigh ?? null);

        const resultAt = res.observedAt ? new Date(res.observedAt) : new Date();
        const safeResultAt = Number.isNaN(resultAt.getTime()) ? new Date() : resultAt;

        const data = {
          orderItemId,
          testCode: res.testCode,
          valueText: hasNumeric ? null : String(res.value),
          valueNumber: hasNumeric ? new Prisma.Decimal(valueAsNumber) : null,
          unit: res.unit || null,
          refLow: refLow !== undefined && !Number.isNaN(refLow) ? new Prisma.Decimal(refLow) : null,
          refHigh: refHigh !== undefined && !Number.isNaN(refHigh) ? new Prisma.Decimal(refHigh) : null,
          flag,
          resultAt: safeResultAt,
          enteredByUserId: auth.user?.id || null
        };

        const existing = await tx.labResult.findFirst({
          where: { orderItemId, testCode: res.testCode }
        });

        if (existing && (existing.validatedAt || existing.releasedAt)) {
          continue;
        }

        if (existing) {
          await tx.labResult.update({ where: { id: existing.id }, data });
        } else {
          await tx.labResult.create({ data });
        }
      }

      await tx.diagnosticOrderItem.update({
        where: { id: orderItemId },
        data: { status: DiagnosticItemStatus.PENDING_VALIDATION }
      });
    });

    await syncDiagnosticOrderStatus(orderId);

    await auditLog({
      action: "HL7_ORU_RECEIVED",
      entityType: "DiagnosticOrder",
      entityId: orderId,
      user: auth.user,
      req,
      metadata: { specimenCode: input.orderExternalId, results: input.results.length }
    });

    return NextResponse.json({ ok: true, orderItemId, orderId });
  } catch (err: any) {
    console.error("hl7 oru error", err);
    return NextResponse.json({ error: "No se pudo procesar el mensaje" }, { status: 500 });
  }
}
