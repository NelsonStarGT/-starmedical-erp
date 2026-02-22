-- AlterEnum
ALTER TYPE "InventoryReportType" ADD VALUE IF NOT EXISTS 'CIERRE_SAT';

-- CreateTable
CREATE TABLE "InventoryEmailSchedule" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reportType" "InventoryReportType" NOT NULL DEFAULT 'KARDEX',
    "branchId" TEXT,
    "scheduleType" TEXT NOT NULL DEFAULT 'ONE_TIME',
    "sendTime" TEXT NOT NULL DEFAULT '23:30',
    "timezone" TEXT NOT NULL DEFAULT 'America/Guatemala',
    "oneTimeDate" TIMESTAMP(3),
    "monthlyDay" INTEGER,
    "useLastDay" BOOLEAN DEFAULT true,
    "biweeklyMode" TEXT DEFAULT 'FIXED_DAYS',
    "fixedDays" TEXT,
    "startDate" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryEmailSchedule_pkey" PRIMARY KEY ("id")
);
