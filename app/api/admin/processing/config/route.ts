import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auditLog } from "@/lib/audit";
import {
  getTenantProcessingConfig,
  isCentralConfigCompatError,
  parseTenantProcessingConfigPatch,
  server500,
  service503,
  updateTenantProcessingConfig,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { requireConfigCapability } from "@/lib/security/configCapabilities.server";
import { normalizeTenantId } from "@/lib/tenant";
import { enforceRateLimit } from "@/lib/api/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireConfigCapability(req, "CONFIG_PROCESSING_VIEW");
  if (auth.response) return auth.response;

  try {
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const data = await getTenantProcessingConfig(tenantId);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("admin.processing.config.get", error);
      return service503("DB_NOT_READY", "Configuración de procesamiento no disponible.");
    }
    const message = error instanceof Error ? error.message : "No se pudo cargar configuración de procesamiento.";
    return server500(message);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireConfigCapability(req, "CONFIG_PROCESSING_WRITE");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 20, windowMs: 60_000 });
    const body = await req.json().catch(() => ({}));
    const patch = parseTenantProcessingConfigPatch(body);
    const tenantId = normalizeTenantId(auth.user?.tenantId);

    const before = await getTenantProcessingConfig(tenantId);
    const data = await updateTenantProcessingConfig({
      tenantId,
      patch,
      updatedByUserId: auth.user?.id ?? null
    });

    await auditLog({
      action: "TENANT_PROCESSING_CONFIG_UPDATED",
      entityType: "TenantProcessingConfig",
      entityId: tenantId,
      user: auth.user,
      req,
      before,
      after: data
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return validation422(
        "Datos inválidos para configuración de procesamiento.",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("admin.processing.config.put", error);
      return service503("DB_NOT_READY", "Configuración de procesamiento no disponible.");
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

    const message = error instanceof Error ? error.message : "No se pudo actualizar configuración de procesamiento.";
    return server500(message);
  }
}
