import { NextRequest, NextResponse } from "next/server";
import { MovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/api/auth";
import { generateMovementsPdf } from "@/lib/inventory/movementsReport";
import { sendMail } from "@/lib/email/mailer";
import { parseRecipients } from "@/lib/inventory/reportSchedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { dateFrom, dateTo, branchId, type, productId, createdById } = body;
    if (!dateFrom || !dateTo) return NextResponse.json({ error: "dateFrom y dateTo requeridos" }, { status: 400 });

    const pdf = await generateMovementsPdf({
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      branchId: branchId || undefined,
      type: type as MovementType | undefined,
      productId: productId || undefined,
      createdById: createdById || undefined,
      generatedBy: auth.role || undefined
    });

    const recipients = await resolveRecipients();
    if (recipients.length === 0) return NextResponse.json({ error: "No hay destinatarios configurados" }, { status: 400 });

    const subject = `StarMedical - Reporte Movimientos Inventario (${dateFrom} a ${dateTo})`;
    const filename = `movimientos-${formatDate(dateFrom)}-${formatDate(dateTo)}.pdf`;

    await sendMail({
      moduleKey: "INVENTARIO",
      to: recipients,
      subject,
      text: "Reporte de movimientos adjunto.",
      attachments: [{ filename, content: pdf, contentType: "application/pdf" }]
    });

    return NextResponse.json({ sent: true, recipientsCount: recipients.length });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo enviar el reporte" }, { status: 500 });
  }
}

async function resolveRecipients() {
  const scheduleRecipients = await prisma.inventoryEmailSchedule.findMany({
    where: { isEnabled: true, reportType: "MOVIMIENTOS" }
  });
  const settings = await prisma.inventoryEmailSetting.findMany({
    where: { isEnabled: true, reportType: "MOVIMIENTOS" }
  });
  const fallback = await prisma.inventoryEmailSetting.findMany({
    where: { isEnabled: true, reportType: "KARDEX" }
  });
  const emails: string[] = [];
  scheduleRecipients.forEach((s) => parseRecipients(s).forEach((email) => emails.push(email)));
  const selected = settings.length ? settings : fallback;
  selected.forEach((s) => {
    parseRecipients(s).forEach((email) => emails.push(email));
  });
  return Array.from(new Set(emails));
}

function formatDate(date: string) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
