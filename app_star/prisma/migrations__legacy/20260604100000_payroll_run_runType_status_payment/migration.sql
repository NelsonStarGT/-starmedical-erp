-- Align payroll run fields and statuses, add payment tracking

-- Add new enum for payment status
CREATE TYPE "PayrollPaymentStatus" AS ENUM ('PENDING', 'PAID', 'SIGNED');

-- Add extended payroll run status enum
CREATE TYPE "PayrollRunStatus_new" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'PAID', 'CLOSED');

-- Alter PayrollRun.status to use new enum
ALTER TABLE "PayrollRun" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PayrollRun" ALTER COLUMN "status" TYPE "PayrollRunStatus_new" USING ("status"::text::"PayrollRunStatus_new");
ALTER TABLE "PayrollRun" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Swap enums
ALTER TYPE "PayrollRunStatus" RENAME TO "PayrollRunStatus_old";
ALTER TYPE "PayrollRunStatus_new" RENAME TO "PayrollRunStatus";
DROP TYPE "PayrollRunStatus_old";

-- Rename type column -> runType
ALTER TABLE "PayrollRun" ADD COLUMN "runType" "PayrollRunType" NOT NULL DEFAULT 'REGULAR';
UPDATE "PayrollRun" SET "runType" = COALESCE("type", 'REGULAR');
ALTER TABLE "PayrollRun" DROP COLUMN IF EXISTS "type";

-- Add payment fields to PayrollRunEmployee
ALTER TABLE "PayrollRunEmployee"
ADD COLUMN IF NOT EXISTS "paymentStatus" "PayrollPaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "paidByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "signedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "signedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "signatureFileKey" TEXT,
ADD COLUMN IF NOT EXISTS "computedJson" JSONB;

CREATE INDEX IF NOT EXISTS "PayrollRun_runType_idx" ON "PayrollRun"("runType");
CREATE INDEX IF NOT EXISTS "PayrollRun_status_idx" ON "PayrollRun"("status");
CREATE INDEX IF NOT EXISTS "PayrollRunEmployee_paymentStatus_idx" ON "PayrollRunEmployee"("paymentStatus");
