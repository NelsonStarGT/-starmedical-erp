import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import {
  isCentralConfigCompatError,
  notFound404,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { getSystemFeatureConfig, isFlagEnabledFromSnapshot } from "@/lib/system-flags/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveParams(
  params: { id: string } | Promise<{ id: string }>
): Promise<{ id: string }> {
  if ("then" in params) return params;
  return params;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BRANCH_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const tenantId = auth.user?.tenantId || "global";

  try {
    const before = await prisma.branch.findFirst({
      where: { id: resolved.id, tenantId },
      select: { id: true, isActive: true, name: true, code: true }
    });

    if (!before) {
      return notFound404("Sucursal no encontrada.");
    }

    if (before.isActive) {
      const systemConfig = await getSystemFeatureConfig();
      const shouldBlockDeactivateWithFutureAppointments =
        systemConfig.strictMode ||
        isFlagEnabledFromSnapshot(systemConfig, "branches.preventDeactivateWithFutureAppointments");

      if (!shouldBlockDeactivateWithFutureAppointments) {
        const updated = await prisma.branch.update({
          where: { id: resolved.id },
          data: { isActive: false },
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            phone: true,
            timezone: true,
            isActive: true,
            updatedAt: true
          }
        });

        await auditLog({
          action: "BRANCH_DEACTIVATED",
          entityType: "Branch",
          entityId: updated.id,
          user: auth.user,
          req,
          before,
          after: updated,
          metadata: { guardBypassedByFlag: true }
        });

        return NextResponse.json({ ok: true, data: updated });
      }

      const now = new Date();
      const futureAppointments = await prisma.appointment.count({
        where: {
          branchId: before.id,
          date: { gt: now },
          status: {
            in: [
              AppointmentStatus.REQUESTED,
              AppointmentStatus.PROGRAMADA,
              AppointmentStatus.CONFIRMADA,
              AppointmentStatus.EN_SALA
            ]
          }
        }
      });

      if (futureAppointments > 0) {
        return validation422("No puedes desactivar la sucursal porque tiene citas futuras programadas.");
      }
    }

    const updated = await prisma.branch.update({
      where: { id: resolved.id },
      data: { isActive: !before.isActive },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        timezone: true,
        isActive: true,
        updatedAt: true
      }
    });

    await auditLog({
      action: updated.isActive ? "BRANCH_ACTIVATED" : "BRANCH_DEACTIVATED",
      entityType: "Branch",
      entityId: updated.id,
      user: auth.user,
      req,
      before,
      after: updated
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.branches.toggle", error);
      return service503(
        "DB_NOT_READY",
        "Configuración de sucursales no disponible. Ejecuta migraciones y prisma generate."
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar estado de la sucursal.";
    return server500(message);
  }
}
