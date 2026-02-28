-- Memberships P0: catalogs + plan builder base

ALTER TABLE "MembershipConfig"
  ADD COLUMN IF NOT EXISTS "hidePricesForOperators" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipBenefitServiceType') THEN
    CREATE TYPE "MembershipBenefitServiceType" AS ENUM (
      'CONSULTA',
      'LAB',
      'RX',
      'IMAGEN',
      'FARMACIA',
      'AUDIOLOGIA',
      'OTRO'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MembershipDurationPreset" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "days" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "branchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipDurationPreset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MembershipBenefitCatalog" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "serviceType" "MembershipBenefitServiceType" NOT NULL,
  "imageUrl" TEXT,
  "iconKey" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "branchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipBenefitCatalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MembershipPlanBenefit" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "benefitId" TEXT NOT NULL,
  "quantity" INTEGER,
  "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipPlanBenefit_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MembershipPlan"
  ADD COLUMN IF NOT EXISTS "durationPresetId" TEXT,
  ADD COLUMN IF NOT EXISTS "customDurationDays" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "MembershipDurationPreset_branchId_name_key"
  ON "MembershipDurationPreset"("branchId", "name");

CREATE INDEX IF NOT EXISTS "MembershipDurationPreset_isActive_sortOrder_idx"
  ON "MembershipDurationPreset"("isActive", "sortOrder");

CREATE INDEX IF NOT EXISTS "MembershipDurationPreset_branchId_isActive_sortOrder_idx"
  ON "MembershipDurationPreset"("branchId", "isActive", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "MembershipBenefitCatalog_branchId_title_serviceType_key"
  ON "MembershipBenefitCatalog"("branchId", "title", "serviceType");

CREATE INDEX IF NOT EXISTS "MembershipBenefitCatalog_isActive_sortOrder_idx"
  ON "MembershipBenefitCatalog"("isActive", "sortOrder");

CREATE INDEX IF NOT EXISTS "MembershipBenefitCatalog_branchId_isActive_sortOrder_idx"
  ON "MembershipBenefitCatalog"("branchId", "isActive", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "MembershipPlanBenefit_planId_benefitId_key"
  ON "MembershipPlanBenefit"("planId", "benefitId");

CREATE INDEX IF NOT EXISTS "MembershipPlanBenefit_benefitId_idx"
  ON "MembershipPlanBenefit"("benefitId");

CREATE INDEX IF NOT EXISTS "MembershipPlan_durationPresetId_idx"
  ON "MembershipPlan"("durationPresetId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MembershipPlan_durationPresetId_fkey'
  ) THEN
    ALTER TABLE "MembershipPlan"
      ADD CONSTRAINT "MembershipPlan_durationPresetId_fkey"
      FOREIGN KEY ("durationPresetId") REFERENCES "MembershipDurationPreset"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MembershipPlanBenefit_planId_fkey'
  ) THEN
    ALTER TABLE "MembershipPlanBenefit"
      ADD CONSTRAINT "MembershipPlanBenefit_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MembershipPlanBenefit_benefitId_fkey'
  ) THEN
    ALTER TABLE "MembershipPlanBenefit"
      ADD CONSTRAINT "MembershipPlanBenefit_benefitId_fkey"
      FOREIGN KEY ("benefitId") REFERENCES "MembershipBenefitCatalog"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
