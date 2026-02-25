-- Clients: dynamic identity + demographic birth/residence metadata
-- Idempotent migration

ALTER TABLE "ClientDemographicData"
  ADD COLUMN IF NOT EXISTS "birthCountryId" TEXT,
  ADD COLUMN IF NOT EXISTS "birthCity" TEXT,
  ADD COLUMN IF NOT EXISTS "residenceCountryId" TEXT,
  ADD COLUMN IF NOT EXISTS "residenceSameAsBirth" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  ALTER TABLE "ClientDemographicData"
    ADD CONSTRAINT "ClientDemographicData_birthCountryId_fkey"
    FOREIGN KEY ("birthCountryId")
    REFERENCES "GeoCountry"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientDemographicData"
    ADD CONSTRAINT "ClientDemographicData_residenceCountryId_fkey"
    FOREIGN KEY ("residenceCountryId")
    REFERENCES "GeoCountry"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ClientDemographicData_birthCountryId_idx"
  ON "ClientDemographicData"("birthCountryId");

CREATE INDEX IF NOT EXISTS "ClientDemographicData_residenceCountryId_idx"
  ON "ClientDemographicData"("residenceCountryId");

