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
import { invalidateEmailCache, sendMail } from "@/lib/email/mailer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GlobalEmailConfigDelegate = {
  findUnique: (args: { where: { id: string }; select?: { id?: boolean } }) => Promise<{ id: string } | null>;
};

function getGlobalEmailConfigDelegate(): GlobalEmailConfigDelegate | null {
  const prismaClient = prisma as unknown as {
    globalEmailConfig?: GlobalEmailConfigDelegate;
  };

  return prismaClient.globalEmailConfig ?? null;
}

function dbNotReadyResponse() {
  return service503(
    "DB_NOT_READY",
    "Configuración de correo no disponible. Ejecuta migraciones y prisma generate."
  );
}

function maskEmail(value: string) {
  const atIndex = value.indexOf("@");
  if (atIndex <= 1) return "***";
  const name = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);
  return `${name.slice(0, 2)}***@${domain}`;
}

export async function POST(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_EMAIL_WRITE");
  if (auth.response) return auth.response;

  const delegate = getGlobalEmailConfigDelegate();
  if (!delegate) {
    warnDevCentralCompat("config.email.test.send", new Error("Prisma delegate missing: globalEmailConfig"));
    return dbNotReadyResponse();
  }

  try {
    const body = (await req.json().catch(() => null)) as {
      toEmail?: unknown;
      tenantId?: unknown;
      emailType?: unknown;
      moduleKey?: unknown;
    } | null;

    const toEmail = typeof body?.toEmail === "string" ? body.toEmail.trim() : "";
    const tenantId =
      typeof body?.tenantId === "string" && body.tenantId.trim().length > 0
        ? body.tenantId.trim()
        : auth.user?.tenantId || "global";
    const emailType = typeof body?.emailType === "string" ? body.emailType.trim() : "test";
    const moduleKey = typeof body?.moduleKey === "string" ? body.moduleKey.trim().toUpperCase() : "";
    if (!toEmail) {
      return validation422("Correo de prueba inválido.", [
        { path: "toEmail", message: "Debes ingresar un correo destino." }
      ]);
    }

    const configRow = await delegate.findUnique({ where: { id: "global" }, select: { id: true } });
    if (!configRow) {
      return validation422("Correo global no configurado.", [
        {
          path: "globalEmailConfig",
          message: "Configura SMTP global antes de enviar pruebas."
        }
      ]);
    }

    const startedAt = Date.now();
    const sendPromise = sendMail({
      to: toEmail,
      subject: "Prueba de correo - StarMedical",
      text: "Prueba enviada correctamente.",
      html: "<p>Prueba enviada correctamente.</p>",
      tenantId,
      emailType,
      ...(moduleKey ? { moduleKey } : {})
    });

    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      await Promise.race([
        sendPromise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("MAIL_TIMEOUT")), 8_000);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    await auditLog({
      action: "EMAIL_TEST_SENT",
      entityType: "GlobalEmailConfig",
      entityId: "global",
      user: auth.user,
      req,
      metadata: {
        toEmailMasked: maskEmail(toEmail),
        tenantId,
        emailType,
        moduleKey: moduleKey || null,
        elapsedMs: Date.now() - startedAt
      }
    });

    return NextResponse.json({ ok: true, data: { sent: true } });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.email.test.send", error);
      return dbNotReadyResponse();
    }

    invalidateEmailCache();
    if (error instanceof Error && error.message === "MAIL_TIMEOUT") {
      return server500("Timeout enviando correo de prueba.");
    }

    const message = error instanceof Error ? error.message : "No se pudo enviar correo de prueba.";
    console.error("[config.email.test.send]", error);
    return server500(message);
  }
}
