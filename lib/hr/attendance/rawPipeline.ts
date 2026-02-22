import { addDays } from "date-fns";
import {
  AttendanceRawEventStatus,
  AttendanceRawEventType,
  AttendanceRecordSource,
  HrEmployeeStatus,
  Prisma,
  PrismaClient
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "./service";

const DEFAULT_TIMEZONE = "America/Guatemala";
const MINUTES = 60 * 1000;

const toDateParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const filled: Record<string, number> = {
    year: Number(parts.find((p) => p.type === "year")?.value) || date.getFullYear(),
    month: Number(parts.find((p) => p.type === "month")?.value) || date.getMonth() + 1,
    day: Number(parts.find((p) => p.type === "day")?.value) || date.getDate(),
    hour: Number(parts.find((p) => p.type === "hour")?.value) || date.getHours(),
    minute: Number(parts.find((p) => p.type === "minute")?.value) || date.getMinutes(),
    second: Number(parts.find((p) => p.type === "second")?.value) || date.getSeconds()
  };
  return {
    year: filled.year,
    month: filled.month,
    day: filled.day,
    hour: filled.hour,
    minute: filled.minute,
    second: filled.second
  };
};

const offsetMinutesFor = (date: Date, timeZone: string) => {
  const parts = toDateParts(date, timeZone);
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (asUTC - date.getTime()) / MINUTES;
};

const startOfDayInZone = (value: Date, timeZone: string) => {
  const parts = toDateParts(value, timeZone);
  const base = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0);
  const offset = offsetMinutesFor(new Date(base), timeZone);
  return new Date(base - offset * MINUTES);
};

type ProcessOutcome =
  | { id: string; status: "PROCESSED"; message?: null }
  | { id: string; status: "IGNORED" | "FAILED"; message: string };

