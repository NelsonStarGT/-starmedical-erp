import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTimeOptions,
  normalizeDayRanges,
  parseRange,
  toRange,
  validateDayRanges
} from "@/components/configuracion/BranchDayTimeRangesEditor";

test("buildTimeOptions genera opciones de 15 minutos para 24h", () => {
  const options = buildTimeOptions(15);
  assert.equal(options.length, 96);
  assert.equal(options[0], "00:00");
  assert.equal(options[1], "00:15");
  assert.equal(options[95], "23:45");
});

test("parseRange y toRange normalizan a HH:MM-HH:MM", () => {
  const parsed = parseRange("8:00-17:00");
  assert.deepEqual(parsed, { start: "08:00", end: "17:00" });
  assert.equal(toRange(parsed!), "08:00-17:00");
});

test("normalizeDayRanges ordena por hora de inicio", () => {
  const normalized = normalizeDayRanges(["13:00-17:00", "08:00-12:00"]);
  assert.deepEqual(normalized, ["08:00-12:00", "13:00-17:00"]);
});

test("validateDayRanges rechaza end <= start", () => {
  const validation = validateDayRanges(["12:00-08:00"]);
  assert.equal(validation.hasErrors, true);
  assert.match(validation.rangeErrors[0] ?? "", /cierre/i);
});

test("validateDayRanges detecta solapes del mismo día", () => {
  const validation = validateDayRanges(["08:00-12:00", "11:00-14:00"]);
  assert.equal(validation.hasErrors, true);
  assert.equal(validation.dayErrors.length, 1);
  assert.match(validation.dayErrors[0] ?? "", /superpone/i);
});

test("validateDayRanges acepta dos rangos válidos sin solape", () => {
  const validation = validateDayRanges(["08:00-12:00", "13:00-17:00"]);
  assert.equal(validation.hasErrors, false);
  assert.deepEqual(validation.rangeErrors, {});
});
