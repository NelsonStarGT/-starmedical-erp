import { addDays, startOfDay } from "date-fns";
import { Prisma } from "@prisma/client";

export type AttendanceEventType = "CHECK_IN" | "CHECK_OUT";

export function isSameDay(a: Date, b: Date) {
  const sa = startOfDay(a).getTime();
  const sb = startOfDay(b).getTime();
  return sa === sb;
}

export function validateSequence(
  existing: { type: AttendanceEventType | string; occurredAt: Date }[],
  next: { type: AttendanceEventType; occurredAt: Date }
) {
  const dayEvents = existing
    .filter((ev) => isSameDay(ev.occurredAt, next.occurredAt))
    .map((ev) => ({ ...ev, type: ev.type as AttendanceEventType }))
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const last = dayEvents[dayEvents.length - 1];
  if (next.type === "CHECK_IN") {
    if (last && last.type === "CHECK_IN") {
      throw { status: 409, body: { error: "Ya existe un check-in sin check-out" } };
    }
    return;
  }
  if (next.type === "CHECK_OUT") {
    if (!last || last.type !== "CHECK_IN") {
      throw { status: 409, body: { error: "No se puede registrar salida sin entrada previa" } };
    }
    return;
  }
}

export function isEligible(employee: { status: string; onboardingStatus: string }) {
  if (employee.onboardingStatus !== "ACTIVE") throw { status: 409, body: { error: "Empleado no elegible (onboarding incompleto)" } };
  if (employee.status === "TERMINATED") throw { status: 409, body: { error: "Empleado terminado" } };
}

export async function upsertEvent(tx: Prisma.TransactionClient, data: {
  employeeId: string;
  type: AttendanceEventType;
  occurredAt: Date;
  note?: string | null;
  createdByUserId?: string | null;
}) {
  const existing = await tx.hrAttendanceEvent.findMany({
    where: { employeeId: data.employeeId, occurredAt: { gte: startOfDay(data.occurredAt), lt: addDays(startOfDay(data.occurredAt), 1) } },
    orderBy: { occurredAt: "asc" }
  });
  validateSequence(existing, { type: data.type, occurredAt: data.occurredAt });
  return tx.hrAttendanceEvent.create({ data: { ...data, source: "MANUAL" } });
}
