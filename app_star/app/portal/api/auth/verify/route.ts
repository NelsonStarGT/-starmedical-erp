import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { safeCreatePortalAuditLog } from "@/lib/portal/audit";
import { PORTAL_CHALLENGE_MAX_ATTEMPTS } from "@/lib/portal/constants";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { applyPortalSessionCookies, createPortalSession } from "@/lib/portal/session";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { hashPortalSecret, normalizeEmail, normalizePhone } from "@/lib/portal/security";
import { validatePortalChallengeState } from "@/lib/portal/workflow";

export const runtime = "nodejs";

function normalizeDestination(value: string) {
  const normalizedPhone = normalizePhone(value);
  if (normalizedPhone) return normalizedPhone;
  const normalizedEmail = normalizeEmail(value);
  return normalizedEmail;
}

function invalidCredentialsResponse() {
  return NextResponse.json(
    { ok: false, error: "No pudimos validar tu acceso temporal. Solicita un nuevo enlace." },
    { status: 400 }
  );
}

function responsePortalUnavailable() {
  return NextResponse.json(
    { ok: false, error: "Portal temporalmente no disponible. Ejecuta migraciones pendientes." },
    { status: 503 }
  );
}

function responseRateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: "Demasiados intentos. Espera unos minutos e intenta nuevamente." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = String(body?.token || "").trim();
  const code = String(body?.code || "").replace(/\s+/g, "");
  const phone = normalizePhone(body?.phone);
  const destination = phone ?? normalizeDestination(String(body?.destination || ""));

  if (!token && !code) {
    return NextResponse.json({ ok: false, error: "Debes enviar token o código OTP." }, { status: 400 });
  }

  if (code && (!destination || !/^\d{6}$/.test(code))) {
    return NextResponse.json({ ok: false, error: "Código o teléfono inválido." }, { status: 400 });
  }

  const requestMeta = readPortalRequestMeta(req.headers);
  const ipRate = await consumePortalRateLimit(`portal:auth:verify:ip:${requestMeta.ipHash ?? "unknown"}`, {
    limit: 20,
    windowMs: 10 * 60_000
  });
  if (!ipRate.allowed) return responseRateLimited(ipRate.retryAfterSeconds);

  const verifyTargetRate = await consumePortalRateLimit(
    token
      ? `portal:auth:verify:token:${hashPortalSecret(token)}`
      : `portal:auth:verify:destination:${hashPortalSecret(destination ?? "unknown")}`,
    { limit: 10, windowMs: 10 * 60_000 }
  );
  if (!verifyTargetRate.allowed) return responseRateLimited(verifyTargetRate.retryAfterSeconds);

  const now = new Date();
  const challengeWhere: Prisma.PortalOtpChallengeWhereInput = token
    ? { tokenHash: hashPortalSecret(token) }
    : { destination: destination ?? "" };

  let challenge: {
    id: string;
    clientId: string | null;
    codeHash: string | null;
    expiresAt: Date;
    consumedAt: Date | null;
    attempts: number;
  } | null = null;

  try {
    challenge = await prisma.portalOtpChallenge.findFirst({
      where: challengeWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientId: true,
        codeHash: true,
        expiresAt: true,
        consumedAt: true,
        attempts: true
      }
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("portal.auth.verify.challenge.findFirst", error);
      return responsePortalUnavailable();
    }
    throw error;
  }

  if (!challenge) {
    await safeCreatePortalAuditLog({
      action: "LOGIN_FAILED",
      metadata: {
        reason: "CHALLENGE_NOT_FOUND",
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent
      } satisfies Prisma.InputJsonObject
    });
    return invalidCredentialsResponse();
  }

  const validation = validatePortalChallengeState({
    consumedAt: challenge.consumedAt,
    expiresAt: challenge.expiresAt,
    attempts: challenge.attempts,
    clientId: challenge.clientId
  });

  if (!validation.ok) {
    await safeCreatePortalAuditLog({
      clientId: challenge.clientId,
      action: "LOGIN_FAILED",
      metadata: {
        reason: validation.reason,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent
      } satisfies Prisma.InputJsonObject
    });
    return invalidCredentialsResponse();
  }

  if (code) {
    const isOtpValid = Boolean(challenge.codeHash) && hashPortalSecret(code) === challenge.codeHash;
    if (!isOtpValid) {
      await prisma.portalOtpChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null
        },
        data: {
          attempts: { increment: 1 }
        }
      });
      await safeCreatePortalAuditLog({
        clientId: challenge.clientId,
        action: "LOGIN_FAILED",
        metadata: {
          reason: "OTP_INVALID",
          ip: requestMeta.ip,
          userAgent: requestMeta.userAgent
        } satisfies Prisma.InputJsonObject
      });
      return invalidCredentialsResponse();
    }
  }

  if (challenge.attempts + 1 > PORTAL_CHALLENGE_MAX_ATTEMPTS) {
    await safeCreatePortalAuditLog({
      clientId: challenge.clientId,
      action: "LOGIN_FAILED",
      metadata: {
        reason: "MAX_ATTEMPTS",
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent
      } satisfies Prisma.InputJsonObject
    });
    return invalidCredentialsResponse();
  }

  const consumed = await prisma.portalOtpChallenge.updateMany({
    where: {
      id: challenge.id,
      consumedAt: null,
      expiresAt: { gt: now }
    },
    data: {
      consumedAt: now,
      attempts: { increment: 1 }
    }
  });

  if (consumed.count !== 1 || !challenge.clientId) {
    await safeCreatePortalAuditLog({
      clientId: challenge.clientId,
      action: "LOGIN_FAILED",
      metadata: {
        reason: "CHALLENGE_ALREADY_CONSUMED",
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent
      } satisfies Prisma.InputJsonObject
    });
    return invalidCredentialsResponse();
  }

  let session: { id: string; tokens: { accessToken: string; refreshToken: string; accessExpiresAt: Date; refreshExpiresAt: Date } };
  try {
    session = await createPortalSession({
      clientId: challenge.clientId,
      ipHash: requestMeta.ipHash,
      userAgentHash: requestMeta.userAgentHash
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("portal.auth.verify.session.create", error);
      return responsePortalUnavailable();
    }
    throw error;
  }

  await safeCreatePortalAuditLog({
    clientId: challenge.clientId,
    action: "OTP_VERIFIED",
    metadata: {
      challengeId: challenge.id,
      sessionId: session.id,
      authMethod: token ? "magic_link" : "otp",
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent
    } satisfies Prisma.InputJsonObject
  });

  const response = NextResponse.json({ ok: true, redirectTo: "/portal/app" });
  applyPortalSessionCookies(response, session.tokens);
  return response;
}
