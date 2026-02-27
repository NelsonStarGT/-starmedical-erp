-- GeoCountry enrichments for calling code + admin labels
ALTER TABLE "GeoCountry"
  ADD COLUMN IF NOT EXISTS "callingCode" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "admin1Label" TEXT,
  ADD COLUMN IF NOT EXISTS "admin2Label" TEXT,
  ADD COLUMN IF NOT EXISTS "admin3Label" TEXT,
  ADD COLUMN IF NOT EXISTS "adminMaxLevel" INTEGER;

CREATE INDEX IF NOT EXISTS "GeoCountry_callingCode_idx" ON "GeoCountry"("callingCode");

-- GeoDivision optional postal field for lightweight fallback coverage
ALTER TABLE "GeoDivision"
  ADD COLUMN IF NOT EXISTS "postalCode" TEXT;

-- Extend existing GeoDivision datasource enum with baseline seed marker
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'GeoDivisionDataSource'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'GeoDivisionDataSource'
      AND e.enumlabel = 'seed_baseline'
  ) THEN
    ALTER TYPE "GeoDivisionDataSource" ADD VALUE 'seed_baseline';
  END IF;
END
$$;

-- Phone categories for multi-contact UI
DO $$
BEGIN
  CREATE TYPE "ClientPhoneCategory" AS ENUM (
    'PRIMARY',
    'MOBILE',
    'WHATSAPP',
    'WORK',
    'HOME',
    'EMERGENCY',
    'OFFICE',
    'BILLING',
    'HR',
    'SSO',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ClientPhone'
  ) THEN
    ALTER TABLE "ClientPhone"
      ADD COLUMN IF NOT EXISTS "category" "ClientPhoneCategory" NOT NULL DEFAULT 'PRIMARY';
  END IF;
END
$$;

-- Email channels for categorized multi-email support
DO $$
BEGIN
  CREATE TYPE "ClientEmailCategory" AS ENUM (
    'PRIMARY',
    'WORK',
    'HOME',
    'BILLING',
    'ADMIN',
    'HR',
    'SSO',
    'SUPPORT',
    'LEGAL',
    'PURCHASING',
    'IT',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "ClientEmail" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "category" "ClientEmailCategory" NOT NULL DEFAULT 'PRIMARY',
  "valueRaw" TEXT NOT NULL,
  "valueNormalized" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientEmail_clientId_valueNormalized_key"
  ON "ClientEmail"("clientId", "valueNormalized");

CREATE INDEX IF NOT EXISTS "ClientEmail_clientId_isPrimary_isActive_idx"
  ON "ClientEmail"("clientId", "isPrimary", "isActive");

CREATE INDEX IF NOT EXISTS "ClientEmail_clientId_isActive_idx"
  ON "ClientEmail"("clientId", "isActive");

CREATE INDEX IF NOT EXISTS "ClientEmail_valueNormalized_idx"
  ON "ClientEmail"("valueNormalized");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientEmail_clientId_fkey'
  ) THEN
    ALTER TABLE "ClientEmail"
      ADD CONSTRAINT "ClientEmail_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Enforce one active primary phone/email per client with partial unique indexes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ClientPhone'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "ClientPhone_one_primary_active_per_client"
      ON "ClientPhone"("clientId")
      WHERE "isPrimary" = true AND "isActive" = true;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "ClientEmail_one_primary_active_per_client"
  ON "ClientEmail"("clientId")
  WHERE "isPrimary" = true AND "isActive" = true;
