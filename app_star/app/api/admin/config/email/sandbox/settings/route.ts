import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import {
  isCentralConfigCompatError,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import {
  EmailSandboxConfigUnavailableError,
  getEmailSandboxSettings,
  normalizeTenantModeMap,
  updateEmailSandboxSettings
} from "@/lib/email/sandbox-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dbNotReadyResponse() {
  return service503(
    "DB_NOT_READY",
    "Configuración de sandbox email no disponible. Ejecuta migraciones y prisma generate."
  );
}

function parsePort(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isInteger(num) ? num : Number.NaN;
}

function parseRetentionDays(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isInteger(num) ? num : Number.NaN;
}

function isValidAliasDomain(value: string) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(value);
}

export async function GET(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_EMAIL_READ");
  if (auth.response) return auth.response;

  try {
    const data = await getEmailSandboxSettings();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (
      error instanceof EmailSandboxConfigUnavailableError ||
      isCentralConfigCompatError(error)
    ) {
      warnDevCentralCompat("config.email.sandbox.settings.get", error);
      return dbNotReadyResponse();
    }

    const message =
      error instanceof Error ? error.message : "No se pudo cargar configuración sandbox de correo.";
    console.error("[config.email.sandbox.settings.get]", error);
    return server500(message);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_EMAIL_WRITE");
  if (auth.response) return auth.response;

  try {
    const body = (await req.json().catch(() => null)) as {
      enabled?: unknown;
      modeDefault?: unknown;
      tenantModes?: unknown;
      mailpitHost?: unknown;
      mailpitSmtpPort?: unknown;
      mailpitApiPort?: unknown;
      aliasDomain?: unknown;
      retentionDays?: unknown;
      blockPhi?: unknown;
    } | null;

    const enabled = body?.enabled === true;
    const modeDefault = String(body?.modeDefault || "inherit").trim().toLowerCase();
    const tenantModes = normalizeTenantModeMap(body?.tenantModes);
    const mailpitHost = String(body?.mailpitHost || "").trim();
    const mailpitSmtpPort = parsePort(body?.mailpitSmtpPort);
    const mailpitApiPort = parsePort(body?.mailpitApiPort);
    const aliasDomain = String(body?.aliasDomain || "").trim().toLowerCase();
    const retentionDays = parseRetentionDays(body?.retentionDays);
    const blockPhi = body?.blockPhi !== false;

    const issues: Array<{ path: string; message: string }> = [];

    if (!(modeDefault === "inherit" || modeDefault === "override")) {
      issues.push({ path: "modeDefault", message: "modeDefault debe ser inherit u override." });
    }

    if (!mailpitHost) {
      issues.push({ path: "mailpitHost", message: "Mailpit host es requerido." });
    }

    if (!Number.isInteger(mailpitSmtpPort) || mailpitSmtpPort <= 0 || mailpitSmtpPort > 65535) {
      issues.push({ path: "mailpitSmtpPort", message: "mailpitSmtpPort debe ser un entero entre 1 y 65535." });
    }

    if (!Number.isInteger(mailpitApiPort) || mailpitApiPort <= 0 || mailpitApiPort > 65535) {
      issues.push({ path: "mailpitApiPort", message: "mailpitApiPort debe ser un entero entre 1 y 65535." });
    }

    if (!aliasDomain) {
      issues.push({ path: "aliasDomain", message: "Alias domain es requerido." });
    } else if (!isValidAliasDomain(aliasDomain)) {
      issues.push({ path: "aliasDomain", message: "Alias domain inválido." });
    }

    if (!Number.isInteger(retentionDays) || retentionDays < 0 || retentionDays > 365) {
      issues.push({ path: "retentionDays", message: "retentionDays debe ser un entero entre 0 y 365." });
    }

    if (issues.length > 0) {
      return validation422("Configuración sandbox inválida.", issues);
    }

    const current = await getEmailSandboxSettings();
    const saved = await updateEmailSandboxSettings({
      enabled,
      modeDefault: modeDefault as "inherit" | "override",
      tenantModes,
      mailpitHost,
      mailpitSmtpPort,
      mailpitApiPort,
      aliasDomain,
      retentionDays,
      blockPhi,
      updatedByUserId: auth.user?.id ?? null
    });

    await auditLog({
      action: "EMAIL_SANDBOX_SETTINGS_UPDATED",
      entityType: "EmailSandboxConfig",
      entityId: "global",
      user: auth.user,
      req,
      before: {
        enabled: current.enabled,
        modeDefault: current.modeDefault,
        tenantModes: current.tenantModes,
        mailpitHost: current.mailpitHost,
        mailpitSmtpPort: current.mailpitSmtpPort,
        mailpitApiPort: current.mailpitApiPort,
        aliasDomain: current.aliasDomain,
        retentionDays: current.retentionDays,
        blockPhi: current.blockPhi
      },
      after: {
        enabled: saved.enabled,
        modeDefault: saved.modeDefault,
        tenantModes: saved.tenantModes,
        mailpitHost: saved.mailpitHost,
        mailpitSmtpPort: saved.mailpitSmtpPort,
        mailpitApiPort: saved.mailpitApiPort,
        aliasDomain: saved.aliasDomain,
        retentionDays: saved.retentionDays,
        blockPhi: saved.blockPhi
      }
    });

    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    if (
      error instanceof EmailSandboxConfigUnavailableError ||
      isCentralConfigCompatError(error)
    ) {
      warnDevCentralCompat("config.email.sandbox.settings.put", error);
      return dbNotReadyResponse();
    }

    const message =
      error instanceof Error ? error.message : "No se pudo actualizar configuración sandbox de correo.";
    console.error("[config.email.sandbox.settings.put]", error);
    return server500(message);
  }
}
