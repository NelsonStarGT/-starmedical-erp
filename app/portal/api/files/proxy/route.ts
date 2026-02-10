import { NextRequest, NextResponse } from "next/server";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { getPortalSessionContextFromRequest } from "@/lib/portal/session";
import { loadPortalFileBuffer, verifyPortalFileProxyToken } from "@/lib/portal/files";
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

  const ipRate = await consumePortalRateLimit(`portal:files:proxy:ip:${requestMeta.ipHash ?? "unknown"}`, {
    limit: 30,
    windowMs: 10 * 60_000
  });
  if (!ipRate.allowed) return responseRateLimited(ipRate.retryAfterSeconds);

  const token = String(req.nextUrl.searchParams.get("token") || "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Token requerido." }, { status: 400 });
  }

  const payload = verifyPortalFileProxyToken(token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Token inválido o expirado." }, { status: 403 });
  }

  const buffer = await loadPortalFileBuffer(payload.storageKey);
  if (!buffer) {
    return NextResponse.json({ ok: false, error: "Archivo no encontrado." }, { status: 404 });
  }

  const response = new NextResponse(new Uint8Array(buffer), { status: 200 });
  response.headers.set("Content-Type", payload.mimeType || "application/octet-stream");
  const fileName = payload.originalName || "archivo";
  response.headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
