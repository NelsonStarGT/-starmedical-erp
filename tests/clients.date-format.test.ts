import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDateForClients,
  maskClientsDateInput,
  parseClientsDateInput,
  toIsoDateString
} from "@/lib/clients/dateFormat";

test("parse DMY 01/06/1998 => 1998-06-01", () => {
  const parsed = parseClientsDateInput("01/06/1998", "DMY");
  assert.ok(parsed);
  assert.equal(toIsoDateString(parsed), "1998-06-01");
});

test("parse MDY 06/01/1998 => 1998-06-01", () => {
  const parsed = parseClientsDateInput("06/01/1998", "MDY");
  assert.ok(parsed);
  assert.equal(toIsoDateString(parsed), "1998-06-01");
});

test("parse YMD 1998-06-01 => 1998-06-01", () => {
  const parsed = parseClientsDateInput("1998-06-01", "YMD");
  assert.ok(parsed);
  assert.equal(toIsoDateString(parsed), "1998-06-01");
});

test("mask aplica formato configurado por tenant", () => {
  assert.equal(maskClientsDateInput("01061998", "DMY"), "01/06/1998");
  assert.equal(maskClientsDateInput("06011998", "MDY"), "06/01/1998");
  assert.equal(maskClientsDateInput("19980601", "YMD"), "1998-06-01");
});

test("formatDateForClients respeta el formato configurado", () => {
  const date = new Date(1998, 5, 1);
  assert.equal(formatDateForClients(date, "DMY"), "01/06/1998");
  assert.equal(formatDateForClients(date, "MDY"), "06/01/1998");
  assert.equal(formatDateForClients(date, "YMD"), "1998-06-01");
});
