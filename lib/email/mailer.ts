import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";
import { prisma } from "@/lib/prisma";
import { MailModuleKey } from "@prisma/client";
import { decryptSecret as decryptEmailSecret } from "./crypto";
import { decryptSecret as decryptModuleSecret } from "@/lib/security/crypto";
import { isPrismaMissingTableError } from "@/lib/prisma/errors";
import {
  buildTenantAliasAddress,
  getEmailSandboxSettingsSafe,
  isProductionLikeEnvironment,
  normalizeSandboxEmailType,
  normalizeTenantId,
  resolveTenantSandboxMode,
  shouldUseSandboxForTenant
} from "@/lib/email/sandbox-config";

type MailInput = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Attachment[];
  moduleKey?: string;
  tenantId?: string | null;
  emailType?: string | null;
};

type GlobalCached = {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPasswordEnc: string;
  fromName: string;
  fromEmail: string;
  cachedAt: number;
};

type ModuleCached = {
  moduleKey: string;
  email: string;
  username: string;
  passwordEnc: string;
  fromName?: string | null;
  fromEmail?: string | null;
};

export type MailTransportProvider = "db" | "mailpit" | "env";

type SendResult = { messageId?: string | null; provider?: MailTransportProvider };

type CachedEntry<T> = { data: T | null; cachedAt: number };
type TransportConfig = Record<string, any>;

const CACHE_TTL_MS = 60_000;
let cachedGlobal: GlobalCached | null = null;
const cachedModules = new Map<string, CachedEntry<ModuleCached>>();
const MODULE_KEYS = new Set<string>(Object.values(MailModuleKey) as string[]);

