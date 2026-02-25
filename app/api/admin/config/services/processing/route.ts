import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auditLog } from "@/lib/audit";
import {
  getProcessingServiceConfig,
  isCentralConfigCompatError,
  maskSecretRef,
  parseProcessingServicePatch,
  server500,
  service503,
  updateProcessingServiceConfig,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { requireConfigCapability } from "@/lib/security/configCapabilities.server";
import { normalizeTenantId } from "@/lib/tenant";
import { enforceRateLimit } from "@/lib/api/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toUiConfig(data: Awaited<ReturnType<typeof getProcessingServiceConfig>>) {
  return {
    ...data,
    tokenRef: maskSecretRef(data.tokenRef),
    hmacSecretRef: maskSecretRef(data.hmacSecretRef),
    hasTokenRef: Boolean(data.tokenRef),
    hasHmacSecretRef: Boolean(data.hmacSecretRef)
  };
}

export async function GET(req: NextRequest) {
  const auth = requireConfigCapability(req, "CONFIG_PROCESSING_VIEW");
  if (auth.response) return auth.response;

  try {
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const data = await getProcessingServiceConfig(tenantId);
    return NextResponse.json({ ok: true, data: toUiConfig(data) });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.services.processing.get", error);
      return service503("DB_NOT_READY", "Configuración de processing-service no disponible.");
    }

    const message = error instanceof Error ? error.message : "No se pudo cargar processing-service.";
    return server500(message);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireConfigCapability(req, "CONFIG_PROCESSING_WRITE");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 20, windowMs: 60_000 });
    const body = await req.json().catch(() => ({}));
    const patch = parseProcessingServicePatch(body);
    const tenantId = normalizeTenantId(auth.user?.tenantId);

    const before = await getProcessingServiceConfig(tenantId);
    const data = await updateProcessingServiceConfig({
      tenantId,
      patch,
      updatedByUserId: auth.user?.id ?? null
    });

    await auditLog({
      action: "PROCESSING_SERVICE_CONFIG_UPDATED",
      entityType: "ProcessingServiceConfig",
      entityId: tenantId,
      user: auth.user,
      req,
      before: {
        ...before,
        tokenRef: before.tokenRef ? "***" : null,
        hmacSecretRef: before.hmacSecretRef ? "***" : null
      },
      after: {
        ...data,
        tokenRef: data.tokenRef ? "***" : null,
        hmacSecretRef: data.hmacSecretRef ? "***" : null
      }
    });

    return NextResponse.json({ ok: true, data: toUiConfig(data) });
  } catch (error) {
    if (error instanceof ZodError) {
      return validation422(
        "Datos inválidos para processing-service.",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.services.processing.put", error);
      return service503("DB_NOT_READY", "Configuración de processing-service no disponible.");
    }

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

    const message = error instanceof Error ? error.message : "No se pudo actualizar processing-service.";
    return server500(message);
  }
}
