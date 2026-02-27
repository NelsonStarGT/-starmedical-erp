import { NextRequest, NextResponse } from "next/server";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { createClientSelfRegistrationPendingFromToken } from "@/lib/reception/clientSelfRegistration.server";
import { hashClientRegistrationToken } from "@/lib/reception/clientRegistrationTokens";

export const runtime = "nodejs";

function responseRateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: "Demasiadas solicitudes. Intenta nuevamente en unos minutos." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function POST(req: NextRequest) {
  const requestMeta = readPortalRequestMeta(req.headers);

  const ipRate = await consumePortalRateLimit(`clients:self-reg:submit:ip:${requestMeta.ipHash ?? "unknown"}`, {
    limit: 25,
    windowMs: 10 * 60_000
  });
  if (!ipRate.allowed) return responseRateLimited(ipRate.retryAfterSeconds);

  let body: { token?: string; payload?: unknown };
  try {
    body = (await req.json()) as { token?: string; payload?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON inválido." }, { status: 400 });
  }

  const token = String(body?.token || "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Token requerido." }, { status: 400 });
  }

  const tokenRate = await consumePortalRateLimit(`clients:self-reg:submit:token:${hashClientRegistrationToken(token)}`, {
    limit: 8,
    windowMs: 10 * 60_000
  });
  if (!tokenRate.allowed) return responseRateLimited(tokenRate.retryAfterSeconds);

  try {
    const created = await createClientSelfRegistrationPendingFromToken({
      rawToken: token,
      payload: body?.payload,
      requestMeta: {
        ipHash: requestMeta.ipHash,
        userAgentHash: requestMeta.userAgentHash
      }
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: created.id,
        provisionalCode: created.provisionalCode,
        status: created.status,
        clientType: created.clientType,
        createdAt: created.createdAt.toISOString(),
        receiptUrl: `/api/public/client-registration/receipt?token=${encodeURIComponent(created.receiptToken)}`
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo completar el registro."
      },
      { status: 400 }
    );
  }
}
