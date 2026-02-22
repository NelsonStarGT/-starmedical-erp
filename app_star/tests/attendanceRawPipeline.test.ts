import test from "node:test";
import assert from "node:assert/strict";
import { AttendanceRawEventStatus, AttendanceRawEventType, AttendanceRecordSource, Prisma } from "@prisma/client";
import { processRawEvents } from "@/lib/hr/attendance/rawPipeline";

class FakeTx {
  hrSettings = { findUnique: async () => ({ id: 1, defaultTimezone: "America/Guatemala" }) };
  attendanceRawEvent: any;
  attendanceRecord: any;
  hrEmployee: any;
  rawEvents: any[];
  records: Map<string, any>;

  constructor() {
    this.rawEvents = [];
    this.records = new Map<string, any>();
    this.attendanceRawEvent = {
      findMany: async () => this.rawEvents.filter((ev) => ev.status === AttendanceRawEventStatus.NEW),
      update: async ({ where, data }: any) => {
        const idx = this.rawEvents.findIndex((ev) => ev.id === where.id);
        if (idx >= 0) this.rawEvents[idx] = { ...this.rawEvents[idx], ...data };
        return this.rawEvents[idx];
      }
    };
    this.attendanceRecord = {
      findFirst: async ({ where }: any) => {
        const start = where.date?.gte;
        const end = where.date?.lt;
        const candidate = Array.from(this.records.values()).find((rec) => rec.employeeId === where.employeeId);
        if (!candidate) return null;
        if (start && end && candidate.date) {
          if (candidate.date.getTime() < start.getTime() || candidate.date.getTime() >= end.getTime()) return null;
        }
        return candidate;
      },
      findUnique: async ({ where }: any) => {
        const key = `${where.employeeId_date.employeeId}-${where.employeeId_date.date.getTime()}`;
        return this.records.get(key) || null;
      },
      upsert: async ({ where, update, create }: any) => {
        const key = `${where.employeeId_date.employeeId}-${where.employeeId_date.date.getTime()}`;
        const existing = this.records.get(key);
        if (existing) {
          const updated = { ...existing, ...update };
          this.records.set(key, updated);
          return updated;
        }
        const created = { ...create, id: `rec-${this.records.size + 1}` };
        this.records.set(key, created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const key = `${where.employeeId_date.employeeId}-${where.employeeId_date.date.getTime()}`;
        const existing = this.records.get(key);
        const updated = { ...existing, ...data };
        this.records.set(key, updated);
        return updated;
      }
    };
    this.hrEmployee = {
      findFirst: async ({ where }: any) => {
        const matches = this.employees.find((e: any) => e.biometricId === where.biometricId);
        return matches || null;
      },
      findUnique: async ({ where }: any) => this.employees.find((e: any) => e.id === where.id) || null
    };
  }

  employees = [
    { id: "emp-101", biometricId: "101", branchAssignments: [{ branchId: "branch-1", isPrimary: true }] },
    { id: "emp-102", biometricId: "102", branchAssignments: [] }
  ];

  $transaction = async (fn: any) => fn(this);
}

test("processRawEvents crea registro de entrada con biometricId resuelto", async () => {
  const tx = new FakeTx();
  tx.rawEvents.push({
    id: "raw-1",
    occurredAt: new Date("2024-04-08T14:00:00Z"),
    type: AttendanceRawEventType.CHECK_IN,
    source: "BIOMETRIC",
    biometricId: "101",
    employeeId: null,
    branchId: null,
    status: AttendanceRawEventStatus.NEW
  });

  const result = await processRawEvents({
    // Test double: implementa solo los métodos usados por processRawEvents.
    tx: tx as unknown as Prisma.TransactionClient
  });
  assert.equal(result.processed, 1);
  assert.equal(tx.rawEvents[0].status, AttendanceRawEventStatus.PROCESSED);
  const record = Array.from(tx.records.values())[0];
  assert.equal(record.employeeId, "emp-101");
  assert.equal(record.source, AttendanceRecordSource.KIOSK);
  assert.equal(record.branchId, "branch-1");
});

test("processRawEvents marca salida sin entrada como FAILED", async () => {
  const tx = new FakeTx();
  tx.rawEvents.push({
    id: "raw-2",
    occurredAt: new Date("2024-04-08T22:00:00Z"),
    type: AttendanceRawEventType.CHECK_OUT,
    source: "BIOMETRIC",
    biometricId: "102",
    employeeId: null,
    branchId: null,
    status: AttendanceRawEventStatus.NEW
  });

  const result = await processRawEvents({
    // Test double: implementa solo los métodos usados por processRawEvents.
    tx: tx as unknown as Prisma.TransactionClient
  });
  assert.equal(result.failed, 1);
  assert.equal(tx.rawEvents[0].status, AttendanceRawEventStatus.FAILED);
  assert.equal(tx.rawEvents[0].errorMessage, "OUT_WITHOUT_IN");
});

test("processRawEvents ignora entrada duplicada", async () => {
  const tx = new FakeTx();
  const day = new Date("2024-04-08T09:00:00Z");
  const tzDay = new Date(Date.UTC(2024, 3, 8, 6, 0, 0));
  tx.records.set(`emp-101-${tzDay.getTime()}`, {
    id: "rec-1",
    employeeId: "emp-101",
    date: tzDay,
    checkInAt: day,
    checkOutAt: null,
    branchId: "branch-1",
    source: AttendanceRecordSource.KIOSK
  });
  tx.rawEvents.push({
    id: "raw-3",
    occurredAt: new Date("2024-04-08T10:00:00Z"),
    type: AttendanceRawEventType.CHECK_IN,
    source: "BIOMETRIC",
    biometricId: "101",
    employeeId: "emp-101",
    branchId: null,
    status: AttendanceRawEventStatus.NEW
  });

  const result = await processRawEvents({
    // Test double: implementa solo los métodos usados por processRawEvents.
    tx: tx as unknown as Prisma.TransactionClient
  });
  const outcome = result.results.find((r) => r.id === "raw-3");
  assert.equal(outcome?.status, "IGNORED");
  assert.equal(tx.rawEvents[0].status, AttendanceRawEventStatus.IGNORED);
  assert.equal(tx.rawEvents[0].errorMessage, "DUPLICATE_IN");
});
