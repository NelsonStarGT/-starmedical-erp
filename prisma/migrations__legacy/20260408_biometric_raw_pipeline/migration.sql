-- Add new enum for raw event status
CREATE TYPE "AttendanceRawEventStatus" AS ENUM ('NEW', 'PROCESSED', 'IGNORED', 'FAILED');

-- Extend sources to cover kiosk/api flows
ALTER TYPE "AttendanceRawEventSource" ADD VALUE IF NOT EXISTS 'KIOSK';
ALTER TYPE "AttendanceRawEventSource" ADD VALUE IF NOT EXISTS 'API';

-- HrEmployee: biometric id (nullable unique)
ALTER TABLE "HrEmployee" ADD COLUMN "biometricId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "HrEmployee_biometricId_key" ON "HrEmployee"("biometricId");

-- AttendanceRawEvent: branch + biometric + status/payload + allow null employee
ALTER TABLE "AttendanceRawEvent"
    ADD COLUMN "branchId" TEXT,
    ADD COLUMN "biometricId" TEXT,
    ADD COLUMN "status" "AttendanceRawEventStatus" NOT NULL DEFAULT 'NEW',
    ADD COLUMN "errorMessage" TEXT,
    ADD COLUMN "payloadJson" JSONB,
    ALTER COLUMN "employeeId" DROP NOT NULL;

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS "AttendanceRawEvent_branchId_idx" ON "AttendanceRawEvent"("branchId");
CREATE INDEX IF NOT EXISTS "AttendanceRawEvent_biometricId_occurredAt_idx" ON "AttendanceRawEvent"("biometricId", "occurredAt");
CREATE INDEX IF NOT EXISTS "AttendanceRawEvent_status_idx" ON "AttendanceRawEvent"("status");

-- FK branch (optional)
ALTER TABLE "AttendanceRawEvent" ADD CONSTRAINT "AttendanceRawEvent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
