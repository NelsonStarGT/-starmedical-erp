import assert from "node:assert/strict";
import test from "node:test";
import { findOverlappingScheduleRanges, scheduleHasAnyRange } from "@/lib/config-central/hours";
import type { BranchSchedule } from "@/lib/config-central/schemas";

function emptySchedule(): BranchSchedule {
  return {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: []
  };
}

test("scheduleHasAnyRange rechaza horarios vacíos", () => {
  const schedule = emptySchedule();
  assert.equal(scheduleHasAnyRange(schedule), false);
});

test("findOverlappingScheduleRanges acepta horario dividido sin solapes", () => {
  const schedule: BranchSchedule = {
    ...emptySchedule(),
    mon: ["08:00-12:00", "13:00-17:00"],
    sat: ["08:00-12:00"]
  };
  const issues = findOverlappingScheduleRanges(schedule);
  assert.equal(issues.length, 0);
  assert.equal(scheduleHasAnyRange(schedule), true);
});

test("findOverlappingScheduleRanges detecta solapes en el mismo día", () => {
  const schedule: BranchSchedule = {
    ...emptySchedule(),
    tue: ["08:00-12:00", "11:30-14:00"]
  };
  const issues = findOverlappingScheduleRanges(schedule);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.day, "tue");
  assert.equal(issues[0]?.left, "08:00-12:00");
  assert.equal(issues[0]?.right, "11:30-14:00");
});
