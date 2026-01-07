import nodemailer from "nodemailer";
import { MailModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/crypto";

type MailOptions = {
  moduleKey: MailModuleKey;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
};

function formatModuleName(key: MailModuleKey) {
  const map: Record<MailModuleKey, string> = {
    INVENTARIO: "Inventario",
    AGENDA: "Agenda",
    FACTURACION: "Facturación",
    CONTABILIDAD: "Contabilidad",
    COMPRAS: "Compras",
    ADMIN: "Administración",
    SOPORTE: "Soporte"
  };
  return map[key] || key;
}

async function getGlobalConfig() {
  const config = await prisma.mailGlobalConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!config) throw new Error("SMTP global no configurado");
  return config;
}

async function getModuleAccount(moduleKey: MailModuleKey) {
  const account = await prisma.mailModuleAccount.findUnique({ where: { moduleKey } });
  const moduleName = formatModuleName(moduleKey);
  if (!account) throw new Error(`Correo no configurado para módulo ${moduleName}`);
  if (!account.isEnabled) throw new Error(`Correo desactivado para módulo ${moduleName}`);
  if (!account.passwordEnc) throw new Error(`Contraseña no configurada para módulo ${moduleName}`);
  return account;
}

export async function sendMail(options: MailOptions) {
  const { moduleKey, ...rest } = options;
  const config = await getGlobalConfig();
  const account = await getModuleAccount(moduleKey);

  const pass = decryptSecret(account.passwordEnc);
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: Boolean(config.smtpSecure),
    auth: { user: account.username, pass }
  });

  const fromEmail = account.fromEmail || account.email;
  const fromName = account.fromName;
  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

  const to = Array.isArray(rest.to) ? rest.to.join(",") : rest.to;

  return transporter.sendMail({
    ...rest,
    from,
    to
  });
}
