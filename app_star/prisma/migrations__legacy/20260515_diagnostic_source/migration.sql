-- Add source type enum and columns to DiagnosticOrder
CREATE TYPE "DiagnosticOrderSourceType" AS ENUM ('WALK_IN', 'CONSULTA');

ALTER TABLE "DiagnosticOrder"
  ADD COLUMN "sourceType" "DiagnosticOrderSourceType" NOT NULL DEFAULT 'WALK_IN',
  ADD COLUMN "sourceRefId" TEXT;
