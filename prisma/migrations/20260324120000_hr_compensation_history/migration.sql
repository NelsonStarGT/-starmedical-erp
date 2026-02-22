-- Add base allowance to engagement
ALTER TABLE "EmployeeEngagement" ADD COLUMN IF NOT EXISTS "baseAllowance" DECIMAL(12,2);

-- Compensation history for HR base salary/allowance updates
CREATE TABLE IF NOT EXISTS "HrCompensationHistory" (
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

CREATE INDEX IF NOT EXISTS "HrCompensationHistory_employeeId_createdAt_idx" ON "HrCompensationHistory"("employeeId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "HrCompensationHistory"
    ADD CONSTRAINT "HrCompensationHistory_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
