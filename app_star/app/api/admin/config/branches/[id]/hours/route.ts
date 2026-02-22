import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import {
  branchBusinessHoursCreateSchema,
  conflict409,
  dateRangesOverlap,
  findOverlappingScheduleRanges,
  isCentralConfigCompatError,
  normalizeBranchSchedule,
  notFound404,
  parseDateInput,
  requireConfigCentralCapability,
  scheduleHasAnyRange,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveParams(
  params: { id: string } | Promise<{ id: string }>
): Promise<{ id: string }> {
  if ("then" in params) return params;
  return params;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BRANCH_READ");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const now = new Date();

  try {
    const [branch, rows] = await Promise.all([
      prisma.branch.findUnique({
        where: { id: resolved.id },
        select: { id: true, name: true, code: true, timezone: true, isActive: true }
      }),
      prisma.branchBusinessHours.findMany({
        where: { branchId: resolved.id },
        orderBy: [{ validFrom: "desc" }],
        take: 50,
        select: {
          id: true,
          branchId: true,
          validFrom: true,
          validTo: true,
          scheduleJson: true,
          slotMinutesDefault: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    if (!branch) {
      return notFound404("Sucursal no encontrada.");
    }

    const current = rows.find(
      (row) =>
        row.isActive &&
        row.validFrom.getTime() <= now.getTime() &&
        (!row.validTo || row.validTo.getTime() >= now.getTime())
    );

    return NextResponse.json({
      ok: true,
      data: {
        branch,
        current: current ?? null,
        items: rows
      }
    });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.branches.hours.list", error);
      return service503(
        "DB_NOT_READY",
        "Horarios de sucursal no disponibles. Ejecuta migraciones y prisma generate."
      );
    }

    const message = error instanceof Error ? error.message : "No se pudieron cargar horarios.";
    return server500(message);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BRANCH_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);

  try {
    const body = await req.json().catch(() => null);
    const parsed = branchBusinessHoursCreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para horario.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const validFrom = parseDateInput(parsed.data.validFrom);
    const validTo = parsed.data.validTo ? parseDateInput(parsed.data.validTo) : null;

    if (validTo && validTo.getTime() <= validFrom.getTime()) {
      return validation422("validTo debe ser mayor que validFrom.", [
        { path: "validTo", message: "Debe ser mayor a validFrom." }
      ]);
    }

    const schedule = normalizeBranchSchedule(parsed.data.scheduleJson);
    if (!scheduleHasAnyRange(schedule)) {
      return validation422("El horario no puede publicarse vacío.", [
        { path: "scheduleJson", message: "Debes definir al menos un rango horario." }
      ]);
    }

    const overlapIssues = findOverlappingScheduleRanges(schedule);
    if (overlapIssues.length > 0) {
      return validation422(
        "Existen rangos horarios superpuestos dentro del mismo día.",
        overlapIssues.map((issue) => ({
          path: `scheduleJson.${issue.day}`,
          message: `${issue.left} se superpone con ${issue.right}`
        }))
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findUnique({
        where: { id: resolved.id },
        select: { id: true, name: true }
      });

      if (!branch) {
        throw new Error("BRANCH_NOT_FOUND");
      }

      const activeRows = await tx.branchBusinessHours.findMany({
        where: {
          branchId: resolved.id,
          isActive: true
        },
        select: {
          id: true,
          validFrom: true,
          validTo: true
        }
      });

      const overlappingActiveIds = activeRows
        .filter((row) => dateRangesOverlap(row.validFrom, row.validTo, validFrom, validTo))
        .map((row) => row.id);

      if (overlappingActiveIds.length) {
        if (parsed.data.isActive && !validTo) {
          await tx.branchBusinessHours.updateMany({
            where: {
              id: { in: overlappingActiveIds },
              validTo: null
            },
            data: {
              validTo: validFrom,
              isActive: false
            }
          });
        }

        const stillOverlapping = await tx.branchBusinessHours.findMany({
          where: {
            id: { in: overlappingActiveIds },
            isActive: true
          },
          select: { id: true, validFrom: true, validTo: true }
        });

        const collision = stillOverlapping.some((row) =>
          dateRangesOverlap(row.validFrom, row.validTo, validFrom, validTo)
        );

        if (collision) {
          throw new Error("HOURS_OVERLAP");
        }
      }

      return tx.branchBusinessHours.create({
        data: {
          branchId: resolved.id,
          validFrom,
          validTo,
          scheduleJson: schedule,
          slotMinutesDefault: parsed.data.slotMinutesDefault ?? null,
          isActive: parsed.data.isActive
        },
        select: {
          id: true,
          branchId: true,
          validFrom: true,
          validTo: true,
          scheduleJson: true,
          slotMinutesDefault: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });
    });

    await auditLog({
      action: "BRANCH_HOURS_UPDATED",
      entityType: "BranchBusinessHours",
      entityId: created.id,
      user: auth.user,
      req,
      after: created,
      metadata: {
        branchId: created.branchId,
        validFrom: created.validFrom.toISOString(),
        validTo: created.validTo?.toISOString() ?? null
      }
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "BRANCH_NOT_FOUND") {
      return notFound404("Sucursal no encontrada.");
    }

    if (error instanceof Error && error.message === "HOURS_OVERLAP") {
      return conflict409(
        "Existe una vigencia activa superpuesta. Cierra la vigencia anterior antes de publicar una nueva."
      );
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.branches.hours.create", error);
      return service503(
        "DB_NOT_READY",
        "Horarios de sucursal no disponibles. Ejecuta migraciones y prisma generate."
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo publicar horario.";
    return server500(message);
  }
}
