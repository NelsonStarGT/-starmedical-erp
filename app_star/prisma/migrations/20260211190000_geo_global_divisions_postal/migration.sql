-- Add enum value for fiscal locations
DO $$
BEGIN
  ALTER TYPE "ClientLocationType" ADD VALUE IF NOT EXISTS 'FISCAL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "GeoCountryMeta" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "level1Label" TEXT NOT NULL,
    "level2Label" TEXT NOT NULL,
    "level3Label" TEXT,
    "maxLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoCountryMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoDivision" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "legacyGeoAdmin1Id" TEXT,
    "legacyGeoAdmin2Id" TEXT,
    "legacyGeoAdmin3Id" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoDivision_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "GeoPostalCode" ADD COLUMN "divisionId" TEXT;

-- AlterTable
ALTER TABLE "ClientLocation" ADD COLUMN "postalCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GeoCountryMeta_countryId_key" ON "GeoCountryMeta"("countryId");

-- CreateIndex
CREATE INDEX "GeoCountryMeta_maxLevel_idx" ON "GeoCountryMeta"("maxLevel");

-- CreateIndex
CREATE UNIQUE INDEX "GeoDivision_countryId_level_code_parentId_key" ON "GeoDivision"("countryId", "level", "code", "parentId");

-- CreateIndex
CREATE INDEX "GeoDivision_countryId_level_parentId_idx" ON "GeoDivision"("countryId", "level", "parentId");

-- CreateIndex
CREATE INDEX "GeoDivision_countryId_name_idx" ON "GeoDivision"("countryId", "name");

-- CreateIndex
CREATE INDEX "GeoDivision_legacyGeoAdmin1Id_idx" ON "GeoDivision"("legacyGeoAdmin1Id");

-- CreateIndex
CREATE INDEX "GeoDivision_legacyGeoAdmin2Id_idx" ON "GeoDivision"("legacyGeoAdmin2Id");

-- CreateIndex
CREATE INDEX "GeoDivision_legacyGeoAdmin3Id_idx" ON "GeoDivision"("legacyGeoAdmin3Id");

-- CreateIndex
CREATE UNIQUE INDEX "GeoPostalCode_countryId_postalCode_divisionId_key" ON "GeoPostalCode"("countryId", "postalCode", "divisionId");

-- CreateIndex
CREATE INDEX "GeoPostalCode_divisionId_idx" ON "GeoPostalCode"("divisionId");

-- AddForeignKey
ALTER TABLE "GeoCountryMeta" ADD CONSTRAINT "GeoCountryMeta_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "GeoCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoDivision" ADD CONSTRAINT "GeoDivision_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "GeoCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoDivision" ADD CONSTRAINT "GeoDivision_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GeoDivision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoPostalCode" ADD CONSTRAINT "GeoPostalCode_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "GeoDivision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
