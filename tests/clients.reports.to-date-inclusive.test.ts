import test from "node:test";
import assert from "node:assert/strict";
import { buildWhere, normalizeReportRange } from "@/lib/clients/reports.service";

test("filtro to es inclusivo hasta fin de día", () => {
  const { from, to } = normalizeReportRange({
    tenantId: "tenant-a",
    from: new Date("2026-02-10T13:25:00.000Z"),
    to: new Date("2026-02-27T00:00:00.000Z")
  });

  assert.equal(from.getHours(), 0);
  assert.equal(from.getMinutes(), 0);
  assert.equal(from.getSeconds(), 0);
  assert.equal(from.getMilliseconds(), 0);

  assert.equal(to.getHours(), 23);
  assert.equal(to.getMinutes(), 59);
  assert.equal(to.getSeconds(), 59);
  assert.equal(to.getMilliseconds(), 999);
});

test("buildWhere usa to inclusivo en createdAt.lte", () => {
  const where = buildWhere({
    tenantId: "tenant-a",
    to: new Date("2026-02-27T00:00:00.000Z")
  }) as { createdAt?: { lte?: Date } };

  assert.equal(where.createdAt?.lte instanceof Date, true);
  assert.equal(where.createdAt?.lte?.getHours(), 23);
  assert.equal(where.createdAt?.lte?.getMilliseconds(), 999);
});

test("normalizeReportRange sin fechas usa ventana default de 30 días", () => {
  const { from, to } = normalizeReportRange({
    tenantId: "tenant-a"
  });

  const diffMs = to.getTime() - from.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  assert.equal(days, 30);
});
