-- Drift-fix aligning Supabase schema to prisma/schema.prisma as of 2026-01-20.

-- CreateEnum
CREATE TYPE "AttendanceProcessedStatus" AS ENUM ('OK', 'MISSING_PUNCH', 'OUT_OF_ZONE', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "AttendanceRawEventType" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'BREAK_OUT', 'BREAK_IN');

-- CreateEnum
CREATE TYPE "AttendanceRawEventSource" AS ENUM ('SELFIE_WEB', 'BIOMETRIC', 'MANUAL_IMPORT', 'KIOSK', 'API');

-- CreateEnum
CREATE TYPE "AttendanceRawEventStatus" AS ENUM ('NEW', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "AttendanceRecordSource" AS ENUM ('MANUAL', 'KIOSK', 'IMPORT', 'AI');

-- CreateEnum
CREATE TYPE "AttendanceNotificationType" AS ENUM ('EMPLOYEE_CONFIRMATION', 'ADMIN_ALERT');

-- CreateEnum
CREATE TYPE "AttendanceNotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "AttendanceNotificationProvider" AS ENUM ('SMTP', 'RESEND', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceZoneStatus" AS ENUM ('IN_ZONE', 'OUT_OF_ZONE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AttendanceFaceStatus" AS ENUM ('VERIFIED', 'MISMATCH', 'NO_REFERENCE', 'LOW_CONFIDENCE');

-- CreateEnum
CREATE TYPE "AttendanceIncidentType" AS ENUM ('MISSING_PUNCH', 'OUT_OF_ZONE', 'FACE_MISMATCH', 'SEQUENCE_ERROR', 'MANUAL_REVIEW', 'LATE', 'OVERTIME_UNAUTHORIZED');

-- CreateEnum
CREATE TYPE "AttendanceIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AttendanceLivenessLevel" AS ENUM ('OFF', 'BASIC', 'PROVIDER');

-- AlterTable
ALTER TABLE "HrEmployee" ADD COLUMN     "biometricId" TEXT;

-- AlterTable
ALTER TABLE "HrSettings" ADD COLUMN     "attendanceAdminRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "attendanceEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "attendanceLateToleranceMinutes" INTEGER DEFAULT 10,
ADD COLUMN     "attendanceStartTime" TEXT DEFAULT '08:00',
ADD COLUMN     "defaultTimezone" TEXT DEFAULT 'America/Guatemala',
ADD COLUMN     "openaiApiKeyEnc" TEXT,
ADD COLUMN     "openaiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photoSafetyEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AttendanceProcessedDay" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT,
    "customerId" TEXT,
    "firstIn" TIMESTAMP(3),
    "lastOut" TIMESTAMP(3),
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "lunchMinutes" INTEGER NOT NULL DEFAULT 0,
    "effectiveMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "AttendanceProcessedStatus" NOT NULL,
    "needsApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shiftId" TEXT,

    CONSTRAINT "AttendanceProcessedDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRawEvent" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "branchId" TEXT,
    "siteId" TEXT,
    "customerId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "deviceTime" TIMESTAMP(3),
    "type" "AttendanceRawEventType" NOT NULL,
    "source" "AttendanceRawEventSource" NOT NULL,
    "biometricId" TEXT,
    "status" "AttendanceRawEventStatus" NOT NULL DEFAULT 'NEW',
    "errorMessage" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "zoneStatus" "AttendanceZoneStatus",
    "photoUrl" TEXT,
    "photoHash" TEXT,
    "faceStatus" "AttendanceFaceStatus",
    "faceScore" DOUBLE PRECISION,
    "rawPayload" JSONB,
    "payloadJson" JSONB,
    "importBatchId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRawEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceIncident" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "AttendanceIncidentType" NOT NULL,
    "severity" "AttendanceIncidentSeverity" NOT NULL,
    "siteId" TEXT,
    "customerId" TEXT,
    "rawEventId" TEXT,
    "processedDayId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSiteConfig" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "customerId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 100,
    "allowOutOfZone" BOOLEAN NOT NULL DEFAULT false,
    "requirePhoto" BOOLEAN NOT NULL DEFAULT false,
    "requireLiveness" "AttendanceLivenessLevel" NOT NULL DEFAULT 'OFF',
    "windowBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "windowAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "antiPassback" BOOLEAN NOT NULL DEFAULT false,
    "allowedSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceShift" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "toleranceMinutes" INTEGER NOT NULL,
    "lunchMinutes" INTEGER,
    "lunchPaid" BOOLEAN NOT NULL DEFAULT false,
    "overtimeAllowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefaultForSite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AttendanceShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSiteAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeSiteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePunchToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "employeeId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePunchToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "source" "AttendanceRecordSource" NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceNotificationLog" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "type" "AttendanceNotificationType" NOT NULL,
    "status" "AttendanceNotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" "AttendanceNotificationProvider" NOT NULL DEFAULT 'SMTP',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "AttendanceNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "triggerType" TEXT NOT NULL,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceProcessedDay_date_idx" ON "AttendanceProcessedDay"("date");

-- CreateIndex
CREATE INDEX "AttendanceProcessedDay_siteId_idx" ON "AttendanceProcessedDay"("siteId");

-- CreateIndex
CREATE INDEX "AttendanceProcessedDay_customerId_idx" ON "AttendanceProcessedDay"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceProcessedDay_employeeId_date_key" ON "AttendanceProcessedDay"("employeeId", "date");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_employeeId_occurredAt_idx" ON "AttendanceRawEvent"("employeeId", "occurredAt");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_branchId_idx" ON "AttendanceRawEvent"("branchId");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_siteId_idx" ON "AttendanceRawEvent"("siteId");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_customerId_idx" ON "AttendanceRawEvent"("customerId");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_biometricId_occurredAt_idx" ON "AttendanceRawEvent"("biometricId", "occurredAt");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_status_idx" ON "AttendanceRawEvent"("status");

-- CreateIndex
CREATE INDEX "AttendanceIncident_date_idx" ON "AttendanceIncident"("date");

-- CreateIndex
CREATE INDEX "AttendanceIncident_siteId_idx" ON "AttendanceIncident"("siteId");

-- CreateIndex
CREATE INDEX "AttendanceIncident_resolved_idx" ON "AttendanceIncident"("resolved");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceIncident_employeeId_date_type_key" ON "AttendanceIncident"("employeeId", "date", "type");

-- CreateIndex
CREATE INDEX "AttendanceSiteConfig_customerId_idx" ON "AttendanceSiteConfig"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSiteConfig_siteId_key" ON "AttendanceSiteConfig"("siteId");

-- CreateIndex
CREATE INDEX "AttendanceShift_siteId_idx" ON "AttendanceShift"("siteId");

-- CreateIndex
CREATE INDEX "EmployeeSiteAssignment_employeeId_siteId_startDate_idx" ON "EmployeeSiteAssignment"("employeeId", "siteId", "startDate");

-- CreateIndex
CREATE INDEX "EmployeeSiteAssignment_siteId_shiftId_idx" ON "EmployeeSiteAssignment"("siteId", "shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePunchToken_token_key" ON "AttendancePunchToken"("token");

-- CreateIndex
CREATE INDEX "AttendancePunchToken_siteId_idx" ON "AttendancePunchToken"("siteId");

-- CreateIndex
CREATE INDEX "AttendancePunchToken_employeeId_idx" ON "AttendancePunchToken"("employeeId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_branchId_idx" ON "AttendanceRecord"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_employeeId_date_key" ON "AttendanceRecord"("employeeId", "date");

-- CreateIndex
CREATE INDEX "AttendanceNotificationLog_attendanceRecordId_idx" ON "AttendanceNotificationLog"("attendanceRecordId");

-- CreateIndex
CREATE INDEX "AttendanceNotificationLog_status_idx" ON "AttendanceNotificationLog"("status");

-- CreateIndex
CREATE INDEX "Automation_moduleKey_idx" ON "Automation"("moduleKey");

-- CreateIndex
CREATE INDEX "Automation_isEnabled_idx" ON "Automation"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "HrEmployee_biometricId_key" ON "HrEmployee"("biometricId");

-- AddForeignKey
ALTER TABLE "AttendanceProcessedDay" ADD CONSTRAINT "AttendanceProcessedDay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceProcessedDay" ADD CONSTRAINT "AttendanceProcessedDay_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "AttendanceShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRawEvent" ADD CONSTRAINT "AttendanceRawEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRawEvent" ADD CONSTRAINT "AttendanceRawEvent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRawEvent" ADD CONSTRAINT "AttendanceRawEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceIncident" ADD CONSTRAINT "AttendanceIncident_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceIncident" ADD CONSTRAINT "AttendanceIncident_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceIncident" ADD CONSTRAINT "AttendanceIncident_rawEventId_fkey" FOREIGN KEY ("rawEventId") REFERENCES "AttendanceRawEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceIncident" ADD CONSTRAINT "AttendanceIncident_processedDayId_fkey" FOREIGN KEY ("processedDayId") REFERENCES "AttendanceProcessedDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSiteAssignment" ADD CONSTRAINT "EmployeeSiteAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSiteAssignment" ADD CONSTRAINT "EmployeeSiteAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "AttendanceShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePunchToken" ADD CONSTRAINT "AttendancePunchToken_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePunchToken" ADD CONSTRAINT "AttendancePunchToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceNotificationLog" ADD CONSTRAINT "AttendanceNotificationLog_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
