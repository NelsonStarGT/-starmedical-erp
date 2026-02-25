import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import {
  branchSatEstablishmentUpdateSchema,
  conflict409,
  isCentralConfigCompatError,
  notFound404,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveParams(
  params:
    | { id: string; estId: string }
    | Promise<{ id: string; estId: string }>
): Promise<{ id: string; estId: string }> {
  if ("then" in params) return params;
  return params;
}

export async function PUT(
  req: NextRequest,
  {
    params
  }:
    | { params: { id: string; estId: string } }
    | { params: Promise<{ id: string; estId: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const tenantId = auth.user?.tenantId || "global";

  try {
    const body = await req.json().catch(() => null);
    const parsed = branchSatEstablishmentUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para establecimiento SAT.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const before = await prisma.branchSatEstablishment.findUnique({
      where: { id: resolved.estId },
      select: {
        id: true,
        branchId: true,
        satEstablishmentCode: true,
        legalName: true,
        tradeName: true,
        address: true,
        isActive: true
      }
    });

    if (!before || before.branchId !== resolved.id) {
      return notFound404("Establecimiento SAT no encontrado.");
    }

    const branchScoped = await prisma.branch.findFirst({
      where: { id: resolved.id, tenantId },
      select: { id: true, isActive: true }
    });
    if (!branchScoped) {
      return notFound404("Sucursal no encontrada.");
    }

    const nextIsActive = typeof parsed.data.isActive === "boolean" ? parsed.data.isActive : before.isActive;
    if (nextIsActive) {
      if (!branchScoped.isActive) {
        return validation422("No puedes activar establecimientos SAT en una sucursal inactiva.");
      }
    }

    const updated = await prisma.branchSatEstablishment.update({
      where: { id: resolved.estId },
      data: {
        satEstablishmentCode: parsed.data.satEstablishmentCode,
        legalName: parsed.data.legalName,
        tradeName: parsed.data.tradeName,
        address: parsed.data.address,
        isActive: nextIsActive
      },
      select: {
        id: true,
        branchId: true,
        satEstablishmentCode: true,
        legalName: true,
        tradeName: true,
        address: true,
        isActive: true,
        updatedAt: true
      }
    });

    await auditLog({
      action: "SAT_ESTABLISHMENT_UPDATED",
      entityType: "BranchSatEstablishment",
      entityId: updated.id,
      user: auth.user,
      req,
      before,
      after: updated
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.sat.establishments.update", error);
      return service503(
        "DB_NOT_READY",
        "Establecimientos SAT no disponibles. Ejecuta migraciones y prisma generate."
      );
    }

    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return conflict409("Código SAT duplicado.");
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar establecimiento SAT.";
    return server500(message);
  }
}

export async function PATCH(
  req: NextRequest,
  {
    params
  }:
    | { params: { id: string; estId: string } }
    | { params: Promise<{ id: string; estId: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const tenantId = auth.user?.tenantId || "global";

  try {
    const before = await prisma.branchSatEstablishment.findUnique({
      where: { id: resolved.estId },
      select: {
        id: true,
        branchId: true,
        isActive: true,
        satEstablishmentCode: true
      }
    });

    if (!before || before.branchId !== resolved.id) {
      return notFound404("Establecimiento SAT no encontrado.");
    }

    const branchScoped = await prisma.branch.findFirst({
      where: { id: resolved.id, tenantId },
      select: { id: true, isActive: true }
    });
    if (!branchScoped) {
      return notFound404("Sucursal no encontrada.");
    }

    if (!before.isActive) {
      if (!branchScoped.isActive) {
        return validation422("No puedes activar establecimientos SAT en una sucursal inactiva.");
      }
    }

    const updated = await prisma.branchSatEstablishment.update({
      where: { id: resolved.estId },
      data: { isActive: !before.isActive },
      select: {
        id: true,
        branchId: true,
        satEstablishmentCode: true,
        legalName: true,
        tradeName: true,
        address: true,
        isActive: true,
        updatedAt: true
      }
    });

    await auditLog({
      action: updated.isActive ? "SAT_ESTABLISHMENT_ACTIVATED" : "SAT_ESTABLISHMENT_DEACTIVATED",
      entityType: "BranchSatEstablishment",
      entityId: updated.id,
      user: auth.user,
      req,
      before,
      after: updated
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.sat.establishments.toggle", error);
      return service503(
        "DB_NOT_READY",
        "Establecimientos SAT no disponibles. Ejecuta migraciones y prisma generate."
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar estado del establecimiento SAT.";
    return server500(message);
  }
}
