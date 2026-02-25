import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auditLog } from "@/lib/audit";
import {
  createBillingSeries,
  isCentralConfigCompatError,
  listBillingSeries,
  parseBillingSeriesCreate,
  requireConfigCentralCapability,
  server500,
  service503,
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

  const tenantId = normalizeTenantId(auth.user?.tenantId);
  const legalEntityId = req.nextUrl.searchParams.get("legalEntityId")?.trim() || null;
  const branchId = req.nextUrl.searchParams.get("branchId")?.trim() || null;
  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";

  try {
    const data = await listBillingSeries({
      tenantId,
      legalEntityId,
      branchId,
      includeInactive
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.billing.series.list", error);
      return service503("DB_NOT_READY", "Series de facturación no disponibles.");
    }

    const message = error instanceof Error ? error.message : "No se pudieron listar las series de facturación.";
    return server500(message);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BILLING_WRITE");
  if (auth.response) return auth.response;

  const tenantId = normalizeTenantId(auth.user?.tenantId);

  try {
    enforceRateLimit(req, { limit: 30, windowMs: 60_000 });
    const body = await req.json().catch(() => ({}));
    const payload = parseBillingSeriesCreate(body);

    const data = await createBillingSeries({
      tenantId,
      payload
    });

    await auditLog({
      action: "BILLING_SERIES_CREATED",
      entityType: "BillingSeries",
      entityId: data.id,
      user: auth.user,
      req,
      after: data
    });

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validation422(
        "Datos inválidos para serie de facturación.",
        error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      );
    }

    if (error instanceof Error) {
      if (error.message === "LEGAL_ENTITY_NOT_FOUND") {
        return validation422("Entidad legal inválida para el tenant.", [
          { path: "legalEntityId", message: "No existe o no pertenece al tenant." }
        ]);
      }
      if (error.message === "DUPLICATE_NAME") {
        return validation422("Nombre de serie duplicado.", [
          { path: "name", message: "Ya existe en la patente/sucursal seleccionada." }
        ]);
      }
      if (error.message === "DUPLICATE_PREFIX") {
        return validation422("Prefijo de serie duplicado.", [
          { path: "prefix", message: "Ya existe en la patente/sucursal seleccionada." }
        ]);
      }
    }

    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return validation422("Serie de facturación duplicada.", [
        { path: "prefix", message: "El prefijo o nombre ya existe para la patente/sucursal seleccionada." }
      ]);
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.billing.series.create", error);
      return service503("DB_NOT_READY", "Series de facturación no disponibles.");
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

    const message = error instanceof Error ? error.message : "No se pudo crear la serie de facturación.";
    return server500(message);
  }
}
