import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auditLog } from "@/lib/audit";
import {
  deleteBillingSeries,
  isCentralConfigCompatError,
  parseBillingSeriesPatch,
  requireConfigCentralCapability,
  server500,
  service503,
  toggleBillingSeries,
  updateBillingSeries,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { normalizeTenantId } from "@/lib/tenant";
import { enforceRateLimit } from "@/lib/api/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveParams(params: { id: string } | Promise<{ id: string }>): Promise<{ id: string }> {
  if ("then" in params) return params;
  return params;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_BILLING_WRITE");
  if (auth.response) return auth.response;

  const tenantId = normalizeTenantId(auth.user?.tenantId);
  const resolved = await resolveParams(params);

  try {
    enforceRateLimit(req, { limit: 30, windowMs: 60_000 });
    const body = await req.json().catch(() => ({}));
    const patch = parseBillingSeriesPatch(body);
    const data = await updateBillingSeries({
      tenantId,
      seriesId: resolved.id,
      patch
    });

    await auditLog({
      action: "BILLING_SERIES_UPDATED",
      entityType: "BillingSeries",
      entityId: data.id,
      user: auth.user,
      req,
      after: data
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return validation422(
        "Datos inválidos para serie de facturación.",
        error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      );
    }

    if (error instanceof Error) {
      if (error.message === "SERIES_NOT_FOUND") {
        return NextResponse.json({ ok: false, code: "NOT_FOUND", error: "Serie no encontrada." }, { status: 404 });
      }
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
      warnDevCentralCompat("config.billing.series.update", error);
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

    const message = error instanceof Error ? error.message : "No se pudo actualizar la serie.";
    return server500(message);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_BILLING_WRITE");
  if (auth.response) return auth.response;

  const tenantId = normalizeTenantId(auth.user?.tenantId);
  const resolved = await resolveParams(params);

  try {
    enforceRateLimit(req, { limit: 40, windowMs: 60_000 });
    const body = (await req.json().catch(() => ({}))) as { isActive?: unknown };
    const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;

    const data = await toggleBillingSeries({
      tenantId,
      seriesId: resolved.id,
      isActive
    });

    await auditLog({
      action: data.isActive ? "BILLING_SERIES_ACTIVATED" : "BILLING_SERIES_DEACTIVATED",
      entityType: "BillingSeries",
      entityId: data.id,
      user: auth.user,
      req,
      after: data
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "SERIES_NOT_FOUND") {
      return NextResponse.json({ ok: false, code: "NOT_FOUND", error: "Serie no encontrada." }, { status: 404 });
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.billing.series.toggle", error);
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

    const message = error instanceof Error ? error.message : "No se pudo actualizar estado de la serie.";
    return server500(message);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_BILLING_WRITE");
  if (auth.response) return auth.response;

  const tenantId = normalizeTenantId(auth.user?.tenantId);
  const resolved = await resolveParams(params);

  try {
    enforceRateLimit(req, { limit: 20, windowMs: 60_000 });
    const data = await deleteBillingSeries({
      tenantId,
      seriesId: resolved.id
    });

    await auditLog({
      action: "BILLING_SERIES_DELETED",
      entityType: "BillingSeries",
      entityId: data.id,
      user: auth.user,
      req,
      before: data
    });

    return NextResponse.json({ ok: true, data: { id: data.id } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SERIES_NOT_FOUND") {
        return NextResponse.json({ ok: false, code: "NOT_FOUND", error: "Serie no encontrada." }, { status: 404 });
      }
      if (error.message === "SERIES_IN_USE") {
        return validation422("No puedes eliminar una serie con facturas emitidas.", [
          { path: "id", message: "La serie está en uso." }
        ]);
      }
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.billing.series.delete", error);
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

    const message = error instanceof Error ? error.message : "No se pudo eliminar la serie.";
    return server500(message);
  }
}
