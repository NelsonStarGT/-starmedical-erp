import test from "node:test";
import assert from "node:assert/strict";
import { AttendanceRawEventSource, AttendanceRawEventType } from "@prisma/client";
import { computeProcessedDayFromRaw, ingestRawAttendanceEvent, processAttendanceDayFromRaw } from "@/lib/hr/attendance/rawProcessing";

class FakeTx {
  employees = [{ id: "emp1" }];
  rawEvents: any[] = [];
  incidents: any[] = [];
  processed: any[] = [];

  hrEmployee = {
    findUnique: async ({ where }: any) => this.employees.find((e) => e.id === where.id) || null
  };

  attendanceRawEvent = {
    findMany: async ({ where }: any) =>
      this.rawEvents.filter((ev) => {
        const inRange = ev.occurredAt >= where.occurredAt.gte && ev.occurredAt < where.occurredAt.lt;
        const siteMatch = where.siteId ? ev.siteId === where.siteId : true;
        const employeeMatch = where.employeeId ? ev.employeeId === where.employeeId : true;
        return inRange && siteMatch && employeeMatch;
      }),
    create: async ({ data }: any) => {
      const created = { ...data, id: `raw-${this.rawEvents.length + 1}` };
      this.rawEvents.push(created);
      return created;
    }
  };

  attendanceIncident = {
    upsert: async ({ where, update, create }: any) => {
      const key = `${where.employeeId_date_type.employeeId}-${where.employeeId_date_type.date.getTime()}-${where.employeeId_date_type.type}`;
      const existing = this.incidents.find((i: any) => i.key === key);
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const created = { ...create, key };
      this.incidents.push(created);
      return created;
    }
  };

  attendanceProcessedDay = {
    upsert: async ({ where, update, create }: any) => {
      const existing = this.processed.find(
        (p: any) => p.employeeId === where.employeeId_date.employeeId && p.date.getTime() === where.employeeId_date.date.getTime()
      );
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const created = { ...create, id: `proc-${this.processed.length + 1}` };
      this.processed.push(created);
      return created;
    }
  };

  attendanceShift = {
    findMany: async () => []
  };

  employeeSiteAssignment = {
    findMany: async () => []
  };
}

test("Inserción de AttendanceRawEvent valida", async () => {
  const tx = new FakeTx();
  const { created, incidents } = await ingestRawAttendanceEvent({
    data: {
      employeeId: "emp1",
      siteId: "site-1",
      type: AttendanceRawEventType.CHECK_IN,
      source: AttendanceRawEventSource.SELFIE_WEB,
      occurredAt: new Date("2024-01-01T08:00:00Z")
    },
    tx: tx as any
  });

  assert.equal(created.id, "raw-1");
  assert.equal(tx.rawEvents.length, 1);
  assert.equal(incidents.length, 0);
});

test("Procesamiento simple genera AttendanceProcessedDay", async () => {
  const tx = new FakeTx();
  tx.rawEvents.push(
    { id: "raw-1", employeeId: "emp1", occurredAt: new Date("2024-01-02T08:00:00Z"), type: AttendanceRawEventType.CHECK_IN, siteId: "site-1" },
    { id: "raw-2", employeeId: "emp1", occurredAt: new Date("2024-01-02T17:00:00Z"), type: AttendanceRawEventType.CHECK_OUT, siteId: "site-1" }
  );

  const result = await processAttendanceDayFromRaw({ date: new Date("2024-01-02T00:00:00Z"), siteId: "site-1", tx: tx as any });

  assert.equal(tx.processed.length, 1);
  assert.equal(tx.processed[0].status, "OK");
  assert.equal(tx.processed[0].workedMinutes, 540);
  assert.equal(result[0].incidents.length, 0);
});

test("Incidente por marcajes impares", () => {
  const summary = computeProcessedDayFromRaw([
    { employeeId: "emp1", occurredAt: new Date("2024-01-03T08:00:00Z"), type: AttendanceRawEventType.CHECK_IN }
  ]);
  assert.equal(summary.status, "MISSING_PUNCH");
  assert(summary.incidents.includes("MISSING_PUNCH"));
});
