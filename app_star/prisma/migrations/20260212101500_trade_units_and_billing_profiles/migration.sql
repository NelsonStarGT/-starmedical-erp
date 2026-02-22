-- Trade units (patentes / unidades comerciales) + billing profile tenant linkage

ALTER TABLE "BranchBillingProfile"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "BranchBillingProfile"
  ALTER COLUMN "establishmentId" DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BranchBillingProfile_establishmentId_fkey'
      AND conrelid = '"BranchBillingProfile"'::regclass
  ) THEN
    ALTER TABLE "BranchBillingProfile"
      DROP CONSTRAINT "BranchBillingProfile_establishmentId_fkey";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BranchBillingProfile_establishmentId_fkey'
      AND conrelid = '"BranchBillingProfile"'::regclass
  ) THEN
    ALTER TABLE "BranchBillingProfile"
      ADD CONSTRAINT "BranchBillingProfile_establishmentId_fkey"
      FOREIGN KEY ("establishmentId") REFERENCES "BranchSatEstablishment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BranchBillingProfile_tenantId_fkey'
      AND conrelid = '"BranchBillingProfile"'::regclass
  ) THEN
    ALTER TABLE "BranchBillingProfile"
      ADD CONSTRAINT "BranchBillingProfile_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "BranchBillingProfile" bp
SET "tenantId" = b."tenantId"
FROM "Branch" b
WHERE bp."branchId" = b."id"
  AND bp."tenantId" IS NULL;

CREATE INDEX IF NOT EXISTS "BranchBillingProfile_tenantId_idx"
  ON "BranchBillingProfile"("tenantId");

CREATE TABLE IF NOT EXISTS "TradeUnit" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "registrationNumber" TEXT,
  "address" TEXT,
  "branchId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "pdfAssetId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeUnit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TradeUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TradeUnit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TradeUnit_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TradeUnit_pdfAssetId_fkey" FOREIGN KEY ("pdfAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TradeUnit_tenantId_idx"
  ON "TradeUnit"("tenantId");

CREATE INDEX IF NOT EXISTS "TradeUnit_branchId_idx"
  ON "TradeUnit"("branchId");

CREATE INDEX IF NOT EXISTS "TradeUnit_legalEntityId_idx"
  ON "TradeUnit"("legalEntityId");

CREATE INDEX IF NOT EXISTS "TradeUnit_pdfAssetId_idx"
  ON "TradeUnit"("pdfAssetId");

CREATE UNIQUE INDEX IF NOT EXISTS "TradeUnit_branchId_name_key"
  ON "TradeUnit"("branchId", "name");
