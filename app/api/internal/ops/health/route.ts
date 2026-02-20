import { NextRequest, NextResponse } from "next/server";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { isOpsServiceTokenValid } from "@/lib/ops/auth";
import { collectOpsHealthSnapshot } from "@/lib/ops/healthAggregator";
import { storeOpsHealthSnapshot } from "@/lib/ops/store";
import { getOrCreateRequestId, readClientIp, withRequestIdHeader } from "@/lib/http/requestContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shouldPersistSnapshot(value: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);

  if (!isOpsServiceTokenValid(req.headers)) {
    return withRequestIdHeader(NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 }), requestId);
  }

  const ip = readClientIp(req.headers) || "unknown";
  const rate = await consumePortalRateLimit(`ops:internal:health:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return withRequestIdHeader(
      NextResponse.json(
        {
          ok: false,
          error: "Rate limit",
          retryAfterSeconds: rate.retryAfterSeconds
        },
        { status: 429 }
      ),
      requestId
    );
  }

  const snapshot = await collectOpsHealthSnapshot();
  if (shouldPersistSnapshot(req.nextUrl.searchParams.get("persist"))) {
    const source = String(req.nextUrl.searchParams.get("source") || "internal_scheduler")
      .trim()
      .slice(0, 64);
    const tenantId = String(req.nextUrl.searchParams.get("tenantId") || process.env.TENANT_ID || "local").trim() || "local";
    await storeOpsHealthSnapshot({
      snapshot,
      source: source || "internal_scheduler",
      requestId,
      actor: null,
      actorRole: "SYSTEM",
      tenantId
    });
  }

  const statusCode = snapshot.status === "down" ? 503 : 200;
  return withRequestIdHeader(
    NextResponse.json({
      ok: snapshot.status !== "down",
      requestId,
      data: snapshot
    }, { status: statusCode }),
    requestId
  );
}
