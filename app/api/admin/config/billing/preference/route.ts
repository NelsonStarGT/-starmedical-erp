import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auditLog } from "@/lib/audit";
import {
  getTenantBillingPreference,
  isCentralConfigCompatError,
  parseTenantBillingPreferencePatch,
  requireConfigCentralCapability,
  server500,
  service503,
  updateTenantBillingPreference,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { normalizeTenantId } from "@/lib/tenant";
import { enforceRateLimit } from "@/lib/api/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BILLING_READ");
  if (auth.response) return auth.response;

  try {
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const data = await getTenantBillingPreference(tenantId);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.billing.preference.get", error);
      return service503("DB_NOT_READY", "Preferencias de facturación no disponibles.");
    }

    const message = error instanceof Error ? error.message : "No se pudo cargar preferencia de facturación.";
    return server500(message);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BILLING_WRITE");
  if (auth.response) return auth.response;

  const tenantId = normalizeTenantId(auth.user?.tenantId);

  try {
    enforceRateLimit(req, { limit: 25, windowMs: 60_000 });
    const body = await req.json().catch(() => ({}));
    const patch = parseTenantBillingPreferencePatch(body);
    const before = await getTenantBillingPreference(tenantId);

    const data = await updateTenantBillingPreference({
      tenantId,
      patch,
      updatedByUserId: auth.user?.id ?? null
    });

    await auditLog({
      action: "TENANT_BILLING_PREFERENCE_UPDATED",
      entityType: "TenantBillingPreference",
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
        "Datos inválidos para preferencia de facturación.",
        error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      );
    }

    if (error instanceof Error && error.message === "LEGAL_ENTITY_NOT_FOUND") {
      return validation422("Entidad legal inválida para el tenant.", [
        { path: "defaultLegalEntityId", message: "No existe o no pertenece al tenant." }
      ]);
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.billing.preference.put", error);
      return service503("DB_NOT_READY", "Preferencias de facturación no disponibles.");
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

    const message = error instanceof Error ? error.message : "No se pudo guardar preferencia de facturación.";
    return server500(message);
  }
}
