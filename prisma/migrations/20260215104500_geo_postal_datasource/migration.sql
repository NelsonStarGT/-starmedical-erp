-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "GeoPostalDataSource" AS ENUM ('official', 'operational');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "GeoPostalCode" ADD COLUMN IF NOT EXISTS "dataSource" "GeoPostalDataSource";

-- Backfill
UPDATE "GeoPostalCode"
SET "dataSource" = CASE
  WHEN COALESCE("isOperational", false) THEN 'operational'::"GeoPostalDataSource"
  ELSE 'official'::"GeoPostalDataSource"
END
WHERE "dataSource" IS NULL;

-- AlterTable
ALTER TABLE "GeoPostalCode" ALTER COLUMN "dataSource" SET DEFAULT 'official';
ALTER TABLE "GeoPostalCode" ALTER COLUMN "dataSource" SET NOT NULL;

-- AlterTable
ALTER TABLE "GeoPostalCode" DROP COLUMN IF EXISTS "isOperational";
