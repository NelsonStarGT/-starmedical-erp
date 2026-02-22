import {
  AttendanceNotificationProvider,
  AttendanceNotificationStatus,
  AttendanceNotificationType,
  AttendanceRecordSource
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email/mailer";

type NotificationEvent = "CHECK_IN" | "CHECK_OUT";

function formatTime(value?: Date | null, timeZone = "America/Guatemala") {
  if (!value) return "N/D";
  try {
    return new Intl.DateTimeFormat("es-GT", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(value);
  } catch {
    return value.toISOString();
  }
}

function buildTemplate(params: {
  employeeName: string;
  branchName: string;
  timeLabel: string;
  source: AttendanceRecordSource;
  event: NotificationEvent;
}) {
  const accent = params.event === "CHECK_IN" ? "#4aa59c" : "#2e75ba";
  const title = params.event === "CHECK_IN" ? "Entrada registrada" : "Salida registrada";
  const subtitle = params.event === "CHECK_IN" ? "Marcaje de entrada confirmado" : "Marcaje de salida confirmado";

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#F8FAFC;padding:18px;">
      <div style="max-width:540px;margin:0 auto;background:#FFFFFF;border-radius:18px;border:1px solid #E5E7EB;box-shadow:0 12px 30px rgba(46,117,186,0.12);overflow:hidden;">
        <div style="padding:18px 20px;border-bottom:4px solid ${accent};">
          <p style="margin:0;text-transform:uppercase;color:#64748B;font-size:12px;letter-spacing:0.08em;">StarMedical · Asistencia</p>
          <h2 style="margin:4px 0 0 0;color:${accent};font-family:'Montserrat','Poppins',Arial,sans-serif;font-size:20px;">${title}</h2>
          <p style="margin:4px 0 0 0;color:#0F172A;font-weight:600;">${params.employeeName}</p>
          <p style="margin:2px 0 0 0;color:#475569;">${subtitle}</p>
        </div>
        <div style="padding:18px 20px;color:#0F172A;line-height:1.5;">
          <p style="margin:0 0 8px 0;">Hora: <strong>${params.timeLabel}</strong></p>
          <p style="margin:0 0 8px 0;">Sucursal: <strong>${params.branchName}</strong></p>
          <p style="margin:0;color:#475569;">Fuente: ${params.source}</p>
        </div>
      </div>
    </div>
  `;

  const subject = params.event === "CHECK_IN" ? "Confirmación de entrada" : "Confirmación de salida";
  return { subject, html };
}

export function isEmailConfigured() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  return Boolean(host && port && user && pass && from);
}

async function sendAndLog(params: {
  type: AttendanceNotificationType;
  to: string[];
  subject: string;
  html: string;
  recordId: string;
  tenantId?: string | null;
}) {
  if (!isEmailConfigured()) {
    await prisma.attendanceNotificationLog.create({
      data: {
        attendanceRecordId: params.recordId,
        type: params.type,
        status: AttendanceNotificationStatus.FAILED,
        provider: AttendanceNotificationProvider.SMTP,
        errorMessage: "SMTP_NOT_CONFIGURED"
      }
    });
    return;
  }

  const log = await prisma.attendanceNotificationLog.create({
    data: {
      attendanceRecordId: params.recordId,
      type: params.type,
      status: AttendanceNotificationStatus.QUEUED,
      provider: AttendanceNotificationProvider.SMTP
    }
  });

  try {
    await sendMail({
      to: params.to,
      subject: params.subject,
      html: params.html,
      tenantId: params.tenantId || "global",
      emailType: "attendance"
    });
    await prisma.attendanceNotificationLog.update({
      where: { id: log.id },
      data: { status: AttendanceNotificationStatus.SENT }
    });
  } catch (err: any) {
    await prisma.attendanceNotificationLog.update({
      where: { id: log.id },
      data: { status: AttendanceNotificationStatus.FAILED, errorMessage: err?.message?.slice(0, 240) || "Error al enviar" }
    });
    console.error("[attendance.notify]", err);
  }
}

export async function enqueueAttendanceEmails(recordId: string, event: NotificationEvent) {
  const settings = await prisma.hrSettings.findUnique({ where: { id: 1 } });
  if (!settings?.attendanceEmailEnabled) return;

  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    include: { employee: true, branch: true }
  });
  if (!record) return;

  const timeZone = settings.defaultTimezone || "America/Guatemala";
  const eventTime = event === "CHECK_OUT" ? record.checkOutAt : record.checkInAt;
  const timeLabel = formatTime(eventTime, timeZone);
  const branchName = record.branch?.name || "Sucursal";
  const tenantId = record.branch?.tenantId || "global";
  const employeeName = [record.employee.firstName, record.employee.lastName].filter(Boolean).join(" ") || "Colaborador";
  const { subject, html } = buildTemplate({
    employeeName,
    branchName,
    timeLabel,
    source: record.source,
    event
  });

  const adminRecipients = (settings.attendanceAdminRecipients || []).filter(Boolean);
  const sendOperations = [];

  if (record.employee.email) {
    sendOperations.push(
      sendAndLog({
        type: AttendanceNotificationType.EMPLOYEE_CONFIRMATION,
        to: [record.employee.email],
        subject,
        html,
        recordId: record.id,
        tenantId
      })
    );
  }

  if (adminRecipients.length) {
    sendOperations.push(
      sendAndLog({
        type: AttendanceNotificationType.ADMIN_ALERT,
        to: adminRecipients,
        subject: `Marcaje registrado: ${employeeName}`,
        html,
        recordId: record.id,
        tenantId
      })
    );
  }

  if (sendOperations.length > 0) {
    await Promise.allSettled(sendOperations);
  }
}
