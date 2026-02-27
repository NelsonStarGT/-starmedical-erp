import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import {
  branchBusinessHoursPatchSchema,
  conflict409,
  dateRangesOverlap,
  isCentralConfigCompatError,
  notFound404,
  parseDateInput,
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
    | { id: string; hoursId: string }
    | Promise<{ id: string; hoursId: string }>
): Promise<{ id: string; hoursId: string }> {
  if ("then" in params) return params;
  return params;
}

export async function PATCH(
  req: NextRequest,
  {
    params
  }:
    | { params: { id: string; hoursId: string } }
    | { params: Promise<{ id: string; hoursId: string }> }
) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_BRANCH_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const tenantId = auth.user?.tenantId || "global";

  try {
    const body = await req.json().catch(() => null);
    const parsed = branchBusinessHoursPatchSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para horario.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const branch = await prisma.branch.findFirst({
      where: { id: resolved.id, tenantId },
      select: { id: true }
    });
    if (!branch) {
      return notFound404("Sucursal no encontrada.");
    }

    const before = await prisma.branchBusinessHours.findUnique({
      where: { id: resolved.hoursId },
      select: {
        id: true,
        branchId: true,
        validFrom: true,
        validTo: true,
        isActive: true,
        scheduleJson: true,
        slotMinutesDefault: true
      }
    });

    if (!before || before.branchId !== resolved.id) {
      return notFound404("Horario no encontrado.");
    }

    const nextValidTo = typeof parsed.data.validTo === "undefined"
      ? before.validTo
      : parsed.data.validTo
        ? parseDateInput(parsed.data.validTo)
        : null;

    if (nextValidTo && nextValidTo.getTime() <= before.validFrom.getTime()) {
      return validation422("validTo debe ser mayor que validFrom.", [
        { path: "validTo", message: "Debe ser mayor a validFrom." }
      ]);
    }

    const nextIsActive = typeof parsed.data.isActive === "boolean" ? parsed.data.isActive : before.isActive;
    if (nextIsActive) {
      const otherActiveRows = await prisma.branchBusinessHours.findMany({
        where: {
          branchId: resolved.id,
          id: { not: before.id },
          isActive: true
        },
        select: {
          id: true,
          validFrom: true,
          validTo: true
        }
      });

      const hasOverlap = otherActiveRows.some((row) =>
        dateRangesOverlap(row.validFrom, row.validTo, before.validFrom, nextValidTo)
      );

      if (hasOverlap) {
        return conflict409(
          "Existe otra vigencia activa superpuesta. Cierra la vigente antes de reactivar este horario."
        );
      }
    }

    const updated = await prisma.branchBusinessHours.update({
      where: { id: resolved.hoursId },
      data: {
        validTo: nextValidTo,
        isActive: nextIsActive
      },
      select: {
        id: true,
        branchId: true,
        validFrom: true,
        validTo: true,
        isActive: true,
        scheduleJson: true,
        slotMinutesDefault: true,
        updatedAt: true
      }
    });

    await auditLog({
      action: "BRANCH_HOURS_UPDATED",
      entityType: "BranchBusinessHours",
      entityId: updated.id,
      user: auth.user,
      req,
      before,
      after: updated
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.branches.hours.patch", error);
      return service503(
        "DB_NOT_READY",
        "Horarios de sucursal no disponibles. Ejecuta migraciones y prisma generate."
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar horario.";
    return server500(message);
  }
}
