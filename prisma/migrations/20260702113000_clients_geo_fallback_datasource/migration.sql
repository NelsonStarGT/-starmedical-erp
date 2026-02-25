DO $$
BEGIN
  CREATE TYPE "GeoDivisionDataSource" AS ENUM ('official', 'operational');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "GeoDivision"
  ADD COLUMN IF NOT EXISTS "dataSource" "GeoDivisionDataSource" NOT NULL DEFAULT 'official';

CREATE INDEX IF NOT EXISTS "GeoDivision_countryId_dataSource_level_isActive_idx"
  ON "GeoDivision" ("countryId", "dataSource", "level", "isActive");

ALTER TABLE "ClientLocation"
  ADD COLUMN IF NOT EXISTS "freeState" TEXT;

ALTER TABLE "ClientLocation"
  ADD COLUMN IF NOT EXISTS "freeCity" TEXT;