export async function processRawEvents(params: { limit?: number; tx?: Prisma.TransactionClient }) {
  const client: Prisma.TransactionClient | PrismaClient = params.tx || prisma;
  const settings = await loadSettings(client as any);
  const timeZone = settings?.defaultTimezone || DEFAULT_TIMEZONE;
  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;

  const rawEvents = await client.attendanceRawEvent.findMany({
    where: { status: AttendanceRawEventStatus.NEW },
    orderBy: { occurredAt: "asc" },
    take: limit,
    include: { employee: { include: { branchAssignments: { where: { isPrimary: true }, orderBy: { startDate: "desc" }, take: 1 } } } }
  });

  const outcomes: ProcessOutcome[] = [];

  const runWithTx = async <T,>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => {
    const candidate = client as any;
    if (typeof candidate.$transaction === "function") {
      return candidate.$transaction((tx: Prisma.TransactionClient) => fn(tx));
    }
    return fn(client as Prisma.TransactionClient);
  };

  for (const raw of rawEvents) {
    const outcome = await runWithTx(async (tx) => {
      const resolvedEmployee =
        raw.employee ||
        (raw.biometricId
          ? await tx.hrEmployee.findFirst({
              where: { biometricId: raw.biometricId },
              include: { branchAssignments: { where: { isPrimary: true }, orderBy: { startDate: "desc" }, take: 1 } }
            })
          : null);

      if (!resolvedEmployee) {
        await tx.attendanceRawEvent.update({
          where: { id: raw.id },
          data: { status: AttendanceRawEventStatus.IGNORED, errorMessage: "UNKNOWN_BIOMETRIC_ID" }
        });
        return { id: raw.id, status: "IGNORED", message: "UNKNOWN_BIOMETRIC_ID" } as ProcessOutcome;
      }

      if (resolvedEmployee.status === HrEmployeeStatus.TERMINATED || resolvedEmployee.status === HrEmployeeStatus.ARCHIVED) {
        await tx.attendanceRawEvent.update({
          where: { id: raw.id },
          data: {
            status: AttendanceRawEventStatus.IGNORED,
            errorMessage: "INELIGIBLE_STATUS",
            employeeId: resolvedEmployee.id,
            branchId: raw.branchId || resolvedEmployee.branchAssignments?.[0]?.branchId || null
          }
        });
        return { id: raw.id, status: "IGNORED", message: "INELIGIBLE_STATUS" } as ProcessOutcome;
      }

      const dayStart = startOfDayInZone(raw.occurredAt, timeZone);
      const dayEnd = addDays(dayStart, 1);
      const existing = await tx.attendanceRecord.findFirst({
        where: { employeeId: resolvedEmployee.id, date: { gte: dayStart, lt: dayEnd } }
      });
      const existingCheckIn = await tx.attendanceRecord.findFirst({
        where: { employeeId: resolvedEmployee.id, checkInAt: { not: null }, date: { gte: dayStart, lt: dayEnd } }
      });
      const fallbackRecord = existing || (await tx.attendanceRecord.findFirst({ where: { employeeId: resolvedEmployee.id } }));
      const hasCheckIn = Boolean(existing?.checkInAt || existingCheckIn?.checkInAt || fallbackRecord?.checkInAt);
      const referenceRecord = existingCheckIn || existing || fallbackRecord;
      const targetDate = referenceRecord?.date || dayStart;
      const branchId = raw.branchId || resolvedEmployee.branchAssignments?.[0]?.branchId || existing?.branchId || null;

      const type = raw.type;
      if (type !== AttendanceRawEventType.CHECK_IN && type !== AttendanceRawEventType.CHECK_OUT) {
        await tx.attendanceRawEvent.update({
          where: { id: raw.id },
          data: { status: AttendanceRawEventStatus.IGNORED, errorMessage: "UNSUPPORTED_EVENT_TYPE", employeeId: resolvedEmployee.id, branchId }
        });
        return { id: raw.id, status: "IGNORED", message: "UNSUPPORTED_EVENT_TYPE" } as ProcessOutcome;
      }

      if (type === AttendanceRawEventType.CHECK_IN) {
        if (hasCheckIn) {
          await tx.attendanceRawEvent.update({
            where: { id: raw.id },
            data: { status: AttendanceRawEventStatus.IGNORED, errorMessage: "DUPLICATE_IN", employeeId: resolvedEmployee.id, branchId }
          });
          return { id: raw.id, status: "IGNORED", message: "DUPLICATE_IN" } as ProcessOutcome;
        }
        await tx.attendanceRecord.upsert({
          where: { employeeId_date: { employeeId: resolvedEmployee.id, date: targetDate } },
          update: { checkInAt: raw.occurredAt, branchId, source: AttendanceRecordSource.KIOSK },
          create: {
            employeeId: resolvedEmployee.id,
            date: targetDate,
            branchId,
            checkInAt: raw.occurredAt,
            checkOutAt: null,
            source: AttendanceRecordSource.KIOSK
          }
        });
      } else {
        if (!existing || !existing.checkInAt) {
          await tx.attendanceRawEvent.update({
            where: { id: raw.id },
            data: { status: AttendanceRawEventStatus.FAILED, errorMessage: "OUT_WITHOUT_IN", employeeId: resolvedEmployee.id, branchId }
          });
          return { id: raw.id, status: "FAILED", message: "OUT_WITHOUT_IN" } as ProcessOutcome;
        }
        if (existing.checkOutAt) {
          await tx.attendanceRawEvent.update({
            where: { id: raw.id },
            data: { status: AttendanceRawEventStatus.IGNORED, errorMessage: "DUPLICATE_OUT", employeeId: resolvedEmployee.id, branchId }
          });
          return { id: raw.id, status: "IGNORED", message: "DUPLICATE_OUT" } as ProcessOutcome;
        }
        await tx.attendanceRecord.update({
          where: { employeeId_date: { employeeId: resolvedEmployee.id, date: targetDate } },
          data: { checkOutAt: raw.occurredAt, branchId }
        });
      }

      await tx.attendanceRawEvent.update({
        where: { id: raw.id },
        data: { status: AttendanceRawEventStatus.PROCESSED, errorMessage: null, employeeId: resolvedEmployee.id, branchId }
      });
      return { id: raw.id, status: "PROCESSED", message: null } as ProcessOutcome;
    });

    outcomes.push(outcome);
  }

  return {
    processed: outcomes.filter((o) => o.status === "PROCESSED").length,
    ignored: outcomes.filter((o) => o.status === "IGNORED").length,
    failed: outcomes.filter((o) => o.status === "FAILED").length,
    results: outcomes
  };
}
