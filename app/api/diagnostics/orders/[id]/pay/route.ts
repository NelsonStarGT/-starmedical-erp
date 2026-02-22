import { NextRequest, NextResponse } from "next/server";
import { DiagnosticOrderAdminStatus, DiagnosticPaymentMethod } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";
import { auditLog } from "@/lib/audit";
import { serializeDiagnosticOrder } from "@/lib/diagnostics/service";
import { updateDiagnosticOrderAdminStatus } from "@/lib/server/diagnosticsOrder.service";

type Params = { params: { id: string } };

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireDiagnosticsPermission(req, "DIAG:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const paySchema = z.object({
    paymentMethod: z.nativeEnum(DiagnosticPaymentMethod).optional(),
    paymentReference: z.string().optional(),
    insuranceId: z.string().optional()
  });

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = paySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Payload inválido" }, { status: 400 });
    }

    const previous = await prisma.diagnosticOrder.findUnique({
      where: { id },
      select: { adminStatus: true, status: true }
    });
    if (!previous) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

    const paymentMethod = parsed.data.paymentMethod || DiagnosticPaymentMethod.CASH;
    const updated = await updateDiagnosticOrderAdminStatus({
      orderId: id,
      adminStatus: DiagnosticOrderAdminStatus.PAID,
      paymentMethod,
      paymentReference: parsed.data.paymentReference,
      insuranceId: parsed.data.insuranceId,
      user: auth.user
    });

    const saved = await prisma.diagnosticOrder.findUnique({
      where: { id },
      include: {
        patient: true,
        items: {
          include: {
            catalogItem: true,
            specimen: true,
            labResults: true,
            imagingStudy: { include: { reports: true } }
          }
        }
      }
    });
    if (!saved) throw new Error("Orden pagada pero no retornada");

    await auditLog({
      action: "DIAG_ORDER_PAID",
      entityType: "DiagnosticOrder",
      entityId: id,
      user: auth.user,
      req,
      before: { adminStatus: previous.adminStatus, status: previous.status },
      after: { adminStatus: updated.adminStatus, paymentMethod: updated.paymentMethod, status: updated.status }
    });

    return NextResponse.json({ data: serializeDiagnosticOrder(saved) }, { status: 200 });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("pay order error", err);
    return NextResponse.json({ error: "No se pudo actualizar la orden" }, { status: 500 });
  }
}
