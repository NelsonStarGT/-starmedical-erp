import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auditLog } from "@/lib/audit";
import {
  isCentralConfigCompatError,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { normalizeTenantId } from "@/lib/tenant";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import {
  getTenantDateTimeConfig,
  parseTenantDateTimeConfigPatch,
  updateTenantDateTimeConfig
} from "@/lib/datetime/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BRANCH_READ");
  if (auth.response) return auth.response;

  try {
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const data = await getTenantDateTimeConfig(tenantId);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.datetime.get", error);
      return service503("DB_NOT_READY", "Configuración de fecha/hora no disponible.");
    }
    const message = error instanceof Error ? error.message : "No se pudo cargar la configuración de fecha/hora.";
    return server500(message);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BRANCH_WRITE");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 25, windowMs: 60_000 });

    const body = await req.json().catch(() => ({}));
    const patch = parseTenantDateTimeConfigPatch(body);
    const tenantId = normalizeTenantId(auth.user?.tenantId);

    const before = await getTenantDateTimeConfig(tenantId);
    const updated = await updateTenantDateTimeConfig({
      tenantId,
      patch,
      updatedByUserId: auth.user?.id ?? null
    });

    await auditLog({
      action: "TENANT_DATETIME_CONFIG_UPDATED",
      entityType: "TenantDateTimeConfig",
      entityId: tenantId,
      user: auth.user,
      req,
      before,
      after: updated
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return validation422(
        "Datos inválidos para configuración de fecha/hora.",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.datetime.put", error);
      return service503("DB_NOT_READY", "Configuración de fecha/hora no disponible.");
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

    const message = error instanceof Error ? error.message : "No se pudo actualizar la configuración de fecha/hora.";
    return server500(message);
  }
}