function isTruthy(value?: string | null) {
  const v = String(value || "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "yes";
}

export function resolveMailTransportProvider(): MailTransportProvider {
  const env = String(process.env.NODE_ENV || "").toLowerCase();
  const appEnv = String(process.env.APP_ENV || "").toLowerCase();
  const isProd = env === "production" || appEnv === "production";
  const mailTransport = String(process.env.MAIL_TRANSPORT || "db").toLowerCase();
  const mailpitEnabled = isTruthy(process.env.MAILPIT) || mailTransport === "mailpit";
  if (isProd) {
    if (mailpitEnabled) {
      console.warn("[mail] MAILPIT ignored in production; using DB transport.");
    }
    return "db";
  }
  if (mailpitEnabled) return "mailpit";
  if (mailTransport === "env") return "env";
  return "db";
}

function isMissingTableError(err: any) {
  return isPrismaMissingTableError(err);
}

function errorWithCode(code: string, message?: string) {
  const err = new Error(message || code);
  (err as any).code = code;
  return err;
}

function normalizeList(value?: string | string[]) {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const filtered = value.map((v) => String(v).trim()).filter(Boolean);
    return filtered.length ? filtered : undefined;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
}

function asArray(value?: string | string[]) {
  if (!value) return [] as string[];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  const trimmed = String(value).trim();
  return trimmed ? [trimmed] : [];
}

function normalizeHeaderValue(value: string) {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function resolveEnvHeader() {
  const appEnv = String(process.env.APP_ENV || "").trim();
  if (appEnv) return appEnv;
  const nodeEnv = String(process.env.NODE_ENV || "").trim();
  return nodeEnv || "development";
}

function parseModuleKey(value: string): MailModuleKey | null {
  const v = String(value || "").trim();
  return MODULE_KEYS.has(v) ? (v as MailModuleKey) : null;
}

async function getGlobalConfig(): Promise<GlobalCached | null> {
  const now = Date.now();
  if (cachedGlobal && now - cachedGlobal.cachedAt < CACHE_TTL_MS) return cachedGlobal;
  if (!(prisma as any).globalEmailConfig?.findUnique) return null;
  try {
    const cfg = await prisma.globalEmailConfig.findUnique({ where: { id: "global" } });
    if (!cfg) return null;
    cachedGlobal = {
      smtpHost: cfg.smtpHost,
      smtpPort: cfg.smtpPort,
      smtpSecure: cfg.smtpSecure,
      smtpUser: cfg.smtpUser,
      smtpPasswordEnc: cfg.smtpPasswordEnc,
      fromName: cfg.fromName,
      fromEmail: cfg.fromEmail,
      cachedAt: now
    };
    return cachedGlobal;
  } catch (err) {
    if (isMissingTableError(err)) return null;
    throw err;
  }
}

async function getModuleAccount(moduleKey: string): Promise<ModuleCached | null> {
  const now = Date.now();
  const cached = cachedModules.get(moduleKey);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) return cached.data;
  if (!(prisma as any).mailModuleAccount?.findFirst) return null;
  const key = parseModuleKey(moduleKey);
  if (!key) {
    cachedModules.set(moduleKey, { data: null, cachedAt: now });
    return null;
  }
  try {
    const account = await prisma.mailModuleAccount.findFirst({
      where: { moduleKey: key, isEnabled: true }
    });
    if (!account) {
      cachedModules.set(moduleKey, { data: null, cachedAt: now });
      return null;
    }
    const data: ModuleCached = {
      moduleKey,
      email: account.email,
      username: account.username,
      passwordEnc: account.passwordEnc,
      fromName: account.fromName,
      fromEmail: account.fromEmail
    };
    cachedModules.set(moduleKey, { data, cachedAt: now });
    return data;
  } catch (err) {
    if (isMissingTableError(err)) return null;
    throw err;
  }
}

function decryptOrThrow(passwordEnc: string, usingModule: boolean) {
  try {
    return usingModule ? decryptModuleSecret(passwordEnc) : decryptEmailSecret(passwordEnc);
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (usingModule && msg.includes("APP_ENCRYPTION_KEY")) {
      throw errorWithCode("APP_ENCRYPTION_KEY_MISSING");
    }
    if (!usingModule && msg.includes("EMAIL_SECRET_KEY")) {
      throw errorWithCode("EMAIL_SECRET_KEY_MISSING");
    }
    throw err;
  }
}

export async function sendMail(input: MailInput): Promise<SendResult> {
  const { to, cc, bcc, subject, text, html, attachments, moduleKey, tenantId, emailType } = input;

  const normalizedTenantId = normalizeTenantId(tenantId);
  const sandboxSettings = await getEmailSandboxSettingsSafe();
  const tenantMode = resolveTenantSandboxMode(sandboxSettings, normalizedTenantId);
  const forceSandboxOverride = shouldUseSandboxForTenant(sandboxSettings, normalizedTenantId);
  const baseTransportProvider = resolveMailTransportProvider();
  const transportProvider: MailTransportProvider =
    forceSandboxOverride && !isProductionLikeEnvironment() ? "mailpit" : baseTransportProvider;
  if (forceSandboxOverride && isProductionLikeEnvironment()) {
    console.warn("[mail] sandbox override ignored in production; using standard transport.");
  }
  const usingSandboxMailpit = sandboxSettings.enabled && transportProvider === "mailpit";
  const moduleAccount = moduleKey ? await getModuleAccount(moduleKey) : null;

  // Selección de transporte:
  // - Producción: siempre usa GlobalEmailConfig (DB).
  // - No producción: MAILPIT=true o MAIL_TRANSPORT=mailpit fuerza Mailpit.
  // - No producción: MAIL_TRANSPORT=env usa SMTP_*.
  // - Default: DB.
  let transporterConfig: TransportConfig;
  let fromName: string | null | undefined;
  let fromEmail: string | null | undefined;

  if (transportProvider === "mailpit") {
    let globalConfig: GlobalCached | null = null;
    try {
      globalConfig = await getGlobalConfig();
    } catch {
      globalConfig = null;
    }
    const mailpitHost = forceSandboxOverride
      ? sandboxSettings.mailpitHost
      : process.env.MAILPIT_HOST || sandboxSettings.mailpitHost || "127.0.0.1";
    const mailpitPort = forceSandboxOverride
      ? sandboxSettings.mailpitSmtpPort
      : Number(process.env.MAILPIT_PORT || sandboxSettings.mailpitSmtpPort || 1025);
    const fallbackFrom = "no-reply@starmedical.local";
    fromName = moduleAccount?.fromName || globalConfig?.fromName || null;
    fromEmail = moduleAccount?.fromEmail || moduleAccount?.email || globalConfig?.fromEmail || fallbackFrom;
    const normalizedFrom = String(fromEmail || "").trim();
    fromEmail = normalizedFrom.includes("@") ? normalizedFrom : fallbackFrom;
    transporterConfig = { host: mailpitHost, port: mailpitPort, secure: false };
  } else if (transportProvider === "env") {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    fromEmail = process.env.SMTP_FROM || user || null;
    fromName = process.env.EMAIL_FROM_NAME || null;
    if (!host || !user || !pass || !fromEmail) {
      throw errorWithCode("EMAIL_NOT_CONFIGURED", "SMTP_* incompleto");
    }
    const normalizedFrom = String(fromEmail || "").trim();
    if (!normalizedFrom.includes("@")) {
      throw errorWithCode("EMAIL_NOT_CONFIGURED", "fromEmail inválido");
    }
    fromEmail = normalizedFrom;
    transporterConfig = {
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    };
  } else {
    const globalConfig = await getGlobalConfig();

    // MailModuleAccount solo define credenciales y FROM por módulo.
    // Host/port/secure siempre vienen de GlobalEmailConfig.
    // Sin GlobalEmailConfig no se puede enviar, aunque exista cuenta por módulo.
    if (!globalConfig) {
      throw errorWithCode("EMAIL_NOT_CONFIGURED");
    }

    const moduleHasCreds = Boolean(moduleAccount?.username && moduleAccount?.passwordEnc);
    const usingModule = Boolean(moduleKey && moduleHasCreds);

    const smtpUser = usingModule ? moduleAccount!.username : globalConfig.smtpUser;
    const passwordEnc = usingModule ? moduleAccount!.passwordEnc : globalConfig.smtpPasswordEnc;

    fromName = usingModule && moduleAccount?.fromName ? moduleAccount.fromName : globalConfig.fromName;
    fromEmail =
      usingModule && moduleAccount?.fromEmail
        ? moduleAccount.fromEmail
        : usingModule && moduleAccount?.email
          ? moduleAccount.email
          : globalConfig.fromEmail;

    const fromEmailValue = String(fromEmail || "").trim();
    if (!fromEmailValue || !fromEmailValue.includes("@")) {
      throw errorWithCode("EMAIL_NOT_CONFIGURED", "fromEmail inválido");
    }
    if (!smtpUser || !passwordEnc || !globalConfig.smtpHost || !globalConfig.smtpPort) {
      throw errorWithCode("EMAIL_NOT_CONFIGURED");
    }

    const password = decryptOrThrow(passwordEnc, usingModule);

    transporterConfig = {
      host: globalConfig.smtpHost,
      port: globalConfig.smtpPort,
      secure: globalConfig.smtpSecure,
      auth: {
        user: smtpUser,
        pass: password
      }
    };
  }

  const fromEmailValue = String(fromEmail || "").trim();
  const transporter = nodemailer.createTransport(transporterConfig);
  const from = fromName && fromName.trim().length > 0 ? `${fromName} <${fromEmailValue}>` : fromEmailValue;

  const normalizedType = normalizeSandboxEmailType(emailType || moduleKey || "general");
  const originalTo = asArray(to);
  let normalizedTo = normalizeList(to);
  let normalizedCc = normalizeList(cc);
  let normalizedBcc = normalizeList(bcc);
  let normalizedSubject = subject;
  let normalizedText = text;
  let normalizedHtml = html;
  let normalizedAttachments = attachments;

  if (usingSandboxMailpit) {
    const recipientCount = originalTo.length > 0 ? originalTo.length : 1;
    const aliases = Array.from({ length: recipientCount }, (_, index) =>
      buildTenantAliasAddress({
        tenantId: normalizedTenantId,
        aliasDomain: sandboxSettings.aliasDomain,
        emailType: normalizedType,
        index
      })
    );
    normalizedTo = aliases;
    normalizedCc = undefined;
    normalizedBcc = undefined;
  }

  if (usingSandboxMailpit && sandboxSettings.blockPhi) {
    const moduleLabel = moduleKey || "core";
    const blockedNotice = `Contenido bloqueado por seguridad (PHI). tenant=${normalizedTenantId} module=${moduleLabel}`;
    normalizedSubject = `[SANDBOX][${moduleLabel}] Mensaje bloqueado`;
    normalizedText = blockedNotice;
    normalizedHtml = `<p>${blockedNotice}</p>`;
    normalizedAttachments = undefined;
  }

  const messageHeaders = {
    "X-Tenant-Id": normalizeHeaderValue(normalizedTenantId),
    "X-Env": normalizeHeaderValue(resolveEnvHeader()),
    "X-Module": normalizeHeaderValue(moduleKey || "core"),
    ...(usingSandboxMailpit ? { "X-Sandbox-Mode": normalizeHeaderValue(tenantMode) } : {})
  };

  const info = await transporter.sendMail({
    from,
    to: normalizedTo,
    cc: normalizedCc,
    bcc: normalizedBcc,
    subject: normalizedSubject,
    text: normalizedText,
    html: normalizedHtml,
    headers: messageHeaders,
    ...(normalizedAttachments ? { attachments: normalizedAttachments } : {})
  });

  return { messageId: info?.messageId || null, provider: transportProvider };
}

export function invalidateEmailCache() {
  cachedGlobal = null;
  cachedModules.clear();
}

export function invalidateEmailModuleCache(moduleKey?: string) {
  if (!moduleKey) {
    cachedModules.clear();
    return;
  }
  cachedModules.delete(moduleKey);
}
