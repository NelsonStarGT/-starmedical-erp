-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DOCUMENT_EXPIRY', 'LICENSE_EXPIRY', 'CONTRACT_EXPIRY');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'POSTED');

-- DropForeignKey
ALTER TABLE "HrEmployee" DROP CONSTRAINT "HrEmployee_primaryBranchId_fkey";

-- DropForeignKey
ALTER TABLE "HrEmployee" DROP CONSTRAINT "HrEmployee_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "HrEmployee" DROP CONSTRAINT "HrEmployee_positionId_fkey";

-- DropForeignKey
ALTER TABLE "HrEmployeeDocument" DROP CONSTRAINT "HrEmployeeDocument_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "HrEmployeeBranchAssignment" DROP CONSTRAINT "HrEmployeeBranchAssignment_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "HrEmployeeBranchAssignment" DROP CONSTRAINT "HrEmployeeBranchAssignment_branchId_fkey";

-- DropIndex
DROP INDEX "HrEmployee_primaryBranchId_idx";

-- DropIndex
DROP INDEX "HrEmployee_departmentId_idx";

-- DropIndex
DROP INDEX "HrEmployee_positionId_idx";

-- AlterTable
ALTER TABLE "HrEmployee" DROP COLUMN "departmentId",
DROP COLUMN "employmentType",
DROP COLUMN "hireDate",
DROP COLUMN "notes",
DROP COLUMN "positionId",
DROP COLUMN "primaryBranchId",
DROP COLUMN "terminationDate",
ADD COLUMN     "dpiPhotoUrl" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "homePhone" TEXT,
ADD COLUMN     "personalEmail" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "primaryLegalEntityId" TEXT,
ADD COLUMN     "residenceProofUrl" TEXT,
ADD COLUMN     "rtuFileUrl" TEXT,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "dpi" SET NOT NULL;

-- DropTable
DROP TABLE "HrEmployeeDocument";

-- DropTable
DROP TABLE "HrEmployeeBranchAssignment";

-- CreateTable
CREATE TABLE "EmployeeEngagement" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "employmentType" "HrEmploymentType" NOT NULL,
    "status" "HrEmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isPayrollEligible" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "compensationAmount" DECIMAL(12,2),
    "compensationCurrency" TEXT NOT NULL DEFAULT 'GTQ',
    "compensationFrequency" "PayFrequency" NOT NULL DEFAULT 'MONTHLY',
    "compensationNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCompensation" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "baseSalary" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "payFrequency" "PayFrequency" NOT NULL,
    "allowances" JSONB,
    "deductions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeCompensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBranchAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBranchAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePositionAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "departmentId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePositionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "HrEmployeeDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "retentionUntil" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "currentVersionId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalLicense" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "applies" BOOLEAN NOT NULL DEFAULT false,
    "number" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "issuingEntity" TEXT,
    "fileUrl" TEXT,
    "reminderDays" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entityId" TEXT,
    "entityType" TEXT,
    "employeeId" TEXT,
    "dueAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRunEntry" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "compensationSnapshot" JSONB,
    "grossAmount" DECIMAL(14,2),
    "netAmount" DECIMAL(14,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRunEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeEngagement_employeeId_idx" ON "EmployeeEngagement"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeEngagement_legalEntityId_idx" ON "EmployeeEngagement"("legalEntityId");

-- CreateIndex
CREATE INDEX "EmployeeEngagement_status_idx" ON "EmployeeEngagement"("status");

-- CreateIndex
CREATE INDEX "EmployeeCompensation_engagementId_effectiveFrom_idx" ON "EmployeeCompensation"("engagementId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "EmployeeBranchAssignment_employeeId_idx" ON "EmployeeBranchAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeBranchAssignment_branchId_idx" ON "EmployeeBranchAssignment"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeBranchAssignment_employeeId_branchId_key" ON "EmployeeBranchAssignment"("employeeId", "branchId");

-- CreateIndex
CREATE INDEX "EmployeePositionAssignment_employeeId_idx" ON "EmployeePositionAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeePositionAssignment_positionId_idx" ON "EmployeePositionAssignment"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDocument_currentVersionId_key" ON "EmployeeDocument"("currentVersionId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDocumentVersion_expiresAt_idx" ON "EmployeeDocumentVersion"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDocumentVersion_documentId_versionNumber_key" ON "EmployeeDocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalLicense_employeeId_key" ON "ProfessionalLicense"("employeeId");

-- CreateIndex
CREATE INDEX "Notification_employeeId_idx" ON "Notification"("employeeId");

-- CreateIndex
CREATE INDEX "Notification_type_dueAt_idx" ON "Notification"("type", "dueAt");

-- CreateIndex
CREATE INDEX "PayrollRun_legalEntityId_idx" ON "PayrollRun"("legalEntityId");

-- CreateIndex
CREATE INDEX "PayrollRun_status_idx" ON "PayrollRun"("status");

-- CreateIndex
CREATE INDEX "PayrollRunEntry_payrollRunId_idx" ON "PayrollRunEntry"("payrollRunId");

-- CreateIndex
CREATE INDEX "PayrollRunEntry_engagementId_idx" ON "PayrollRunEntry"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "HrEmployee_userId_key" ON "HrEmployee"("userId");

-- CreateIndex
CREATE INDEX "HrEmployee_dpi_idx" ON "HrEmployee"("dpi");

-- CreateIndex
CREATE INDEX "HrEmployee_primaryLegalEntityId_idx" ON "HrEmployee"("primaryLegalEntityId");

-- AddForeignKey
ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_primaryLegalEntityId_fkey" FOREIGN KEY ("primaryLegalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEngagement" ADD CONSTRAINT "EmployeeEngagement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEngagement" ADD CONSTRAINT "EmployeeEngagement_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompensation" ADD CONSTRAINT "EmployeeCompensation_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "EmployeeEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBranchAssignment" ADD CONSTRAINT "EmployeeBranchAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBranchAssignment" ADD CONSTRAINT "EmployeeBranchAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePositionAssignment" ADD CONSTRAINT "EmployeePositionAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePositionAssignment" ADD CONSTRAINT "EmployeePositionAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "HrPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePositionAssignment" ADD CONSTRAINT "EmployeePositionAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "HrDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "EmployeeDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocumentVersion" ADD CONSTRAINT "EmployeeDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmployeeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocumentVersion" ADD CONSTRAINT "EmployeeDocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalLicense" ADD CONSTRAINT "ProfessionalLicense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunEntry" ADD CONSTRAINT "PayrollRunEntry_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunEntry" ADD CONSTRAINT "PayrollRunEntry_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "EmployeeEngagement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

