import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { safeCreatePortalAuditLog } from "@/lib/portal/audit";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { resolvePortalFileReferenceByAssetId, getSignedDownloadUrl } from "@/lib/portal/files";
import { getPortalSessionContextFromRequest } from "@/lib/portal/session";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";

export const runtime = "nodejs";

function responseRateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: "Demasiadas solicitudes de descarga. Intenta nuevamente." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function GET(req: NextRequest) {
  const requestMeta = readPortalRequestMeta(req.headers);
  const session = await getPortalSessionContextFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const ipRate = await consumePortalRateLimit(`portal:files:signed:ip:${requestMeta.ipHash ?? "unknown"}`, {
    limit: 30,
    windowMs: 10 * 60_000
  });
  if (!ipRate.allowed) return responseRateLimited(ipRate.retryAfterSeconds);

  const assetId = String(req.nextUrl.searchParams.get("assetId") || "").trim();
  if (!assetId) {
    return NextResponse.json({ ok: false, error: "assetId requerido." }, { status: 400 });
  }

  const fileRef = await resolvePortalFileReferenceByAssetId(assetId, session.clientId);
  if (!fileRef) {
    return NextResponse.json({ ok: false, error: "Archivo no disponible para este perfil." }, { status: 404 });
  }

  const signed = await getSignedDownloadUrl(fileRef, 180);

  await safeCreatePortalAuditLog({
    clientId: session.clientId,
    action: "RESULT_DOWNLOADED",
    metadata: {
      assetId,
      mode: signed.mode,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent
    } satisfies Prisma.InputJsonObject
  });

  return NextResponse.json({
    ok: true,
    url: signed.url,
    expiresAt: signed.expiresAt.toISOString()
  });
}
