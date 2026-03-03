CREATE TABLE "PersonCompanyLink" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "relationType" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonCompanyLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonCompanyLink_personId_companyId_key"
  ON "PersonCompanyLink"("personId", "companyId");

CREATE INDEX "PersonCompanyLink_tenantId_personId_isActive_deletedAt_idx"
  ON "PersonCompanyLink"("tenantId", "personId", "isActive", "deletedAt");

CREATE INDEX "PersonCompanyLink_tenantId_companyId_isActive_deletedAt_idx"
  ON "PersonCompanyLink"("tenantId", "companyId", "isActive", "deletedAt");

CREATE INDEX "PersonCompanyLink_tenantId_isPrimary_isActive_deletedAt_idx"
  ON "PersonCompanyLink"("tenantId", "isPrimary", "isActive", "deletedAt");

CREATE UNIQUE INDEX "PersonCompanyLink_unique_active_primary_per_person_idx"
  ON "PersonCompanyLink"("personId")
  WHERE "isActive" = true AND "isPrimary" = true AND "deletedAt" IS NULL;

ALTER TABLE "PersonCompanyLink"
  ADD CONSTRAINT "PersonCompanyLink_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PersonCompanyLink"
  ADD CONSTRAINT "PersonCompanyLink_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PersonCompanyLink" (
  "id",
  "tenantId",
  "personId",
  "companyId",
  "relationType",
  "isPrimary",
  "isActive",
  "startAt",
  "endAt",
  "deletedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  concat(
    'pcl_',
    md5(
      ca."personClientId"
      || ':'
      || ca."entityClientId"
      || ':'
      || ca."createdAt"::text
      || ':'
      || random()::text
    )
  ),
  ca."tenantId",
  ca."personClientId",
  ca."entityClientId",
  NULLIF(BTRIM(ca."role"), ''),
  COALESCE(ca."isPrimaryPayer", false),
  CASE WHEN ca."status" = 'INACTIVE' OR ca."deletedAt" IS NOT NULL THEN false ELSE true END,
  ca."createdAt",
  CASE
    WHEN ca."status" = 'INACTIVE' OR ca."deletedAt" IS NOT NULL THEN COALESCE(ca."updatedAt", ca."createdAt")
    ELSE NULL
  END,
  ca."deletedAt",
  ca."createdAt",
  ca."updatedAt"
FROM "ClientAffiliation" ca
INNER JOIN "ClientProfile" person ON person."id" = ca."personClientId"
INNER JOIN "ClientProfile" company ON company."id" = ca."entityClientId"
WHERE ca."entityType" = 'COMPANY'
  AND person."type" = 'PERSON'
  AND company."type" = 'COMPANY'
ON CONFLICT ("personId", "companyId") DO UPDATE
SET
  "tenantId" = EXCLUDED."tenantId",
  "relationType" = COALESCE(EXCLUDED."relationType", "PersonCompanyLink"."relationType"),
  "isPrimary" = EXCLUDED."isPrimary",
  "isActive" = EXCLUDED."isActive",
  "startAt" = COALESCE("PersonCompanyLink"."startAt", EXCLUDED."startAt"),
  "endAt" = COALESCE(EXCLUDED."endAt", "PersonCompanyLink"."endAt"),
  "deletedAt" = EXCLUDED."deletedAt",
  "updatedAt" = CURRENT_TIMESTAMP;

WITH multi_primary AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "personId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS row_num
  FROM "PersonCompanyLink"
  WHERE "isActive" = true
    AND "deletedAt" IS NULL
    AND "isPrimary" = true
),
normalized AS (
  UPDATE "PersonCompanyLink" pcl
  SET "isPrimary" = CASE WHEN mp.row_num = 1 THEN true ELSE false END
  FROM multi_primary mp
  WHERE pcl."id" = mp."id"
  RETURNING pcl."personId"
),
missing_primary AS (
  SELECT pcl."personId"
  FROM "PersonCompanyLink" pcl
  GROUP BY pcl."personId"
  HAVING COUNT(*) FILTER (WHERE pcl."isActive" = true AND pcl."deletedAt" IS NULL) > 0
    AND COUNT(*) FILTER (
      WHERE pcl."isActive" = true
        AND pcl."deletedAt" IS NULL
        AND pcl."isPrimary" = true
    ) = 0
),
first_active AS (
  SELECT
    pcl."id",
    ROW_NUMBER() OVER (
      PARTITION BY pcl."personId"
      ORDER BY pcl."createdAt" ASC, pcl."id" ASC
    ) AS row_num
  FROM "PersonCompanyLink" pcl
  INNER JOIN missing_primary mp ON mp."personId" = pcl."personId"
  WHERE pcl."isActive" = true
    AND pcl."deletedAt" IS NULL
)
UPDATE "PersonCompanyLink" pcl
SET "isPrimary" = true,
    "updatedAt" = CURRENT_TIMESTAMP
FROM first_active fa
WHERE pcl."id" = fa."id"
  AND fa.row_num = 1;
