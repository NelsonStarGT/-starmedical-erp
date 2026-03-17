import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auditLog } from "@/lib/audit";
import {
  getTenantSecurityPolicy,
  isCentralConfigCompatError,
  parseTenantSecurityPolicyPatch,
  requireConfigCentralCapability,
  server500,
  service503,
  updateTenantSecurityPolicy,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { normalizeTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_SECURITY_READ");
  if (auth.response) return auth.response;

  try {
    const tenantId = normalizeTenantId(auth.user?.tenantId);
    const data = await getTenantSecurityPolicy(tenantId);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.securityPolicy.get", error);
      return service503("DB_NOT_READY", "Política de seguridad no disponible.");
    }

    const message = error instanceof Error ? error.message : "No se pudo cargar la política de seguridad.";
    return server500(message);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_SECURITY_WRITE");
  if (auth.response) return auth.response;

  try {
    enforceRateLimit(req, { limit: 20, windowMs: 60_000 });
    const body = await req.json().catch(() => ({}));
    const patch = parseTenantSecurityPolicyPatch(body);
    if (patch.enforce2FA === true) {
      return validation422("2FA aún no está implementado para login.", [
        {
          path: "enforce2FA",
          message: "No actives enforce2FA hasta implementar el flujo real de enrolamiento y verificación."
        }
      ]);
    }
    const tenantId = normalizeTenantId(auth.user?.tenantId);

    const before = await getTenantSecurityPolicy(tenantId);
    const data = await updateTenantSecurityPolicy({
      tenantId,
      patch,
      updatedByUserId: auth.user?.id ?? null
    });

    await auditLog({
      action: "SECURITY_POLICY_UPDATED",
      entityType: "TenantSecurityPolicy",
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
        "Datos inválidos para política de seguridad.",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.securityPolicy.put", error);
      return service503("DB_NOT_READY", "Política de seguridad no disponible.");
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

    const message = error instanceof Error ? error.message : "No se pudo actualizar la política de seguridad.";
    return server500(message);
  }
}
