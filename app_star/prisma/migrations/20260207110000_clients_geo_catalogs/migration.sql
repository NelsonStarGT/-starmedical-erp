-- CreateTable
CREATE TABLE "GeoCountry" (
    "id" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "iso3" TEXT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoAdmin1" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoAdmin1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoAdmin2" (
    "id" TEXT NOT NULL,
    "admin1Id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoAdmin2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoAdmin3" (
    "id" TEXT NOT NULL,
    "admin2Id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoAdmin3_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ClientLocation"
ADD COLUMN "geoCountryId" TEXT,
ADD COLUMN "geoAdmin1Id" TEXT,
ADD COLUMN "geoAdmin2Id" TEXT,
ADD COLUMN "geoAdmin3Id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GeoCountry_iso2_key" ON "GeoCountry"("iso2");

-- CreateIndex
CREATE UNIQUE INDEX "GeoCountry_iso3_key" ON "GeoCountry"("iso3");

-- CreateIndex
CREATE INDEX "GeoCountry_name_idx" ON "GeoCountry"("name");

-- CreateIndex
CREATE INDEX "GeoCountry_isActive_idx" ON "GeoCountry"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GeoAdmin1_countryId_code_key" ON "GeoAdmin1"("countryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "GeoAdmin1_countryId_name_key" ON "GeoAdmin1"("countryId", "name");

-- CreateIndex
CREATE INDEX "GeoAdmin1_countryId_isActive_name_idx" ON "GeoAdmin1"("countryId", "isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GeoAdmin2_admin1Id_code_key" ON "GeoAdmin2"("admin1Id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "GeoAdmin2_admin1Id_name_key" ON "GeoAdmin2"("admin1Id", "name");

-- CreateIndex
CREATE INDEX "GeoAdmin2_admin1Id_isActive_name_idx" ON "GeoAdmin2"("admin1Id", "isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GeoAdmin3_admin2Id_code_key" ON "GeoAdmin3"("admin2Id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "GeoAdmin3_admin2Id_name_key" ON "GeoAdmin3"("admin2Id", "name");

-- CreateIndex
CREATE INDEX "GeoAdmin3_admin2Id_isActive_name_idx" ON "GeoAdmin3"("admin2Id", "isActive", "name");

-- CreateIndex
CREATE INDEX "ClientLocation_geoCountryId_idx" ON "ClientLocation"("geoCountryId");

-- CreateIndex
CREATE INDEX "ClientLocation_geoAdmin1Id_idx" ON "ClientLocation"("geoAdmin1Id");

-- CreateIndex
CREATE INDEX "ClientLocation_geoAdmin2Id_idx" ON "ClientLocation"("geoAdmin2Id");

-- CreateIndex
CREATE INDEX "ClientLocation_geoAdmin3Id_idx" ON "ClientLocation"("geoAdmin3Id");

-- AddForeignKey
ALTER TABLE "GeoAdmin1" ADD CONSTRAINT "GeoAdmin1_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "GeoCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoAdmin2" ADD CONSTRAINT "GeoAdmin2_admin1Id_fkey" FOREIGN KEY ("admin1Id") REFERENCES "GeoAdmin1"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoAdmin3" ADD CONSTRAINT "GeoAdmin3_admin2Id_fkey" FOREIGN KEY ("admin2Id") REFERENCES "GeoAdmin2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLocation" ADD CONSTRAINT "ClientLocation_geoCountryId_fkey" FOREIGN KEY ("geoCountryId") REFERENCES "GeoCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLocation" ADD CONSTRAINT "ClientLocation_geoAdmin1Id_fkey" FOREIGN KEY ("geoAdmin1Id") REFERENCES "GeoAdmin1"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLocation" ADD CONSTRAINT "ClientLocation_geoAdmin2Id_fkey" FOREIGN KEY ("geoAdmin2Id") REFERENCES "GeoAdmin2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLocation" ADD CONSTRAINT "ClientLocation_geoAdmin3Id_fkey" FOREIGN KEY ("geoAdmin3Id") REFERENCES "GeoAdmin3"("id") ON DELETE SET NULL ON UPDATE CASCADE;
