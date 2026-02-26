import assert from "node:assert/strict";
import test from "node:test";
import { formatDate } from "@/lib/datetime/format";
import { maskDateInput, parseDate, toIsoDateString } from "@/lib/datetime/parse";
import { buildDateRangeForDay, buildRange } from "@/lib/datetime/range";
import { validateBirthDateRange } from "@/lib/datetime/rules";

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second")
  };
}

test("parseDate DMY 01/06/1998 => 1998-06-01", () => {
  const parsed = parseDate("01/06/1998", "DMY");
  assert.ok(parsed);
  assert.equal(toIsoDateString(parsed), "1998-06-01");
});

test("parseDate MDY 06/01/1998 => 1998-06-01", () => {
  const parsed = parseDate("06/01/1998", "MDY");
  assert.ok(parsed);
  assert.equal(toIsoDateString(parsed), "1998-06-01");
});

test("parseDate YMD 1998-06-01 => 1998-06-01", () => {
  const parsed = parseDate("1998-06-01", "YMD");
  assert.ok(parsed);
  assert.equal(toIsoDateString(parsed), "1998-06-01");
});

test("maskDateInput respeta formato configurado", () => {
  assert.equal(maskDateInput("01061998", "DMY"), "01/06/1998");
  assert.equal(maskDateInput("06011998", "MDY"), "06/01/1998");
  assert.equal(maskDateInput("19980601", "YMD"), "1998-06-01");
});

test("formatDate respeta formato configurado", () => {
  const date = new Date(1998, 5, 1);
  assert.equal(formatDate(date, "DMY"), "01/06/1998");
  assert.equal(formatDate(date, "MDY"), "06/01/1998");
  assert.equal(formatDate(date, "YMD"), "1998-06-01");
});

test("buildDateRangeForDay construye inicio/fin de día en timezone tenant", () => {
  const range = buildDateRangeForDay({ day: "2026-02-25", timeZone: "America/Guatemala" });
  assert.ok(range);

  const fromParts = zonedParts(range.from, "America/Guatemala");
  const toParts = zonedParts(range.to, "America/Guatemala");

  assert.equal(`${fromParts.year}-${fromParts.month}-${fromParts.day}`, "2026-02-25");
  assert.equal(`${toParts.year}-${toParts.month}-${toParts.day}`, "2026-02-25");
  assert.equal(`${fromParts.hour}:${fromParts.minute}:${fromParts.second}`, "00:00:00");
  assert.equal(`${toParts.hour}:${toParts.minute}:${toParts.second}`, "23:59:59");
});

test("buildRange normaliza from/to y cubre día completo", () => {
  const range = buildRange({ from: "2026-02-01", to: "2026-02-03", timeZone: "America/Guatemala" });
  assert.ok(range.from);
  assert.ok(range.to);

  const fromParts = zonedParts(range.from!, "America/Guatemala");
  const toParts = zonedParts(range.to!, "America/Guatemala");

  assert.equal(`${fromParts.year}-${fromParts.month}-${fromParts.day}`, "2026-02-01");
  assert.equal(`${toParts.year}-${toParts.month}-${toParts.day}`, "2026-02-03");
  assert.equal(`${fromParts.hour}:${fromParts.minute}`, "00:00");
  assert.equal(`${toParts.hour}:${toParts.minute}`, "23:59");
});

test("validateBirthDateRange aplica no futuro y rango 120 años", () => {
  const now = new Date("2026-02-25T12:00:00Z");
  const ok = validateBirthDateRange(new Date("1998-06-01T00:00:00Z"), { now, maxYearsBack: 120 });
  assert.equal(ok, null);

  const future = validateBirthDateRange(new Date("2030-01-01T00:00:00Z"), { now, maxYearsBack: 120 });
  assert.equal(future, "La fecha no puede ser futura.");

  const tooOld = validateBirthDateRange(new Date("1800-01-01T00:00:00Z"), { now, maxYearsBack: 120 });
  assert.equal(tooOld, "La fecha no puede ser anterior a 120 años.");
});
