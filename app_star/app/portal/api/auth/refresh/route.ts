import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { safeCreatePortalAuditLog } from "@/lib/portal/audit";
import { PORTAL_REFRESH_COOKIE_NAME } from "@/lib/portal/constants";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { applyPortalSessionCookies, clearPortalSessionCookies, rotatePortalSessionByRefreshToken } from "@/lib/portal/session";

export const runtime = "nodejs";

function responseRateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: "Demasiadas solicitudes de refresh. Intenta nuevamente en unos minutos." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function POST(req: NextRequest) {
  const requestMeta = readPortalRequestMeta(req.headers);

  const ipRate = await consumePortalRateLimit(`portal:auth:refresh:ip:${requestMeta.ipHash ?? "unknown"}`, {
    limit: 20,
    windowMs: 10 * 60_000
  });
  if (!ipRate.allowed) return responseRateLimited(ipRate.retryAfterSeconds);

  const refreshToken = req.cookies.get(PORTAL_REFRESH_COOKIE_NAME)?.value?.trim();
  if (!refreshToken) {
    const response = NextResponse.json({ ok: false, error: "Sesión no disponible." }, { status: 401 });
    clearPortalSessionCookies(response);
    return response;
  }

  const rotated = await rotatePortalSessionByRefreshToken({
    refreshToken,
    ipHash: requestMeta.ipHash,
    userAgentHash: requestMeta.userAgentHash,
    reason: "API_REFRESH"
  });

  if (!rotated.ok) {
    await safeCreatePortalAuditLog({
      action: "LOGIN_FAILED",
      metadata: {
        reason: `REFRESH_${rotated.reason}`,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent
      } satisfies Prisma.InputJsonObject
    });
    const response = NextResponse.json(
      { ok: false, error: "No se pudo renovar la sesión. Vuelve a iniciar sesión." },
      { status: 401 }
    );
    clearPortalSessionCookies(response);
    return response;
  }

  await safeCreatePortalAuditLog({
    clientId: rotated.clientId,
    action: "SESSION_REFRESHED",
    metadata: {
      sessionId: rotated.sessionId,
      rotationCounter: rotated.rotationCounter,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent
    } satisfies Prisma.InputJsonObject
  });

  const response = NextResponse.json({
    ok: true,
    accessExpiresAt: rotated.tokens.accessExpiresAt.getTime(),
    refreshExpiresAt: rotated.tokens.refreshExpiresAt.getTime(),
    rotationCounter: rotated.rotationCounter
  });
  applyPortalSessionCookies(response, rotated.tokens);
  return response;
}
