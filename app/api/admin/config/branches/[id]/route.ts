import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import {
  branchUpdateSchema,
  conflict409,
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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BRANCH_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const tenantId = auth.user?.tenantId || "global";

  try {
    const body = await req.json().catch(() => null);
    const parsed = branchUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para sucursal.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const before = await prisma.branch.findFirst({
      where: { id: resolved.id, tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        timezone: true,
        isActive: true
      }
    });

    if (!before) {
      return notFound404("Sucursal no encontrada.");
    }

    const nextIsActive = typeof parsed.data.isActive === "boolean" ? parsed.data.isActive : before.isActive;
    if (before.isActive && !nextIsActive) {
      const systemConfig = await getSystemFeatureConfig();
      const shouldBlockDeactivateWithFutureAppointments =
        systemConfig.strictMode ||
        isFlagEnabledFromSnapshot(systemConfig, "branches.preventDeactivateWithFutureAppointments");

      if (shouldBlockDeactivateWithFutureAppointments) {
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
    }

    const updated = await prisma.branch.update({
      where: { id: resolved.id },
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        address: parsed.data.address,
        phone: parsed.data.phone,
        timezone: parsed.data.timezone,
        isActive: nextIsActive
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        timezone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await auditLog({
      action: "BRANCH_UPDATED",
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
      warnDevCentralCompat("config.branches.update", error);
      return service503(
        "DB_NOT_READY",
        "Configuración de sucursales no disponible. Ejecuta migraciones y prisma generate."
      );
    }

    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        return conflict409("Código o nombre de sucursal duplicado.");
      }
      if (code === "P2025") {
        return notFound404("Sucursal no encontrada.");
      }
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar la sucursal.";
    return server500(message);
  }
}
