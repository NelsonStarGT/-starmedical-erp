import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/email/mailer";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { PORTAL_RESEND_COOLDOWN_SECONDS } from "@/lib/portal/constants";
import { resolvePortalPersonByIdentity } from "@/lib/portal/identity";
import { safeCreatePortalAuditLog } from "@/lib/portal/audit";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { generatePortalOtpCode, generatePortalToken, hashPortalSecret, maskDestination, normalizeDpi, normalizeEmail, normalizePhone } from "@/lib/portal/security";
import { buildPortalChallengeDates } from "@/lib/portal/workflow";

export const runtime = "nodejs";

const GENERIC_SUCCESS_MESSAGE = "Si los datos coinciden, te enviaremos un acceso temporal.";

function responseRateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: "Demasiadas solicitudes. Intenta nuevamente en un momento." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) }
    }
  );
}

function responsePortalUnavailable() {
  return NextResponse.json(
    { ok: false, error: "Portal temporalmente no disponible. Ejecuta migraciones pendientes." },
    { status: 503 }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const dpi = normalizeDpi(body?.dpi);
  const email = normalizeEmail(body?.email);
  const phone = normalizePhone(body?.phone);

  if (!dpi || (!email && !phone)) {
    return NextResponse.json(
      { ok: false, error: "Ingresa DPI y correo electrónico o teléfono." },
      { status: 400 }
    );
  }

  const requestMeta = readPortalRequestMeta(req.headers);
  const requestedDestination = email ?? phone ?? "";
  const destinationHashForRateLimit = hashPortalSecret(requestedDestination);
  const ipRateKey = `portal:auth:request:ip:${requestMeta.ipHash ?? "unknown"}`;
  const destinationRateKey = `portal:auth:request:dest:${destinationHashForRateLimit}`;
  const ipRate = await consumePortalRateLimit(ipRateKey);
  if (!ipRate.allowed) return responseRateLimited(ipRate.retryAfterSeconds);
  const destinationRate = await consumePortalRateLimit(destinationRateKey);
  if (!destinationRate.allowed) return responseRateLimited(destinationRate.retryAfterSeconds);

  const person = await resolvePortalPersonByIdentity({ dpi, email, phone });
  const deliverToEmail = person ? normalizeEmail(person.email) : null;
  const channel = deliverToEmail ? "email" : "none";
  let delivery: "email" | "none" = deliverToEmail ? "email" : "none";
  const challengeDestination = deliverToEmail ?? requestedDestination;
  const challengeToken = generatePortalToken();
  const otpCode = generatePortalOtpCode();
  const challengeDates = buildPortalChallengeDates();
  const verifyUrl = `${req.nextUrl.origin}/portal/auth/verify?token=${encodeURIComponent(challengeToken)}`;
  let devOnlyPayload: { devMagicLink: string; devOtpCode: string } | null = null;

  try {
    await prisma.portalOtpChallenge.create({
      data: {
        channel,
        destination: challengeDestination,
        clientId: person?.id ?? null,
        codeHash: hashPortalSecret(otpCode),
        tokenHash: hashPortalSecret(challengeToken),
        expiresAt: challengeDates.expiresAt,
        ipHash: requestMeta.ipHash,
        userAgentHash: requestMeta.userAgentHash
      },
      select: { id: true }
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("portal.auth.request.challenge.create", error);
      return responsePortalUnavailable();
    }
    throw error;
  }

  if (person && deliverToEmail) {
    try {
      await sendMail({
        to: deliverToEmail,
        subject: "StarMedical Portal: acceso temporal (10 minutos)",
        text:
          `Tu acceso temporal vence en 10 minutos.\n\n` +
          `Link mágico: ${verifyUrl}\n\n` +
          `Código OTP: ${otpCode}\n\n` +
          "Si no solicitaste este acceso, ignora este correo.",
        html:
          `<p>Tu acceso temporal para el Portal Paciente vence en <strong>10 minutos</strong>.</p>` +
          `<p><a href="${verifyUrl}">Abrir Portal Paciente</a></p>` +
          `<p>Código OTP: <strong>${otpCode}</strong></p>` +
          "<p>Si no solicitaste este acceso, ignora este correo.</p>"
      });
    } catch (error) {
      delivery = "none";
      await safeCreatePortalAuditLog({
        clientId: person.id,
        action: "LOGIN_FAILED",
        metadata: {
          reason: "MAIL_DELIVERY_FAILED",
          destinationMasked: maskDestination(deliverToEmail),
          ip: requestMeta.ip,
          userAgent: requestMeta.userAgent
        } satisfies Prisma.InputJsonObject
      });
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { ok: false, error: "No se pudo enviar el acceso temporal. Intenta nuevamente." },
          { status: 500 }
        );
      }
      devOnlyPayload = {
        devMagicLink: verifyUrl,
        devOtpCode: otpCode
      };
      console.error("[portal.auth.request] email send failed", error);
    }
  }

  await safeCreatePortalAuditLog({
    clientId: person?.id ?? null,
    action: "OTP_REQUESTED",
    metadata: {
      channel,
      delivery,
      destinationMasked: maskDestination(challengeDestination),
      requestedDestinationMasked: maskDestination(requestedDestination),
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent
    } satisfies Prisma.InputJsonObject
  });

  const responseBody: {
    ok: true;
    message: string;
    cooldownSeconds: number;
    devOnly?: { devMagicLink: string; devOtpCode: string };
  } = {
    ok: true,
    message: GENERIC_SUCCESS_MESSAGE,
    cooldownSeconds: PORTAL_RESEND_COOLDOWN_SECONDS
  };

  if (devOnlyPayload) {
    responseBody.devOnly = devOnlyPayload;
  }

  return NextResponse.json(responseBody);
}
