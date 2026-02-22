import { NextRequest, NextResponse } from "next/server";
import {
  forbidden403,
  requireConfigCentralCapability,
  service503,
  validation422,
  server500,
  isCentralConfigCompatError,
  warnDevCentralCompat
} from "@/lib/config-central";
import {
  EmailSandboxConfigUnavailableError,
  getEmailSandboxSettings,
  normalizeTenantId
} from "@/lib/email/sandbox-config";
import {
  MailpitRequestError,
  deleteMessages,
  isMessageExpired,
  listTenantMessages
} from "@/lib/email/mailpit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dbNotReadyResponse() {
  return service503(
    "DB_NOT_READY",
    "Inbox sandbox no disponible. Ejecuta migraciones y prisma generate."
  );
}

function mailpitUnavailableResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "No se pudo conectar al servicio sandbox de correo.";
  return service503("MAILPIT_UNAVAILABLE", message);
}

function parseNumberQuery(value: string | null, fallback: number, min: number, max: number) {
  const num = Number(value || fallback);
  if (!Number.isInteger(num)) return fallback;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

export async function GET(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_EMAIL_SANDBOX_READ");
  if (auth.response) return auth.response;

  const authTenantId = normalizeTenantId(auth.user?.tenantId || "global");
  const requestedTenantId = normalizeTenantId(req.nextUrl.searchParams.get("tenantId") || authTenantId);
  if (auth.user?.tenantId && requestedTenantId !== authTenantId) {
    return forbidden403("No autorizado para consultar inbox de otro tenant.");
  }
  const tenantId = requestedTenantId;
  const limit = parseNumberQuery(req.nextUrl.searchParams.get("limit"), 25, 1, 100);
  const start = parseNumberQuery(req.nextUrl.searchParams.get("start"), 0, 0, 10_000);

  if (!tenantId) {
    return validation422("tenantId inválido.", [
      { path: "tenantId", message: "Tenant requerido." }
    ]);
  }

  try {
    const settings = await getEmailSandboxSettings();
    if (!settings.enabled) {
      return NextResponse.json({
        ok: true,
        data: {
          tenantId,
          mode: "disabled",
          items: []
        }
      });
    }

    const messages = await listTenantMessages({
      settings,
      tenantId,
      limit,
      start
    });

    const active = [] as typeof messages;
    const expiredIds: string[] = [];

    for (const message of messages) {
      if (isMessageExpired(message.createdAt, settings.retentionDays)) {
        expiredIds.push(message.id);
        continue;
      }
      active.push(message);
    }

    if (expiredIds.length > 0) {
      await deleteMessages(settings, expiredIds);
    }

    const items = active.map((message) => ({
      id: message.id,
      messageId: message.messageId,
      subject: message.subject,
      createdAt: message.createdAt,
      from: message.from,
      to: message.to,
      snippet: settings.blockPhi ? "Contenido bloqueado por seguridad (PHI)." : message.snippet,
      size: message.size,
      env: message.env,
      module: message.module,
      hasAttachments: message.attachmentsCount > 0,
      attachments: message.attachmentsCount > 0 ? "bloqueado por seguridad" : null,
      read: message.read
    }));

    return NextResponse.json({
      ok: true,
      data: {
        tenantId,
        mode: "sandbox",
        retentionDays: settings.retentionDays,
        blockPhi: settings.blockPhi,
        total: items.length,
        start,
        limit,
        items
      }
    });
  } catch (error) {
    if (
      error instanceof EmailSandboxConfigUnavailableError ||
      isCentralConfigCompatError(error)
    ) {
      warnDevCentralCompat("config.email.sandbox.inbox.get", error);
      return dbNotReadyResponse();
    }

    if (error instanceof MailpitRequestError) {
      return mailpitUnavailableResponse(error);
    }

    const message = error instanceof Error ? error.message : "No se pudo cargar inbox sandbox.";
    console.error("[config.email.sandbox.inbox.get]", error);
    return server500(message);
  }
}
