import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";
import { sendDiagnosticOrderToExecution } from "@/lib/server/diagnosticsOrder.service";
import { serializeDiagnosticOrder } from "@/lib/diagnostics/service";
import { auditLog } from "@/lib/audit";

type Params = { params: { id: string } };

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireDiagnosticsPermission(req, "DIAG:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  try {
    const before = await prisma.diagnosticOrder.findUnique({
      where: { id },
      select: { adminStatus: true, status: true }
    });
    if (!before) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

    const updated = await sendDiagnosticOrderToExecution({ orderId: id, user: auth.user });

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
    if (!saved) throw new Error("Orden enviada pero no retornada");

    await auditLog({
      action: "DIAG_ORDER_SENT_TO_EXECUTION",
      entityType: "DiagnosticOrder",
      entityId: id,
      user: auth.user,
      req,
      before,
      after: { adminStatus: updated.adminStatus, status: updated.status }
    });

    return NextResponse.json({ data: serializeDiagnosticOrder(saved) }, { status: 200 });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("send-to-execution error", err);
    return NextResponse.json({ error: "No se pudo enviar la orden" }, { status: 500 });
  }
}
