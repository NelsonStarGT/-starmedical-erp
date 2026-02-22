import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPortalAvailability,
  parsePortalAvailabilityDate,
  resolvePortalAvailabilityStatus,
  selectVigenteBranchBusinessHours
} from "@/lib/portal/appointmentsAvailability";

test("parsePortalAvailabilityDate acepta YYYY-MM-DD y rechaza inválidos", () => {
  const valid = parsePortalAvailabilityDate("2026-02-10");
  assert.ok(valid instanceof Date);
  assert.equal(valid?.toISOString().startsWith("2026-02-10"), true);
  assert.equal(parsePortalAvailabilityDate("10-02-2026"), null);
  assert.equal(parsePortalAvailabilityDate(""), null);
});

test("resolvePortalAvailabilityStatus clasifica GREEN/YELLOW/RED", () => {
  assert.equal(resolvePortalAvailabilityStatus(0.9), "GREEN");
  assert.equal(resolvePortalAvailabilityStatus(0.4), "YELLOW");
  assert.equal(resolvePortalAvailabilityStatus(0.1), "RED");
});

test("buildPortalAvailability calcula semáforo diario por ocupación", () => {
  const date = parsePortalAvailabilityDate("2026-02-10");
  if (!date) {
    throw new Error("Date parse failed for test setup.");
  }
  const slotAt = (hour: number) => {
    const next = new Date(date);
    next.setHours(hour, 0, 0, 0);
    return next;
  };

  const green = buildPortalAvailability({
    date,
    slotMinutes: 60,
    startHour: 8,
    endHour: 13,
    occupiedAppointments: []
  });
  assert.equal(green.daySummary.totalSlots, 5);
  assert.equal(green.daySummary.status, "GREEN");

  const yellow = buildPortalAvailability({
    date,
    slotMinutes: 60,
    startHour: 8,
    endHour: 13,
    occupiedAppointments: [
      { start: slotAt(8), durationMin: 60 },
      { start: slotAt(9), durationMin: 60 },
      { start: slotAt(10), durationMin: 60 }
    ]
  });
  assert.equal(yellow.daySummary.remainingSlots, 2);
  assert.equal(yellow.daySummary.status, "YELLOW");

  const red = buildPortalAvailability({
    date,
    slotMinutes: 60,
    startHour: 8,
    endHour: 13,
    occupiedAppointments: [
      { start: slotAt(8), durationMin: 60 },
      { start: slotAt(9), durationMin: 60 },
      { start: slotAt(10), durationMin: 60 },
      { start: slotAt(11), durationMin: 60 },
      { start: slotAt(12), durationMin: 60 }
    ]
  });
  assert.equal(red.daySummary.remainingSlots, 0);
  assert.equal(red.daySummary.status, "RED");
  assert.equal(red.slots.every((slot) => slot.status === "RED"), true);
});

test("selectVigenteBranchBusinessHours retorna null cuando no existe horario vigente", () => {
  const date = parsePortalAvailabilityDate("2026-02-10");
  if (!date) {
    throw new Error("Date parse failed for test setup.");
  }
  const vigente = selectVigenteBranchBusinessHours([], date);
  assert.equal(vigente, null);
});

test("buildPortalAvailability soporta horario dividido (08:00-12:00,13:00-17:00)", () => {
  const date = parsePortalAvailabilityDate("2026-02-10");
  if (!date) {
    throw new Error("Date parse failed for test setup.");
  }

  const availability = buildPortalAvailability({
    date,
    slotMinutes: 60,
    startHour: 8,
    endHour: 17,
    timeRanges: [
      { startHour: 8, endHour: 12 },
      { startHour: 13, endHour: 17 }
    ],
    occupiedAppointments: []
  });

  assert.equal(availability.daySummary.totalSlots, 8);
  assert.equal(availability.rules.startHour, 8);
  assert.equal(availability.rules.endHour, 17);
});

test("selectVigenteBranchBusinessHours elige la vigencia más reciente cuando hay múltiples", () => {
  const date = parsePortalAvailabilityDate("2026-02-10");
  if (!date) {
    throw new Error("Date parse failed for test setup.");
  }

  const oldFrom = new Date("2026-01-01T00:00:00.000Z");
  const recentFrom = new Date("2026-02-01T00:00:00.000Z");
  const obsoleteTo = new Date("2026-01-31T23:59:59.999Z");

  const rows = [
    {
      validFrom: oldFrom,
      validTo: obsoleteTo,
      scheduleJson: { mon: ["07:00-11:00"] },
      slotMinutesDefault: 45,
      isActive: true
    },
    {
      validFrom: recentFrom,
      validTo: null,
      scheduleJson: { mon: ["08:00-16:00"] },
      slotMinutesDefault: 30,
      isActive: true
    }
  ];

  const vigente = selectVigenteBranchBusinessHours(rows, date);
  assert.ok(vigente);
  assert.equal(vigente?.validFrom.toISOString(), recentFrom.toISOString());
  assert.equal(vigente?.slotMinutesDefault, 30);
});
