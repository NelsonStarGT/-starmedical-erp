import test from "node:test";
import assert from "node:assert/strict";
import { AttendanceRawEvent, AttendanceShift, EmployeeSiteAssignment } from "@prisma/client";
import { computeDayFromRaw, selectShiftForDay } from "@/lib/hr/attendance/engine";

const date = new Date("2024-01-01T00:00:00Z");

const baseShift: AttendanceShift = {
  id: "shift-1",
  siteId: "site-1",
  name: "Diurno",
  startTime: "08:00",
  endTime: "17:00",
  toleranceMinutes: 15,
  lunchMinutes: 60,
  lunchPaid: false,
  overtimeAllowed: false,
  createdAt: new Date(),
  isDefaultForSite: false
};

function ev(data: Partial<AttendanceRawEvent>): AttendanceRawEvent {
  return {
    id: data.id || "ev",
    employeeId: data.employeeId || "emp1",
    occurredAt: data.occurredAt || date,
    type: data.type || "CHECK_IN",
    source: data.source || "SELFIE_WEB",
    status: data.status || "NEW",
    errorMessage: data.errorMessage || null,
    branchId: data.branchId || null,
    biometricId: data.biometricId || null,
    payloadJson: data.payloadJson || null,
    siteId: data.siteId || "site-1",
    customerId: data.customerId || null,
    deviceTime: data.deviceTime || null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    accuracy: data.accuracy ?? null,
    zoneStatus: data.zoneStatus ?? null,
    photoUrl: data.photoUrl || null,
    photoHash: data.photoHash || null,
    faceStatus: data.faceStatus || null,
    faceScore: data.faceScore ?? null,
    rawPayload: data.rawPayload || null,
    importBatchId: data.importBatchId || null,
    createdByUserId: data.createdByUserId || null,
    createdAt: data.createdAt || new Date()
  };
}

test("Entrada dentro de tolerancia no marca LATE", () => {
  const result = computeDayFromRaw({
    date,
    shift: baseShift,
    rawEvents: [ev({ occurredAt: new Date("2024-01-01T08:10:00Z") }), ev({ occurredAt: new Date("2024-01-01T17:00:00Z"), type: "CHECK_OUT" })]
  });
  assert.equal(result.lateMinutes, 0);
  assert(!result.incidentTypes.includes("LATE"));
});

test("Entrada fuera de tolerancia genera LATE", () => {
  const result = computeDayFromRaw({
    date,
    shift: baseShift,
    rawEvents: [ev({ occurredAt: new Date("2024-01-01T08:30:00Z") }), ev({ occurredAt: new Date("2024-01-01T17:00:00Z"), type: "CHECK_OUT" })]
  });
  assert(result.lateMinutes > 0);
  assert(result.incidentTypes.includes("LATE"));
});

test("Almuerzo automático resta cuando no es pagado", () => {
  const result = computeDayFromRaw({
    date,
    shift: baseShift,
    rawEvents: [ev({ occurredAt: new Date("2024-01-01T08:00:00Z") }), ev({ occurredAt: new Date("2024-01-01T17:00:00Z"), type: "CHECK_OUT" })]
  });
  assert.equal(result.lunchMinutes, 60);
  assert.equal(result.effectiveMinutes, result.workedMinutes - 60);
});

test("Overtime permitido suma minutos, no permitido genera incidente", () => {
  const allowed = computeDayFromRaw({
    date,
    shift: { ...baseShift, overtimeAllowed: true },
    rawEvents: [ev({ occurredAt: new Date("2024-01-01T08:00:00Z") }), ev({ occurredAt: new Date("2024-01-01T18:00:00Z"), type: "CHECK_OUT" })]
  });
  assert(allowed.overtimeMinutes > 0);
  assert(!allowed.incidentTypes.includes("OVERTIME_UNAUTHORIZED"));

  const blocked = computeDayFromRaw({
    date,
    shift: baseShift,
    rawEvents: [ev({ occurredAt: new Date("2024-01-01T08:00:00Z") }), ev({ occurredAt: new Date("2024-01-01T18:00:00Z"), type: "CHECK_OUT" })]
  });
  assert(blocked.overtimeMinutes === 0);
  assert(blocked.incidentTypes.includes("OVERTIME_UNAUTHORIZED"));
});

test("selectShiftForDay prioriza asignación activa", () => {
  const shiftA: AttendanceShift = { ...baseShift, id: "A", siteId: "site-1", isDefaultForSite: false };
  const shiftB: AttendanceShift = { ...baseShift, id: "B", siteId: "site-1", isDefaultForSite: true };
  const assignments: (EmployeeSiteAssignment & { shift: AttendanceShift })[] = [
    {
      id: "asg1",
      employeeId: "emp1",
      siteId: "site-1",
      shiftId: "A",
      startDate: new Date("2024-01-01T00:00:00Z"),
      endDate: null,
      isPrimary: false,
      createdAt: new Date(),
      shift: shiftA
    }
  ];
  const selected = selectShiftForDay({ date, siteId: "site-1", employeeId: "emp1", assignments, shifts: [shiftA, shiftB] });
  assert.equal(selected?.id, "A");
});

test("selectShiftForDay usa default del site si no hay asignación", () => {
  const shiftDefault: AttendanceShift = { ...baseShift, id: "D", siteId: "site-1", isDefaultForSite: true };
  const selected = selectShiftForDay({ date, siteId: "site-1", employeeId: "emp1", assignments: [], shifts: [shiftDefault] });
  assert.equal(selected?.id, "D");
});
