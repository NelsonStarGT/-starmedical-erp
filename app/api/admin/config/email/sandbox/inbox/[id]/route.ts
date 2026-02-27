import { NextRequest, NextResponse } from "next/server";
import {
  forbidden403,
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
  normalizeTenantId
} from "@/lib/email/sandbox-config";
import {
  MailpitRequestError,
  deleteMessages,
  getTenantMessageDetail,
  isMessageExpired
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_EMAIL_SANDBOX_READ");
  if (auth.response) return auth.response;

  const id = String(params.id || "").trim();
  if (!id) {
    return validation422("id inválido.", [{ path: "id", message: "ID de mensaje requerido." }]);
  }

  const authTenantId = normalizeTenantId(auth.user?.tenantId || "global");
  const requestedTenantId = normalizeTenantId(req.nextUrl.searchParams.get("tenantId") || authTenantId);
  if (auth.user?.tenantId && requestedTenantId !== authTenantId) {
    return forbidden403("No autorizado para consultar inbox de otro tenant.");
  }
  const tenantId = requestedTenantId;

  try {
    const settings = await getEmailSandboxSettings();
    if (!settings.enabled) {
      return service503("MAILPIT_DISABLED", "Sandbox Mailpit deshabilitado.");
    }

    const detail = await getTenantMessageDetail({
      settings,
      tenantId,
      id
    });

    if (!detail) {
      return forbidden403("No autorizado para acceder a este mensaje.");
    }

    if (isMessageExpired(detail.date, settings.retentionDays)) {
      await deleteMessages(settings, [id]);
      return forbidden403("Mensaje expirado por política de retención.");
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: detail.id,
        messageId: detail.messageId,
        subject: detail.subject,
        date: detail.date,
        from: detail.from,
        to: detail.to,
        cc: detail.cc,
        bcc: detail.bcc,
        env: detail.env,
        module: detail.module,
        tenantId,
        text: settings.blockPhi ? "Contenido bloqueado por seguridad (PHI)." : detail.text,
        html: settings.blockPhi ? "<p>Contenido bloqueado por seguridad (PHI).</p>" : detail.html,
        headers: detail.headers,
        attachments: [],
        attachmentsBlocked: true,
        attachmentsNotice: "bloqueado por seguridad"
      }
    });
  } catch (error) {
    if (
      error instanceof EmailSandboxConfigUnavailableError ||
      isCentralConfigCompatError(error)
    ) {
      warnDevCentralCompat("config.email.sandbox.inbox.detail.get", error);
      return dbNotReadyResponse();
    }

    if (error instanceof MailpitRequestError) {
      return mailpitUnavailableResponse(error);
    }

    const message = error instanceof Error ? error.message : "No se pudo cargar detalle del mensaje.";
    console.error("[config.email.sandbox.inbox.detail.get]", error);
    return server500(message);
  }
}
