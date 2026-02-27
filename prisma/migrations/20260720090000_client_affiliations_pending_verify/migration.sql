ALTER TYPE "ClientAffiliationStatus" ADD VALUE IF NOT EXISTS 'PENDING_VERIFY';

ALTER TABLE "ClientAffiliation"
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "lastVerifiedAt" TIMESTAMP(3);

UPDATE "ClientAffiliation" AS ca
SET "tenantId" = cp."tenantId"
FROM "ClientProfile" AS cp
WHERE cp."id" = ca."personClientId";

UPDATE "ClientAffiliation"
SET "lastVerifiedAt" = COALESCE("lastVerifiedAt", "updatedAt", "createdAt")
WHERE "status" = 'ACTIVE';

ALTER TABLE "ClientAffiliation"
  ALTER COLUMN "tenantId" SET NOT NULL;

DROP INDEX IF EXISTS "ClientAffiliation_personClientId_status_deletedAt_idx";
DROP INDEX IF EXISTS "ClientAffiliation_entityType_entityClientId_deletedAt_idx";

CREATE INDEX "ClientAffiliation_tenantId_personClientId_status_deletedAt_idx"
  ON "ClientAffiliation"("tenantId", "personClientId", "status", "deletedAt");

CREATE INDEX "ClientAffiliation_tenantId_entityType_entityClientId_deletedAt_idx"
  ON "ClientAffiliation"("tenantId", "entityType", "entityClientId", "deletedAt");

DROP INDEX IF EXISTS "ClientAffiliation_unique_active_target_per_person_idx";

CREATE UNIQUE INDEX "ClientAffiliation_unique_active_target_per_person_idx"
  ON "ClientAffiliation"("personClientId", "entityType", "entityClientId")
  WHERE "deletedAt" IS NULL AND "status" <> 'INACTIVE';
