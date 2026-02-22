import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";

function buildWherePending(opts: { excludeTerminated: boolean; isStaff: boolean; userId?: string }) {
  const { excludeTerminated, isStaff, userId } = opts;
  const where: Prisma.HrEmployeeWhereInput = {
    onboardingStatus: { not: "ACTIVE" },
    ...(excludeTerminated ? { status: { not: "TERMINATED" } } : {}),
    ...(isStaff ? { userId } : {})
  };
  return where;
}

function buildWhereActive(opts: { isStaff: boolean; userId?: string }) {
  const { isStaff, userId } = opts;
  const where: Prisma.HrEmployeeWhereInput = {
    status: "ACTIVE",
    onboardingStatus: "ACTIVE",
    ...(isStaff ? { userId } : {})
  };
  return where;
}

test("pending excluye terminados cuando flag true", () => {
  const where = buildWherePending({ excludeTerminated: true, isStaff: false });
  assert.deepEqual(where.status, { not: "TERMINATED" });
});

test("pending agrega userId para staff", () => {
  const where = buildWherePending({ excludeTerminated: true, isStaff: true, userId: "u1" });
  assert.equal(where.userId, "u1");
});

test("activos reales requieren status ACTIVE + onboardingStatus ACTIVE", () => {
  const where = buildWhereActive({ isStaff: false });
  assert.equal(where.status, "ACTIVE");
  assert.equal(where.onboardingStatus, "ACTIVE");
});

test("activos reales para staff incluyen userId", () => {
  const where = buildWhereActive({ isStaff: true, userId: "u1" });
  assert.equal(where.userId, "u1");
});
