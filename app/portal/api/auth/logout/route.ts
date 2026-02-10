import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { safeCreatePortalAuditLog } from "@/lib/portal/audit";
import { PORTAL_REFRESH_COOKIE_NAME, PORTAL_SESSION_COOKIE_NAME } from "@/lib/portal/constants";
import { clearPortalSessionCookies, revokePortalSession } from "@/lib/portal/session";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const requestMeta = readPortalRequestMeta(req.headers);
  const accessToken = req.cookies.get(PORTAL_SESSION_COOKIE_NAME)?.value?.trim();
  const refreshToken = req.cookies.get(PORTAL_REFRESH_COOKIE_NAME)?.value?.trim();

  if (accessToken || refreshToken) {
    const revoked = await revokePortalSession({
      accessToken: accessToken ?? null,
      refreshToken: refreshToken ?? null
    });
    if (revoked?.clientId) {
      await safeCreatePortalAuditLog({
        clientId: revoked.clientId,
        action: "SESSION_REVOKED",
        metadata: {
          sessionId: revoked.id,
          ip: requestMeta.ip,
          userAgent: requestMeta.userAgent
        } satisfies Prisma.InputJsonObject
      });
    }
  }

  const response = NextResponse.json({ ok: true });
  clearPortalSessionCookies(response);
  return response;
}
