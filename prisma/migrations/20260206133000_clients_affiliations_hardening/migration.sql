-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClientAffiliation"
ADD COLUMN "entityType" "ClientProfileType",
ADD COLUMN "isPrimaryPayer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Backfill target type from related profile
UPDATE "ClientAffiliation" AS ca
SET "entityType" = cp."type"
FROM "ClientProfile" AS cp
WHERE ca."entityClientId" = cp."id";

-- Safe fallback for edge cases where target profile is missing
UPDATE "ClientAffiliation"
SET "entityType" = 'COMPANY'
WHERE "entityType" IS NULL;

ALTER TABLE "ClientAffiliation"
ALTER COLUMN "entityType" SET NOT NULL;

-- Remove old global uniqueness to allow soft-delete history
DROP INDEX IF EXISTS "ClientAffiliation_personClientId_entityClientId_key";

-- De-duplicate active rows before creating partial unique index
WITH duplicate_affiliations AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "personClientId", "entityType", "entityClientId"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS "rn"
  FROM "ClientAffiliation"
  WHERE "deletedAt" IS NULL
)
UPDATE "ClientAffiliation"
SET
  "deletedAt" = NOW(),
  "status" = 'INACTIVE',
  "isPrimaryPayer" = false
WHERE "id" IN (
  SELECT "id"
  FROM duplicate_affiliations
  WHERE "rn" > 1
);

-- Normalize duplicates in current primary flags
WITH duplicate_primaries AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "personClientId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS "rn"
  FROM "ClientAffiliation"
  WHERE
    "deletedAt" IS NULL
    AND "status" = 'ACTIVE'
    AND "isPrimaryPayer" = true
)
UPDATE "ClientAffiliation"
SET "isPrimaryPayer" = false
WHERE "id" IN (
  SELECT "id"
  FROM duplicate_primaries
  WHERE "rn" > 1
);

-- Ensure one primary payer when there are active affiliations
WITH persons_without_primary AS (
  SELECT a."personClientId"
  FROM "ClientAffiliation" AS a
  WHERE a."deletedAt" IS NULL AND a."status" = 'ACTIVE'
  GROUP BY a."personClientId"
  HAVING SUM(CASE WHEN a."isPrimaryPayer" THEN 1 ELSE 0 END) = 0
),
primary_candidates AS (
  SELECT
    a."id",
    ROW_NUMBER() OVER (
      PARTITION BY a."personClientId"
      ORDER BY a."createdAt" ASC, a."id" ASC
    ) AS "rn"
  FROM "ClientAffiliation" AS a
  JOIN persons_without_primary AS p ON p."personClientId" = a."personClientId"
  WHERE a."deletedAt" IS NULL AND a."status" = 'ACTIVE'
)
UPDATE "ClientAffiliation"
SET "isPrimaryPayer" = true
WHERE "id" IN (
  SELECT "id"
  FROM primary_candidates
  WHERE "rn" = 1
);

-- Indexes
CREATE INDEX "ClientProfile_type_deletedAt_idx" ON "ClientProfile"("type", "deletedAt");
CREATE INDEX "ClientAffiliation_personClientId_status_deletedAt_idx" ON "ClientAffiliation"("personClientId", "status", "deletedAt");
CREATE INDEX "ClientAffiliation_entityType_entityClientId_deletedAt_idx" ON "ClientAffiliation"("entityType", "entityClientId", "deletedAt");
CREATE INDEX "ClientAffiliation_isPrimaryPayer_deletedAt_idx" ON "ClientAffiliation"("isPrimaryPayer", "deletedAt");

-- Unique active affiliation per person + target
CREATE UNIQUE INDEX "ClientAffiliation_unique_active_target_per_person_idx"
ON "ClientAffiliation"("personClientId", "entityType", "entityClientId")
WHERE "deletedAt" IS NULL;

-- Unique active primary payer per person
CREATE UNIQUE INDEX "ClientAffiliation_unique_active_primary_payer_idx"
ON "ClientAffiliation"("personClientId")
WHERE "deletedAt" IS NULL AND "status" = 'ACTIVE' AND "isPrimaryPayer" = true;

