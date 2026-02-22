import test from "node:test";
import assert from "node:assert/strict";
import { enqueueAttendanceEmails, isEmailConfigured } from "@/lib/hr/attendance/notifications";
import { ensureEncryptionKey } from "@/lib/ai/config";
import { prisma } from "@/lib/prisma";

test("isEmailConfigured returns false when env incompletos", () => {
  const prev = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM
  };

  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;

  assert.equal(isEmailConfigured(), false);

  process.env.SMTP_HOST = prev.host;
  process.env.SMTP_PORT = prev.port;
  process.env.SMTP_USER = prev.user;
  process.env.SMTP_PASS = prev.pass;
  process.env.SMTP_FROM = prev.from;
});

test("enqueueAttendanceEmails no env -> log FAILED y no lanza", async () => {
  const created: any[] = [];
  const updated: any[] = [];
  const settings = {
    id: 1,
    attendanceEmailEnabled: true,
    attendanceAdminRecipients: ["admin@test.gt"],
    defaultTimezone: "America/Guatemala",
    photoSafetyEnabled: false,
    openaiEnabled: false
  };
  const record = {
    id: "rec-1",
    employeeId: "emp-1",
    branchId: "branch-1",
    date: new Date(),
    checkInAt: new Date("2024-05-01T13:00:00Z"),
    checkOutAt: null,
    source: "KIOSK",
    notes: null,
    employee: { firstName: "Ana", lastName: "Lopez", email: "ana@test.gt" },
    branch: { name: "Central" }
  };

  const prevEnv = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM
  };
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;

  const original = {
    hrSettings: (prisma as any).hrSettings,
    attendanceRecord: (prisma as any).attendanceRecord,
    attendanceNotificationLog: (prisma as any).attendanceNotificationLog
  };

  (prisma as any).hrSettings = { findUnique: async () => settings };
  (prisma as any).attendanceRecord = { findUnique: async () => record };
  (prisma as any).attendanceNotificationLog = {
    create: async ({ data }: any) => {
      created.push(data);
      return { id: `log-${created.length}`, ...data };
    },
    update: async ({ data }: any) => {
      updated.push(data);
      return data;
    }
  };

  await enqueueAttendanceEmails("rec-1", "CHECK_IN");

  assert.equal(created.length, 2);
  created.forEach((entry) => {
    assert.equal(entry.status, "FAILED");
    assert.equal(entry.errorMessage, "SMTP_NOT_CONFIGURED");
  });
  assert.equal(updated.length, 0);

  process.env.SMTP_HOST = prevEnv.host;
  process.env.SMTP_PORT = prevEnv.port;
  process.env.SMTP_USER = prevEnv.user;
  process.env.SMTP_PASS = prevEnv.pass;
  process.env.SMTP_FROM = prevEnv.from;

  (prisma as any).hrSettings = original.hrSettings;
  (prisma as any).attendanceRecord = original.attendanceRecord;
  (prisma as any).attendanceNotificationLog = original.attendanceNotificationLog;
});

test("ensureEncryptionKey exige APP_ENCRYPTION_KEY", () => {
  const prev = process.env.APP_ENCRYPTION_KEY;
  delete process.env.APP_ENCRYPTION_KEY;
  assert.throws(() => ensureEncryptionKey(), { status: 400 });
  process.env.APP_ENCRYPTION_KEY = prev;
});
