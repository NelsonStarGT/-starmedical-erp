-- Branch lock + billing profiles (operational branch <-> fiscal mapping)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BranchAccessMode') THEN
    CREATE TYPE "BranchAccessMode" AS ENUM ('LOCKED', 'SWITCH');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Tenant" ("id", "name", "isActive")
VALUES ('global', 'StarMedical', true)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "Branch"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT,
  ADD COLUMN IF NOT EXISTS "parentId" TEXT;

ALTER TABLE "LegalEntity"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "BranchSatEstablishment"
  ADD COLUMN IF NOT EXISTS "legalEntityId" TEXT;

ALTER TABLE "BranchFelSeries"
  ADD COLUMN IF NOT EXISTS "initialNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "currentNumber" INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_tenantId_fkey') THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Branch_tenantId_fkey') THEN
    ALTER TABLE "Branch"
      ADD CONSTRAINT "Branch_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Branch_parentId_fkey') THEN
    ALTER TABLE "Branch"
      ADD CONSTRAINT "Branch_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "Branch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LegalEntity_tenantId_fkey') THEN
    ALTER TABLE "LegalEntity"
      ADD CONSTRAINT "LegalEntity_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchSatEstablishment_legalEntityId_fkey') THEN
    ALTER TABLE "BranchSatEstablishment"
      ADD CONSTRAINT "BranchSatEstablishment_legalEntityId_fkey"
      FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "UserBranchAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT,
  "branchId" TEXT NOT NULL,
  "accessMode" "BranchAccessMode" NOT NULL DEFAULT 'LOCKED',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBranchAccess_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserBranchAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserBranchAccess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "UserBranchAccess_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "BranchBillingProfile" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "establishmentId" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 10,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rulesJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchBillingProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BranchBillingProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BranchBillingProfile_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BranchBillingProfile_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "BranchSatEstablishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserBranchAccess_userId_branchId_key"
  ON "UserBranchAccess"("userId", "branchId");

CREATE INDEX IF NOT EXISTS "UserBranchAccess_userId_isDefault_idx"
  ON "UserBranchAccess"("userId", "isDefault");

CREATE INDEX IF NOT EXISTS "UserBranchAccess_tenantId_branchId_idx"
  ON "UserBranchAccess"("tenantId", "branchId");

CREATE INDEX IF NOT EXISTS "UserBranchAccess_branchId_idx"
  ON "UserBranchAccess"("branchId");

CREATE UNIQUE INDEX IF NOT EXISTS "BranchBillingProfile_branchId_legalEntityId_establishmentId_key"
  ON "BranchBillingProfile"("branchId", "legalEntityId", "establishmentId");

CREATE INDEX IF NOT EXISTS "BranchBillingProfile_branchId_isActive_priority_idx"
  ON "BranchBillingProfile"("branchId", "isActive", "priority");

CREATE INDEX IF NOT EXISTS "BranchBillingProfile_legalEntityId_idx"
  ON "BranchBillingProfile"("legalEntityId");

CREATE INDEX IF NOT EXISTS "BranchBillingProfile_establishmentId_idx"
  ON "BranchBillingProfile"("establishmentId");

CREATE INDEX IF NOT EXISTS "Branch_parentId_idx"
  ON "Branch"("parentId");

CREATE INDEX IF NOT EXISTS "Branch_tenantId_idx"
  ON "Branch"("tenantId");

CREATE INDEX IF NOT EXISTS "BranchSatEstablishment_legalEntityId_idx"
  ON "BranchSatEstablishment"("legalEntityId");

UPDATE "Branch"
SET "tenantId" = 'global'
WHERE "tenantId" IS NULL;

UPDATE "User"
SET "tenantId" = 'global'
WHERE "tenantId" IS NULL;

UPDATE "LegalEntity"
SET "tenantId" = 'global'
WHERE "tenantId" IS NULL;

INSERT INTO "UserBranchAccess" (
  "id",
  "userId",
  "tenantId",
  "branchId",
  "accessMode",
  "isDefault",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('uba_', md5(u."id" || ':' || u."branchId")),
  u."id",
  COALESCE(u."tenantId", 'global'),
  u."branchId",
  'LOCKED'::"BranchAccessMode",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
INNER JOIN "Branch" b ON b."id" = u."branchId" AND b."isActive" = true
LEFT JOIN "UserBranchAccess" a ON a."userId" = u."id" AND a."branchId" = u."branchId"
WHERE u."branchId" IS NOT NULL
  AND a."id" IS NULL;
