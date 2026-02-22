import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import {
  isCentralConfigCompatError,
  legalEntityUpdateSchema,
  notFound404,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveParams(params: { id: string } | Promise<{ id: string }>): Promise<{ id: string }> {
  if ("then" in params) return params;
  return params;
}

function toUiEntity(row: {
  id: string;
  name: string;
  comercialName: string | null;
  nit: string | null;
  fiscalAddress: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: null,
    legalName: row.name,
    tradeName: row.comercialName,
    nit: row.nit,
    address: row.fiscalAddress,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);

  try {
    const body = await req.json().catch(() => null);
    const parsed = legalEntityUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para entidad legal.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const before = await prisma.legalEntity.findUnique({
      where: { id: resolved.id },
      select: {
        id: true,
        name: true,
        comercialName: true,
        nit: true,
        fiscalAddress: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!before) {
      return notFound404("Entidad legal no encontrada.");
    }

    const updated = await prisma.legalEntity.update({
      where: { id: resolved.id },
      data: {
        name: parsed.data.legalName,
        comercialName: parsed.data.tradeName,
        nit: parsed.data.nit,
        fiscalAddress: parsed.data.address,
        isActive: parsed.data.isActive
      },
      select: {
        id: true,
        name: true,
        comercialName: true,
        nit: true,
        fiscalAddress: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await auditLog({
      action: "LEGAL_ENTITY_UPDATED",
      entityType: "LegalEntity",
      entityId: updated.id,
      user: auth.user,
      req,
      before,
      after: updated
    });

    return NextResponse.json({ ok: true, data: toUiEntity(updated) });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.legalEntities.update", error);
      return service503("DB_NOT_READY", "Entidades legales no disponibles. Ejecuta migraciones y prisma generate.");
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar la entidad legal.";
    return server500(message);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);

  try {
    const before = await prisma.legalEntity.findUnique({
      where: { id: resolved.id },
      select: {
        id: true,
        name: true,
        comercialName: true,
        nit: true,
        fiscalAddress: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!before) {
      return notFound404("Entidad legal no encontrada.");
    }

    const body = await req.json().catch(() => null);
    const explicitState = body && typeof body === "object" && "isActive" in body ? Boolean((body as { isActive?: unknown }).isActive) : null;
    const nextState = explicitState === null ? !before.isActive : explicitState;

    const updated = await prisma.legalEntity.update({
      where: { id: resolved.id },
      data: { isActive: nextState },
      select: {
        id: true,
        name: true,
        comercialName: true,
        nit: true,
        fiscalAddress: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await auditLog({
      action: nextState ? "LEGAL_ENTITY_ACTIVATED" : "LEGAL_ENTITY_DEACTIVATED",
      entityType: "LegalEntity",
      entityId: updated.id,
      user: auth.user,
      req,
      before,
      after: updated
    });

    return NextResponse.json({ ok: true, data: toUiEntity(updated) });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.legalEntities.toggle", error);
      return service503("DB_NOT_READY", "Entidades legales no disponibles. Ejecuta migraciones y prisma generate.");
    }

    const message = error instanceof Error ? error.message : "No se pudo cambiar estado de la entidad legal.";
    return server500(message);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);

  try {
    const before = await prisma.legalEntity.findUnique({
      where: { id: resolved.id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            satEstablishments: true,
            branchBillingProfiles: true,
            tradeUnits: true
          }
        }
      }
    });
    if (!before) {
      return notFound404("Entidad legal no encontrada.");
    }

    if (
      before._count.satEstablishments > 0 ||
      before._count.branchBillingProfiles > 0 ||
      before._count.tradeUnits > 0
    ) {
      return validation422("No puedes eliminar una entidad legal en uso.", [
        {
          path: "id",
          message: "Elimina o reasigna establecimientos, perfiles y unidades comerciales primero."
        }
      ]);
    }

    await prisma.legalEntity.delete({ where: { id: resolved.id } });

    await auditLog({
      action: "LEGAL_ENTITY_DELETED",
      entityType: "LegalEntity",
      entityId: before.id,
      user: auth.user,
      req,
      before
    });

    return NextResponse.json({ ok: true, data: { id: before.id } });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.legalEntities.delete", error);
      return service503("DB_NOT_READY", "Entidades legales no disponibles. Ejecuta migraciones y prisma generate.");
    }

    const message = error instanceof Error ? error.message : "No se pudo eliminar la entidad legal.";
    return server500(message);
  }
}
