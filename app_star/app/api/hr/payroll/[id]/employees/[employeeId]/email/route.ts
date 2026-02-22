import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import { sendMail } from "@/lib/email/mailer";

export const dynamic = "force-dynamic";

async function buildPdf(runEmployeeId: string, payrollRunId: string, employeeId: string) {
  const record = await prisma.payrollRunEmployee.findFirst({
    where: { id: runEmployeeId, payrollRunId, employeeId },
    include: {
      payrollRun: { select: { code: true, status: true, runType: true, periodStart: true, periodEnd: true } },
      employee: {
        select: {
          firstName: true,
          lastName: true,
          employeeCode: true,
          dpi: true,
          biometricId: true
        }
      }
    }
  });
  if (!record) throw { status: 404, body: { error: "RUN_EMPLOYEE_NOT_FOUND" } };

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const brandPrimary = rgb(0x2e / 255, 0x75 / 255, 0xba / 255);
  let y = 740;

  page.drawText("StarMedical - Boleta de Pago", { x: margin, y, size: 20, font: titleFont, color: brandPrimary });
  y -= 24;
  page.drawText(`Corrida: ${record.payrollRun.code} (${record.payrollRun.runType}) · Estado: ${record.payrollRun.status}`, {
    x: margin,
    y,
    size: 12,
    font
  });
  y -= 18;
  page.drawText(
    `Período: ${record.payrollRun.periodStart.toISOString().slice(0, 10)} - ${record.payrollRun.periodEnd.toISOString().slice(0, 10)}`,
    { x: margin, y, size: 12, font }
  );

  y -= 28;
  page.drawLine({ start: { x: margin, y }, end: { x: 562, y }, color: brandPrimary, thickness: 1 });
  y -= 20;

  const empName = `${record.employee.firstName || ""} ${record.employee.lastName || ""}`.trim();
  page.drawText("Colaborador", { x: margin, y, size: 12, font: titleFont });
  y -= 18;
  page.drawText(`Nombre: ${empName || "N/A"}`, { x: margin, y, size: 12, font });
  y -= 16;
  page.drawText(`Código: ${record.employee.employeeCode || "N/A"}`, { x: margin, y, size: 12, font });
  y -= 16;
  page.drawText(`DPI: ${record.employee.dpi || "N/A"} · Biométrico: ${record.employee.biometricId || "N/A"}`, {
    x: margin,
    y,
    size: 12,
    font
  });

  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, record };
}

async function handler(req: NextRequest, { params }: { params: { id: string; employeeId: string } }) {
  const auth = requireHrPermission(req, "HR:PAYROLL:READ");
  if (auth.errorResponse) return auth.errorResponse;
  const body = await safeJson(req);
  const note = typeof body?.note === "string" ? body.note : "";

  const runEmployee = await prisma.payrollRunEmployee.findFirst({
    where: { payrollRunId: params.id, employeeId: params.employeeId },
    select: { id: true }
  });
  if (!runEmployee) throw { status: 404, body: { error: "RUN_EMPLOYEE_NOT_FOUND" } };

  const employee = await prisma.hrEmployee.findUnique({
    where: { id: params.employeeId },
    select: { email: true, personalEmail: true, firstName: true, lastName: true }
  });
  const toEmail = employee?.personalEmail || employee?.email;
  if (!toEmail) throw { status: 400, body: { error: "EMAIL_NOT_AVAILABLE" } };

  let pdfBytes: Uint8Array;
  let record: any;
  try {
    const built = await buildPdf(runEmployee.id, params.id, params.employeeId);
    pdfBytes = built.pdfBytes;
    record = built.record;
  } catch (err) {
    throw err;
  }

  try {
    await sendMail({
      to: [toEmail],
      subject: `Boleta de pago ${record.payrollRun.code}`,
      text: note || "Adjunto tu boleta de pago.",
      attachments: [
        {
          filename: `boleta-${record.employee.employeeCode || params.employeeId}.pdf`,
          content: Buffer.from(pdfBytes),
          contentType: "application/pdf"
        }
      ],
      tenantId: auth.user?.tenantId || "global",
      emailType: "payroll"
    });
  } catch (err: any) {
    if (err?.code === "EMAIL_NOT_CONFIGURED") throw { status: 400, body: { error: "EMAIL_NOT_CONFIGURED" } };
    throw err;
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorHandling(handler);
