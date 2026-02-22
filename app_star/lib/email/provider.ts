import nodemailer from "nodemailer";
import { sendMail } from "@/lib/email/mailer";

export type EmailPayload = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
};

type SendResult = { messageId?: string | null };

function normalizeList(list?: string[] | string | null) {
  if (!list) return [];
  if (Array.isArray(list)) return list.filter(Boolean);
  return [list].filter(Boolean);
}

export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  try {
    const result = await sendMail({
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: payload.attachments
    });
    return { messageId: result?.messageId || null };
  } catch (err: any) {
    if (err?.code !== "EMAIL_NOT_CONFIGURED") throw err;
    console.warn("[mail] DB config missing; using SMTP_* fallback");
  }

  const provider = (process.env.EMAIL_PROVIDER || "SMTP").toUpperCase();
  if (provider !== "SMTP") {
    throw new Error(`Email provider no soportado: ${provider}. Usa SMTP por ahora.`);
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || user;
  const fromName = process.env.EMAIL_FROM_NAME;

  if (!host || !user || !pass || !fromEmail) {
    throw new Error("SMTP no configurado: define SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
  const to = normalizeList(payload.to).join(",");
  const cc = normalizeList(payload.cc).join(",");
  const bcc = normalizeList(payload.bcc).join(",");

  const info = await transporter.sendMail({
    from,
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    attachments: payload.attachments
  });

  return { messageId: info?.messageId || null };
}
