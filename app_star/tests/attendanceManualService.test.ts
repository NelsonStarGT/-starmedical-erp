import test from "node:test";
import assert from "node:assert/strict";
import { AttendanceRecordSource } from "@prisma/client";
import { markCheckIn, markCheckOut, upsertManualAttendance } from "@/lib/hr/attendance/service";
import { prisma } from "@/lib/prisma";

type StubRecord = {
  id: string;
  employeeId: string;
  date: Date;
  branchId: string | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  source: AttendanceRecordSource;
  notes: string | null;
  createdByUserId?: string | null;
  employee: any;
  branch: any;
};

function setupPrisma(store: Map<string, StubRecord>) {
  const baseEmployee = {
    id: "emp-1",
    onboardingStatus: "ACTIVE",
    status: "ACTIVE",
    firstName: "Ana",
    lastName: "Lopez",
    email: "ana@test.gt",
    branchAssignments: [{ branchId: "branch-1" }]
  };

  const baseBranch = { id: "branch-1", name: "Sucursal Central" };
  const settings = {
    id: 1,
    defaultTimezone: "America/Guatemala",
    attendanceEmailEnabled: false,
    attendanceAdminRecipients: [],
    openaiEnabled: false,
    photoSafetyEnabled: false
  };

  const recordMethods = {
    findUnique: async ({ where }: any) => {
      if (where.id) return Array.from(store.values()).find((r) => r.id === where.id) || null;
      const key = `${where.employeeId_date.employeeId}-${where.employeeId_date.date.toISOString()}`;
      return store.get(key) || null;
    },
    upsert: async ({ where, update, create, include }: any) => {
      const key = `${where.employeeId_date.employeeId}-${where.employeeId_date.date.toISOString()}`;
      let existing = store.get(key);
      if (existing) {
        const updated: StubRecord = { ...existing, ...update };
        store.set(key, updated);
        existing = updated;
      } else {
        const created: StubRecord = {
          id: `rec-${store.size + 1}`,
          ...create,
          branch: baseBranch,
          employee: baseEmployee
        };
        store.set(key, created);
        existing = created;
      }
      return include ? { ...existing, employee: baseEmployee, branch: baseBranch } : existing;
    },
    update: async ({ where, data, include }: any) => {
      const key = `${where.employeeId_date.employeeId}-${where.employeeId_date.date.toISOString()}`;
      const existing = store.get(key);
      if (!existing) throw new Error("not found");
      const updated = { ...existing, ...data };
      store.set(key, updated);
      return include ? { ...updated, employee: baseEmployee, branch: baseBranch } : updated;
    }
  };

  const tx = {
    hrEmployee: { findUnique: async () => baseEmployee },
    attendanceRecord: recordMethods
  } as any;

  const originalHrSettings = (prisma as any).hrSettings;
  const originalHrEmployee = (prisma as any).hrEmployee;
  const originalAttendanceRecord = (prisma as any).attendanceRecord;
  const originalTx = prisma.$transaction;

  (prisma as any).hrSettings = { findUnique: async () => settings as any };
  (prisma as any).hrEmployee = { findUnique: async () => baseEmployee as any };
  (prisma as any).attendanceRecord = recordMethods;
  (prisma as any).$transaction = async (fn: any) => fn(tx);

  return () => {
    (prisma as any).hrSettings = originalHrSettings;
    (prisma as any).hrEmployee = originalHrEmployee;
    (prisma as any).attendanceRecord = originalAttendanceRecord;
    (prisma as any).$transaction = originalTx;
  };
}

test("markCheckIn enforces unique per día", async () => {
  const store = new Map<string, StubRecord>();
  const restore = setupPrisma(store);

  const first = await markCheckIn({ employeeId: "emp-1" });
  assert.ok(first.checkInAt, "debe registrar entrada");
  assert.ok(first.date, "debe guardar fecha");

  await assert.rejects(() => markCheckIn({ employeeId: "emp-1" }), (err: any) => err?.status === 409);

  restore();
});

test("markCheckOut falla si no hay entrada", async () => {
  const store = new Map<string, StubRecord>();
  const restore = setupPrisma(store);

  await assert.rejects(() => markCheckOut({ employeeId: "emp-1" }), (err: any) => err?.status === 409);
  restore();
});

test("markCheckOut usa el mismo registro de entrada", async () => {
  const store = new Map<string, StubRecord>();
  const restore = setupPrisma(store);

  const inRecord = await markCheckIn({ employeeId: "emp-1" });
  const outRecord = await markCheckOut({ employeeId: "emp-1" });

  assert.equal(inRecord.id, outRecord.id);
  assert.ok(outRecord.checkOutAt, "debe registrar salida");
  restore();
});

test("upsertManualAttendance bloquea salida sin entrada", async () => {
  const store = new Map<string, StubRecord>();
  const restore = setupPrisma(store);

  await assert.rejects(
    () => upsertManualAttendance({ employeeId: "emp-1", date: "2024-01-02", checkOut: "18:00" }),
    (err: any) => err?.status === 409
  );
  restore();
});

test("markCheckIn usa fecha local en America/Guatemala", async () => {
  const store = new Map<string, StubRecord>();
  const restore = setupPrisma(store);

  const lateNightUtc = new Date("2024-05-01T05:30:00Z"); // 23:30 en Guatemala (UTC-6)
  const record = await markCheckIn({ employeeId: "emp-1", now: lateNightUtc });

  assert.equal(record.date, "2024-04-30T06:00:00.000Z");
  restore();
});
