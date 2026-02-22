-- CreateEnum
CREATE TYPE "AttendanceRecordSource" AS ENUM ('MANUAL', 'KIOSK', 'IMPORT', 'AI');

-- CreateEnum
CREATE TYPE "AttendanceNotificationType" AS ENUM ('EMPLOYEE_CONFIRMATION', 'ADMIN_ALERT');

-- CreateEnum
CREATE TYPE "AttendanceNotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "AttendanceNotificationProvider" AS ENUM ('SMTP', 'RESEND', 'OTHER');

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

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceNotificationLog" ADD CONSTRAINT "AttendanceNotificationLog_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

