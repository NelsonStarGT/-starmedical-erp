-- CLIENTES 2.0 core: canales, referidos, datos demográficos y locations extendidas

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientBloodType') THEN
    CREATE TYPE "ClientBloodType" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG', 'DESCONOCIDO');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InsurerBillingCutoffMode') THEN
    CREATE TYPE "InsurerBillingCutoffMode" AS ENUM ('DAY_OF_MONTH', 'LAST_DAY_OF_MONTH');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InsurerBillingType') THEN
    CREATE TYPE "InsurerBillingType" AS ENUM ('FIXED', 'VARIABLE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ClientCatalogType' AND e.enumlabel = 'PERSON_CATEGORY'
  ) THEN
    ALTER TYPE "ClientCatalogType" ADD VALUE 'PERSON_CATEGORY';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ClientCatalogType' AND e.enumlabel = 'PERSON_PROFESSION'
  ) THEN
    ALTER TYPE "ClientCatalogType" ADD VALUE 'PERSON_PROFESSION';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ClientCatalogType' AND e.enumlabel = 'COMPANY_CATEGORY'
  ) THEN
    ALTER TYPE "ClientCatalogType" ADD VALUE 'COMPANY_CATEGORY';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ClientCatalogType' AND e.enumlabel = 'INSTITUTION_CATEGORY'
  ) THEN
    ALTER TYPE "ClientCatalogType" ADD VALUE 'INSTITUTION_CATEGORY';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ClientLocationType' AND e.enumlabel = 'MAIN'
  ) THEN
    ALTER TYPE "ClientLocationType" ADD VALUE 'MAIN';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ClientLocationType' AND e.enumlabel = 'BRANCH'
  ) THEN
    ALTER TYPE "ClientLocationType" ADD VALUE 'BRANCH';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ClientLocationType' AND e.enumlabel = 'OFFICE'
  ) THEN
    ALTER TYPE "ClientLocationType" ADD VALUE 'OFFICE';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ClientLocationType' AND e.enumlabel = 'PLANT'
  ) THEN
    ALTER TYPE "ClientLocationType" ADD VALUE 'PLANT';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ClientLocationType' AND e.enumlabel = 'STORE'
  ) THEN
    ALTER TYPE "ClientLocationType" ADD VALUE 'STORE';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ClientAcquisitionSource" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "category" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientAcquisitionSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientAcquisitionSource_name_key" ON "ClientAcquisitionSource"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientAcquisitionSource_code_key" ON "ClientAcquisitionSource"("code");
CREATE INDEX IF NOT EXISTS "ClientAcquisitionSource_isActive_sortOrder_name_idx" ON "ClientAcquisitionSource"("isActive", "sortOrder", "name");

CREATE TABLE IF NOT EXISTS "ClientAcquisitionDetailOption" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientAcquisitionDetailOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientAcquisitionDetailOption_sourceId_code_key" ON "ClientAcquisitionDetailOption"("sourceId", "code");
CREATE INDEX IF NOT EXISTS "ClientAcquisitionDetailOption_sourceId_isActive_name_idx" ON "ClientAcquisitionDetailOption"("sourceId", "isActive", "name");

DO $$
BEGIN
  ALTER TABLE "ClientAcquisitionDetailOption"
    ADD CONSTRAINT "ClientAcquisitionDetailOption_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "ClientAcquisitionSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ClientReferral" (
  "id" TEXT NOT NULL,
  "referrerClientId" TEXT NOT NULL,
  "referredClientId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientReferral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientReferral_referrerClientId_referredClientId_key" ON "ClientReferral"("referrerClientId", "referredClientId");
