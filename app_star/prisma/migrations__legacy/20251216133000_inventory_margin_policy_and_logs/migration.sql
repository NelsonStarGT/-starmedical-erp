-- AlterEnum
ALTER TYPE "InventoryReportType" ADD VALUE IF NOT EXISTS 'CIERRE_SAT';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "marginPct" DOUBLE PRECISION;
ALTER TABLE "Service" ADD COLUMN     "marginPct" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "InventoryMarginPolicy" (
    "id" TEXT NOT NULL,
    "marginProductsPct" DOUBLE PRECISION,
    "marginServicesPct" DOUBLE PRECISION,
    "roundingMode" TEXT NOT NULL DEFAULT 'NONE',
    "autoApplyOnCreate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryMarginPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEmailScheduleLog" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "reportType" "InventoryReportType" NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "error" TEXT,
    CONSTRAINT "InventoryEmailScheduleLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventoryEmailScheduleLog" ADD CONSTRAINT "InventoryEmailScheduleLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "InventoryEmailSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
