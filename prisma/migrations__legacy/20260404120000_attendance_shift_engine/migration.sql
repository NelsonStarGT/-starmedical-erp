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

    CONSTRAINT "AttendanceShift_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AttendanceProcessedDay" ADD COLUMN     "effectiveMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lateMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lunchMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shiftId" TEXT;

-- CreateIndex
CREATE INDEX "AttendanceShift_siteId_idx" ON "AttendanceShift"("siteId");

-- AddForeignKey
ALTER TABLE "AttendanceProcessedDay" ADD CONSTRAINT "AttendanceProcessedDay_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "AttendanceShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
