-- AlterTable
ALTER TABLE "TenantClientsConfig"
  ADD COLUMN "isOperatingCountryPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "operatingCountryId" TEXT,
  ADD COLUMN "operatingCountryDefaultsScopes" JSONB;

-- CreateIndex
CREATE INDEX "TenantClientsConfig_operatingCountryId_idx" ON "TenantClientsConfig"("operatingCountryId");

-- AddForeignKey
ALTER TABLE "TenantClientsConfig"
  ADD CONSTRAINT "TenantClientsConfig_operatingCountryId_fkey"
  FOREIGN KEY ("operatingCountryId") REFERENCES "GeoCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
