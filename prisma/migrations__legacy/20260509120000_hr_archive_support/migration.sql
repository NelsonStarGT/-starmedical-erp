-- Add ARCHIVED status for HR employees and track archive/termination dates
ALTER TYPE "HrEmployeeStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "HrEmployee"
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "terminatedAt" TIMESTAMP(3);

ALTER TYPE "ApiIntegrationKey" ADD VALUE IF NOT EXISTS 'OPENAI';
