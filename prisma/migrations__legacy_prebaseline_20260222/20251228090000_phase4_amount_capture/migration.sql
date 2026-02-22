-- Phase 4: enforce capture data and quote-driven amount

-- Communication channel enum (if not already present)
CREATE TYPE "CrmPreferredChannel" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL', 'VISIT', 'VIDEO');

-- Add required capture/preference fields and derived amount
ALTER TABLE "CrmDeal" ADD COLUMN     "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "capturedById" TEXT NOT NULL DEFAULT 'Ventas',
ADD COLUMN     "preferredAt" TIMESTAMP(3),
ADD COLUMN     "preferredChannel" "CrmPreferredChannel",
ADD COLUMN     "servicesOtherNote" TEXT;

-- Backfill amount from previous estimate to avoid losing totals
UPDATE "CrmDeal" SET "amount" = COALESCE("amountEstimated", 0);

-- Normalize capturedById and enforce non-null going forward
UPDATE "CrmDeal" SET "capturedById" = 'Ventas' WHERE "capturedById" IS NULL OR "capturedById" = '';
ALTER TABLE "CrmDeal"
  ALTER COLUMN "capturedById" SET DEFAULT 'Ventas',
  ALTER COLUMN "capturedById" SET NOT NULL;
