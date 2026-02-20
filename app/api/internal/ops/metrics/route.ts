import { NextRequest, NextResponse } from "next/server";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { isOpsMetricsTokenValid } from "@/lib/ops/auth";
import { collectOpsMetricsSnapshot } from "@/lib/ops/metricsAggregator";
import { storeOpsMetricsSnapshot } from "@/lib/ops/store";
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

  if (!isOpsMetricsTokenValid(req.headers)) {
    return withRequestIdHeader(NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 }), requestId);
  }

  const ip = readClientIp(req.headers) || "unknown";
  const rate = await consumePortalRateLimit(`ops:internal:metrics:${ip}`, { limit: 60, windowMs: 60_000 });
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

  const range = req.nextUrl.searchParams.get("range");
  const tenantId = req.nextUrl.searchParams.get("tenantId");

  const snapshot = await collectOpsMetricsSnapshot({ range, tenantId });
  if (shouldPersistSnapshot(req.nextUrl.searchParams.get("persist"))) {
    const source = String(req.nextUrl.searchParams.get("source") || "internal_scheduler").trim().slice(0, 64);
    await storeOpsMetricsSnapshot({
      snapshot,
      source: source || "internal_scheduler",
      requestId,
      tenantId: tenantId || null,
      actor: null,
      actorRole: "SYSTEM"
    });
  }
  const statusCode = snapshot.status === "down" ? 503 : 200;
  return withRequestIdHeader(
    NextResponse.json(
      {
        ok: snapshot.status !== "down",
        requestId,
        data: snapshot
      },
      { status: statusCode }
    ),
    requestId
  );
}
