-- CreateEnum
CREATE TYPE "AttendanceProcessedStatus" AS ENUM ('OK', 'MISSING_PUNCH', 'OUT_OF_ZONE', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "AttendanceRawEventType" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'BREAK_OUT', 'BREAK_IN');

-- CreateEnum
CREATE TYPE "AttendanceRawEventSource" AS ENUM ('SELFIE_WEB', 'BIOMETRIC', 'MANUAL_IMPORT');

-- CreateEnum
CREATE TYPE "AttendanceZoneStatus" AS ENUM ('IN_ZONE', 'OUT_OF_ZONE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AttendanceFaceStatus" AS ENUM ('VERIFIED', 'MISMATCH', 'NO_REFERENCE', 'LOW_CONFIDENCE');

-- CreateEnum
CREATE TYPE "AttendanceIncidentType" AS ENUM ('MISSING_PUNCH', 'OUT_OF_ZONE', 'FACE_MISMATCH', 'SEQUENCE_ERROR', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "AttendanceIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

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
    "status" "AttendanceProcessedStatus" NOT NULL,
    "needsApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceProcessedDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRawEvent" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "siteId" TEXT,
    "customerId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "deviceTime" TIMESTAMP(3),
    "type" "AttendanceRawEventType" NOT NULL,
    "source" "AttendanceRawEventSource" NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "zoneStatus" "AttendanceZoneStatus",
    "photoUrl" TEXT,
    "photoHash" TEXT,
    "faceStatus" "AttendanceFaceStatus",
    "faceScore" DOUBLE PRECISION,
    "rawPayload" JSONB,
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
CREATE INDEX "AttendanceRawEvent_siteId_idx" ON "AttendanceRawEvent"("siteId");

-- CreateIndex
CREATE INDEX "AttendanceRawEvent_customerId_idx" ON "AttendanceRawEvent"("customerId");

-- CreateIndex
CREATE INDEX "AttendanceIncident_date_idx" ON "AttendanceIncident"("date");

-- CreateIndex
CREATE INDEX "AttendanceIncident_siteId_idx" ON "AttendanceIncident"("siteId");

-- CreateIndex
CREATE INDEX "AttendanceIncident_resolved_idx" ON "AttendanceIncident"("resolved");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceIncident_employeeId_date_type_key" ON "AttendanceIncident"("employeeId", "date", "type");

-- AddForeignKey
ALTER TABLE "AttendanceProcessedDay" ADD CONSTRAINT "AttendanceProcessedDay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRawEvent" ADD CONSTRAINT "AttendanceRawEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
