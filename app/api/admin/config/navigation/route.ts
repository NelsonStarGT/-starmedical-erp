import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auditLog } from "@/lib/audit";
import {
  getTenantNavigationPolicy,
  isCentralConfigCompatError,
  parseTenantNavigationPolicyPatch,
  requireConfigCentralCapability,
  server500,
  service503,
  updateTenantNavigationPolicy,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { normalizeTenantId } from "@/lib/tenant";
import { enforceRateLimit } from "@/lib/api/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_NAVIGATION_READ");
  if (auth.response) return auth.response;

  try {
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const data = await getTenantNavigationPolicy(tenantId);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.navigation.get", error);
      return service503("DB_NOT_READY", "Configuración de navegación no disponible.");
    }

    const message = error instanceof Error ? error.message : "No se pudo cargar navegación.";
    return server500(message);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_NAVIGATION_WRITE");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 25, windowMs: 60_000 });
    const body = await req.json().catch(() => ({}));
    const patch = parseTenantNavigationPolicyPatch(body);
    const tenantId = normalizeTenantId(auth.user?.tenantId);

    const before = await getTenantNavigationPolicy(tenantId);
    const updated = await updateTenantNavigationPolicy({
      tenantId,
      patch,
      updatedByUserId: auth.user?.id ?? null
    });

    await auditLog({
      action: "NAVIGATION_POLICY_UPDATED",
      entityType: "TenantNavigationPolicy",
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
        "Datos inválidos para política de navegación.",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.navigation.put", error);
      return service503("DB_NOT_READY", "Configuración de navegación no disponible.");
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

    const message = error instanceof Error ? error.message : "No se pudo actualizar navegación.";
    return server500(message);
  }
}
