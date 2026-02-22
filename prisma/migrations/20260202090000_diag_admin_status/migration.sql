-- DiagnosticOrder admin status and payment metadata
CREATE TYPE "DiagnosticOrderAdminStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'INSURANCE_AUTH', 'PAID', 'SENT_TO_EXECUTION', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DiagnosticPaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'INSURANCE');

ALTER TABLE "DiagnosticOrder"
  ADD COLUMN "adminStatus" "DiagnosticOrderAdminStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "paymentMethod" "DiagnosticPaymentMethod",
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "insuranceId" TEXT,
  ADD COLUMN "authorizedAt" TIMESTAMP(3),
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "authorizedByUserId" TEXT;

CREATE INDEX "DiagnosticOrder_adminStatus_idx" ON "DiagnosticOrder"("adminStatus");

-- Cross-module references
ALTER TABLE "ImagingStudy" ADD COLUMN "diagnosticOrderId" TEXT;
ALTER TABLE "LabTestOrder" ADD COLUMN "sourceDiagnosticOrderId" TEXT;
ALTER TABLE "LabTestItem" ADD COLUMN "sourceDiagnosticOrderId" TEXT;