CREATE INDEX IF NOT EXISTS "ClientReferral_referrerClientId_createdAt_idx" ON "ClientReferral"("referrerClientId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientReferral_referredClientId_createdAt_idx" ON "ClientReferral"("referredClientId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "ClientReferral"
    ADD CONSTRAINT "ClientReferral_referrerClientId_fkey"
    FOREIGN KEY ("referrerClientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientReferral"
    ADD CONSTRAINT "ClientReferral_referredClientId_fkey"
    FOREIGN KEY ("referredClientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "thirdName" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "thirdLastName" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "bloodType" "ClientBloodType" DEFAULT 'DESCONOCIDO';
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "professionCatalogId" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "companyCategoryId" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "institutionCategoryId" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "personCategoryId" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "acquisitionSourceId" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "acquisitionDetailOptionId" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "acquisitionOtherNote" VARCHAR(150);
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "institutionIsPayer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "institutionIsGroupOrganizer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "institutionIsSponsor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "insurerCutoffMode" "InsurerBillingCutoffMode";
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "insurerCutoffDay" INTEGER;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "insurerBillingType" "InsurerBillingType";
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "insurerDiscountRules" JSONB;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "insurerManualRulePriority" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "ClientProfile_birthDate_idx" ON "ClientProfile"("birthDate");
CREATE INDEX IF NOT EXISTS "ClientProfile_country_idx" ON "ClientProfile"("country");
CREATE INDEX IF NOT EXISTS "ClientProfile_acquisitionSourceId_idx" ON "ClientProfile"("acquisitionSourceId");
CREATE INDEX IF NOT EXISTS "ClientProfile_acquisitionDetailOptionId_idx" ON "ClientProfile"("acquisitionDetailOptionId");

DO $$
BEGIN
  ALTER TABLE "ClientProfile"
    ADD CONSTRAINT "ClientProfile_acquisitionSourceId_fkey"
    FOREIGN KEY ("acquisitionSourceId") REFERENCES "ClientAcquisitionSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientProfile"
    ADD CONSTRAINT "ClientProfile_acquisitionDetailOptionId_fkey"
    FOREIGN KEY ("acquisitionDetailOptionId") REFERENCES "ClientAcquisitionDetailOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientProfile"
    ADD CONSTRAINT "ClientProfile_professionCatalogId_fkey"
    FOREIGN KEY ("professionCatalogId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientProfile"
    ADD CONSTRAINT "ClientProfile_companyCategoryId_fkey"
    FOREIGN KEY ("companyCategoryId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientProfile"
    ADD CONSTRAINT "ClientProfile_institutionCategoryId_fkey"
    FOREIGN KEY ("institutionCategoryId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientProfile"
    ADD CONSTRAINT "ClientProfile_personCategoryId_fkey"
    FOREIGN KEY ("personCategoryId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ClientLocation" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "ClientLocation" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "ClientLocation" ADD COLUMN IF NOT EXISTS "addressLine1" TEXT;
ALTER TABLE "ClientLocation" ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
ALTER TABLE "ClientLocation" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "ClientLocation" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "ClientLocation" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ClientLocation" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

UPDATE "ClientLocation"
SET "addressLine1" = COALESCE(NULLIF("addressLine1", ''), "address")
WHERE "addressLine1" IS NULL;

CREATE INDEX IF NOT EXISTS "ClientLocation_clientId_isPrimary_idx" ON "ClientLocation"("clientId", "isPrimary");
CREATE INDEX IF NOT EXISTS "ClientLocation_clientId_isActive_idx" ON "ClientLocation"("clientId", "isActive");

WITH upsert_source AS (
  INSERT INTO "ClientAcquisitionSource" ("id", "name", "code", "category", "sortOrder", "isActive") VALUES
    (concat('src_', md5('LLEGADA_INSTALACIONES')), 'Llega a instalaciones', 'WALK_IN', 'DIRECT', 10, true),
    (concat('src_', md5('WHATSAPP')), 'WhatsApp', 'WHATSAPP', 'DIGITAL', 20, true),
    (concat('src_', md5('REDES_SOCIALES')), 'Redes sociales', 'SOCIAL_MEDIA', 'DIGITAL', 30, true),
    (concat('src_', md5('GOOGLE_MAPS')), 'Google Maps', 'GOOGLE_MAPS', 'DIGITAL', 40, true),
    (concat('src_', md5('WEB')), 'Web', 'WEB', 'DIGITAL', 50, true),
    (concat('src_', md5('EMPRESA')), 'Empresa', 'EMPRESA', 'B2B', 60, true),
    (concat('src_', md5('REFERIDO')), 'Referido', 'REFERIDO', 'REFERRAL', 70, true),
    (concat('src_', md5('OTRO')), 'Otro', 'OTRO', 'OTHER', 80, true)
  ON CONFLICT ("name") DO UPDATE SET
    "isActive" = true,
    "updatedAt" = CURRENT_TIMESTAMP
  RETURNING "id", "name"
)
SELECT 1;

WITH social AS (
  SELECT "id"
  FROM "ClientAcquisitionSource"
  WHERE lower("name") = lower('Redes sociales')
  ORDER BY "updatedAt" DESC
  LIMIT 1
)
INSERT INTO "ClientAcquisitionDetailOption" ("id", "sourceId", "code", "name", "isActive")
SELECT concat('srcd_', md5(concat(s."id", ':', v.code))), s."id", v.code, v.name, true
FROM social s
CROSS JOIN (
  VALUES
    ('FACEBOOK', 'Facebook'),
    ('INSTAGRAM', 'Instagram'),
    ('TIKTOK', 'TikTok'),
    ('LINKEDIN', 'LinkedIn'),
    ('X', 'X'),
    ('YOUTUBE', 'YouTube'),
    ('OTRA_RED', 'Otra red')
) AS v(code, name)
ON CONFLICT ("sourceId", "code") DO NOTHING;
