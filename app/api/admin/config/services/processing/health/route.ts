import { NextRequest, NextResponse } from "next/server";
import {
  getProcessingServiceConfig,
  server500
} from "@/lib/config-central";
import { normalizeTenantId } from "@/lib/tenant";
import { pingProcessingService } from "@/lib/processing-service/client";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { requireConfigCapability } from "@/lib/security/configCapabilities.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireConfigCapability(req, "CONFIG_PROCESSING_VIEW");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 30, windowMs: 60_000 });
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const config = await getProcessingServiceConfig(tenantId);

    const startedAt = Date.now();
    const ping = await pingProcessingService(
      {
        baseUrl: config.baseUrl,
        authMode: config.authMode,
        tokenRef: config.tokenRef,
        hmacSecretRef: config.hmacSecretRef,
        timeoutMs: config.timeoutMs,
        retryCount: config.retryCount
      },
      req.headers.get("x-request-id") || undefined
    );
    const elapsedMs = Date.now() - startedAt;

    if (!ping.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: "down",
          elapsedMs,
          correlationId: ping.correlationId,
          error: ping.error || "processing-service no responde"
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: "up",
      elapsedMs,
      correlationId: ping.correlationId,
      data: ping.data
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: unknown }).status === 429
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMIT",
          error: "Demasiadas solicitudes. Espera un momento para reintentar."
        },
        { status: 429 }
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo ejecutar health check.";
    return server500(message);
  }
}
