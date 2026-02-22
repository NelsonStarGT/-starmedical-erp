-- AlterTable
ALTER TABLE "AttendanceShift" ADD COLUMN     "isDefaultForSite" BOOLEAN NOT NULL DEFAULT false;

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

-- CreateIndex
CREATE INDEX "EmployeeSiteAssignment_employeeId_siteId_startDate_idx" ON "EmployeeSiteAssignment"("employeeId", "siteId", "startDate");

-- CreateIndex
CREATE INDEX "EmployeeSiteAssignment_siteId_shiftId_idx" ON "EmployeeSiteAssignment"("siteId", "shiftId");

-- AddForeignKey
ALTER TABLE "EmployeeSiteAssignment" ADD CONSTRAINT "EmployeeSiteAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSiteAssignment" ADD CONSTRAINT "EmployeeSiteAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "AttendanceShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
