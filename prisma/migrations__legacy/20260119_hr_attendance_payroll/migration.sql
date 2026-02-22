-- CreateEnum
CREATE TYPE "DisciplinaryActionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "DisciplinaryActionType" ADD VALUE 'TERMINACION_RECOMENDADA';

-- AlterEnum
ALTER TYPE "HrEmployeeDocumentType" ADD VALUE 'CV';

-- DropIndex
DROP INDEX "Role_legalEntityId_idx";

-- AlterTable
ALTER TABLE "AttendanceDay" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DisciplinaryAction" ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "comments" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "status" "DisciplinaryActionStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "title" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EmployeeShiftAssignment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HrSettings" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "warningThreshold" INTEGER,
ADD COLUMN     "warningWindowDays" INTEGER,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OvertimeRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PayrollConcept" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PayrollEmployee" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PayrollRun" ALTER COLUMN "code" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShiftTemplate" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TimeClockDevice" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "HrCompensationHistory" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevSalary" DECIMAL(12,2),
    "newSalary" DECIMAL(12,2),
    "prevAllowance" DECIMAL(12,2),
    "newAllowance" DECIMAL(12,2),
    "prevPayScheme" "HrPaymentScheme",
    "newPayScheme" "HrPaymentScheme",
    "comments" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrCompensationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrEmployeeWarning" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "HrEmployeeWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrAttendanceEvent" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrAttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPayrollRun" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPayrollLine" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "bonuses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPayrollLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrWarningAttachment" (
    "id" TEXT NOT NULL,
    "warningId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrWarningAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HrCompensationHistory_employeeId_createdAt_idx" ON "HrCompensationHistory"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "HrEmployeeWarning_employeeId_issuedAt_idx" ON "HrEmployeeWarning"("employeeId", "issuedAt");

-- CreateIndex
CREATE INDEX "HrAttendanceEvent_employeeId_occurredAt_idx" ON "HrAttendanceEvent"("employeeId", "occurredAt");

-- CreateIndex
CREATE INDEX "HrAttendanceEvent_occurredAt_idx" ON "HrAttendanceEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "HrPayrollLine_payrollRunId_idx" ON "HrPayrollLine"("payrollRunId");

-- CreateIndex
CREATE INDEX "HrPayrollLine_employeeId_idx" ON "HrPayrollLine"("employeeId");

-- CreateIndex
CREATE INDEX "HrWarningAttachment_warningId_idx" ON "HrWarningAttachment"("warningId");

-- CreateIndex
CREATE INDEX "DisciplinaryAction_status_idx" ON "DisciplinaryAction"("status");

-- AddForeignKey
ALTER TABLE "HrCompensationHistory" ADD CONSTRAINT "HrCompensationHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryAction" ADD CONSTRAINT "DisciplinaryAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryAction" ADD CONSTRAINT "DisciplinaryAction_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrEmployeeWarning" ADD CONSTRAINT "HrEmployeeWarning_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrEmployeeWarning" ADD CONSTRAINT "HrEmployeeWarning_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrAttendanceEvent" ADD CONSTRAINT "HrAttendanceEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayrollLine" ADD CONSTRAINT "HrPayrollLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "HrPayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayrollLine" ADD CONSTRAINT "HrPayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrWarningAttachment" ADD CONSTRAINT "HrWarningAttachment_warningId_fkey" FOREIGN KEY ("warningId") REFERENCES "HrEmployeeWarning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

