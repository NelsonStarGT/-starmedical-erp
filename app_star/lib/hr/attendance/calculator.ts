import { AttendanceColor, AttendanceStatus, TimeClockLogType } from "@prisma/client";

type ShiftLike = {
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  toleranceMinutes?: number | null;
};

type LogLike = {
  timestamp: Date;
  type: TimeClockLogType;
};

export type AttendanceComputation = {
  checkIn: Date | null;
  checkOut: Date | null;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  tardyMinutes: number;
  status: AttendanceStatus;
  color: AttendanceColor;
  notes: string[];
};

const MINUTES = 60 * 1000;

const clampToHours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

const combineDateAndTime = (baseDate: Date, time: string) => {
  const [hours, minutes] = time.split(":").map((value) => parseInt(value, 10));
  const date = new Date(baseDate);
  date.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date;
};

export function buildShiftWindow(date: Date, shift: ShiftLike | null | undefined) {
  if (!shift) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {
      start,
      end,
      expectedMinutes: 0,
      toleranceMinutes: 0
    };
  }

  const start = combineDateAndTime(date, shift.startTime);
  const end = combineDateAndTime(date, shift.endTime);
  if (shift.crossesMidnight || end <= start) {
    end.setDate(end.getDate() + 1);
  }

  const expectedMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / MINUTES));
  return {
    start,
    end,
    expectedMinutes,
    toleranceMinutes: shift.toleranceMinutes || 0
  };
}

export function computeAttendanceFromLogs(params: {
  date: Date;
  shift?: ShiftLike | null;
  logs: LogLike[];
  leaveApproved?: boolean;
}) {
  const { shift = null, logs, leaveApproved } = params;
  const window = buildShiftWindow(params.date, shift);
  const windowStart = new Date(window.start.getTime() - 90 * MINUTES);
  const windowEnd = new Date(window.end.getTime() + 240 * MINUTES);

  const sortedLogs = (logs || [])
    .filter((log) => log.timestamp >= windowStart && log.timestamp <= windowEnd)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const checkIn = sortedLogs.find((log) => log.type === TimeClockLogType.IN) || null;
  const checkOut =
    [...sortedLogs]
      .reverse()
      .find((log) => log.type === TimeClockLogType.OUT && (!checkIn || log.timestamp >= checkIn.timestamp)) || null;

  const totalMinutes =
    checkIn && checkOut
      ? Math.max(0, Math.round((checkOut.timestamp.getTime() - checkIn.timestamp.getTime()) / MINUTES))
      : 0;

  const regularMinutes = Math.min(totalMinutes, window.expectedMinutes);
  const overtimeMinutes = Math.max(0, totalMinutes - window.expectedMinutes);

  let tardyMinutes = 0;
  const toleranceStart = new Date(window.start.getTime() + window.toleranceMinutes * MINUTES);
  if (checkIn && checkIn.timestamp > toleranceStart) {
    tardyMinutes = Math.max(0, Math.round((checkIn.timestamp.getTime() - toleranceStart.getTime()) / MINUTES));
  }

  const notes: string[] = [];
  let status: AttendanceStatus = AttendanceStatus.ABSENT;
  let color: AttendanceColor = AttendanceColor.RED;

  if (!checkIn && leaveApproved) {
    status = AttendanceStatus.NORMAL;
    color = AttendanceColor.GREEN;
    notes.push("Permiso aprobado");
  } else if (!checkIn) {
    status = AttendanceStatus.ABSENT;
    color = AttendanceColor.RED;
    notes.push("Sin marcaje de entrada");
  } else if (tardyMinutes > 0) {
    status = AttendanceStatus.TARDY;
    color = AttendanceColor.ORANGE;
    notes.push(`Atraso de ${tardyMinutes} minutos`);
  } else {
    status = AttendanceStatus.NORMAL;
    color = AttendanceColor.GREEN;
  }

  if (overtimeMinutes > 0) {
    notes.push(`Horas extra sugeridas: ${clampToHours(overtimeMinutes)}h`);
  }

  return {
    checkIn: checkIn?.timestamp || null,
    checkOut: checkOut?.timestamp || null,
    totalHours: clampToHours(totalMinutes),
    regularHours: clampToHours(regularMinutes),
    overtimeHours: clampToHours(overtimeMinutes),
    tardyMinutes,
    status,
    color,
    notes
  } satisfies AttendanceComputation;
}
