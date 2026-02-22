import { AppointmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  buildEmptyPortalAvailability,
  buildPortalAvailability,
  parsePortalAvailabilityDate,
  selectVigenteBranchBusinessHours
} from "@/lib/portal/appointmentsAvailability";
import { extractScheduleRangesForDate } from "@/lib/config-central/hours";
import { isCentralConfigCompatError, warnDevCentralCompat } from "@/lib/config-central";
import { getPortalConfig } from "@/lib/portales";
import { prisma } from "@/lib/prisma";
import { getPortalSessionContextFromRequest } from "@/lib/portal/session";
import { getSystemFeatureConfig, isFlagEnabledFromSnapshot } from "@/lib/system-flags/service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getPortalSessionContextFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const branchId = req.nextUrl.searchParams.get("branchId")?.trim() || "";
  const typeId = req.nextUrl.searchParams.get("typeId")?.trim() || "";
  const dateRaw = req.nextUrl.searchParams.get("date")?.trim() || "";

  if (!branchId || !typeId || !dateRaw) {
    return NextResponse.json({ ok: false, error: "Debes enviar sede, tipo y fecha." }, { status: 400 });
  }

  const date = parsePortalAvailabilityDate(dateRaw);
  if (!date) {
    return NextResponse.json({ ok: false, error: "La fecha debe tener formato YYYY-MM-DD." }, { status: 400 });
  }

  const [branch, type, portalConfig, systemConfig] = await Promise.all([
    prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, isActive: true, name: true }
    }),
    prisma.appointmentType.findUnique({
      where: { id: typeId },
      select: { id: true, status: true, durationMin: true, name: true }
    }),
    getPortalConfig().catch(() => null),
    getSystemFeatureConfig().catch(() => null)
  ]);

  const strictMode = Boolean(systemConfig?.strictMode);
  const portalEnabled = systemConfig ? isFlagEnabledFromSnapshot(systemConfig, "portal.enabled") : true;
  const strictAvailability = strictMode || (systemConfig ? isFlagEnabledFromSnapshot(systemConfig, "portal.strictAvailability") : true);

  if (!portalEnabled) {
    return NextResponse.json(
      {
        ok: false,
        error: "Portal paciente temporalmente deshabilitado por configuración."
      },
      { status: 503 }
    );
  }

  if (!branch || !branch.isActive) {
    return NextResponse.json({ ok: false, error: "Sede no disponible." }, { status: 400 });
  }
  if (!type || type.status !== "Activo") {
    return NextResponse.json({ ok: false, error: "Tipo de cita no disponible." }, { status: 400 });
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const occupiedRows = await prisma.appointment.findMany({
    where: {
      branchId,
      date: { gte: dayStart, lte: dayEnd },
      status: {
        in: [AppointmentStatus.CONFIRMADA, AppointmentStatus.PROGRAMADA]
      }
    },
    select: {
      date: true,
      durationMin: true
    }
  });

  const rules = portalConfig?.appointmentsRules;

  let businessHours:
    | {
        id: string;
        validFrom: Date;
        validTo: Date | null;
        isActive: boolean;
        scheduleJson: unknown;
        slotMinutesDefault: number | null;
      }
    | null = null;

  try {
    const rows = await prisma.branchBusinessHours.findMany({
      where: {
        branchId,
        isActive: true,
        validFrom: { lte: dayEnd },
        OR: [{ validTo: null }, { validTo: { gte: dayStart } }]
      },
      orderBy: [{ validFrom: "desc" }],
      take: 25,
      select: {
        id: true,
        validFrom: true,
        validTo: true,
        isActive: true,
        scheduleJson: true,
        slotMinutesDefault: true
      }
    });
    businessHours = selectVigenteBranchBusinessHours(rows, date);
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("portal.availability.branchHours", error);
      if (strictAvailability) {
        return NextResponse.json(
          {
            ok: false,
            error: "Horario no configurado o esquema no compatible. Configura la sede para disponibilidad estricta."
          },
          { status: 503 }
        );
      }
      businessHours = null;
    } else {
      throw error;
    }
  }

  const dayRanges = businessHours ? extractScheduleRangesForDate(businessHours.scheduleJson, date) : [];
  const startHour = dayRanges.length > 0 ? Math.min(...dayRanges.map((range) => range.startHour)) : 8;
  const endHour = dayRanges.length > 0 ? Math.max(...dayRanges.map((range) => range.endHour)) : 17;
  const slotMinutes = businessHours?.slotMinutesDefault || type.durationMin || 30;

  if (!businessHours || dayRanges.length === 0) {
    if (strictAvailability) {
      return NextResponse.json(
        {
          ok: false,
          error: !businessHours ? "Sucursal sin horario configurado." : "Sucursal sin horario configurado para ese día."
        },
        { status: 409 }
      );
    }
    const message = !businessHours ? "Sucursal sin horario configurado." : "Sucursal sin horario configurado para ese día.";
    return NextResponse.json({
      ok: true,
      data: buildEmptyPortalAvailability({
        slotMinutes,
        startHour,
        endHour
      }),
      message
    });
  }

  const availability = buildPortalAvailability({
    date,
    slotMinutes,
    startHour,
    endHour,
    timeRanges: dayRanges,
    occupiedAppointments: occupiedRows.map((row) => ({
      start: row.date,
      durationMin: row.durationMin
    })),
    thresholds: {
      greenThreshold: rules?.greenThreshold,
      yellowThreshold: rules?.yellowThreshold
    }
  });

  return NextResponse.json({
    ok: true,
    data: availability
  });
}
