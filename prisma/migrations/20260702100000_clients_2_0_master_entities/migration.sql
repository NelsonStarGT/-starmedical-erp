-- Clients 2.0 master entities: demographics, guardians, identifiers, phones

ALTER TYPE "ClientCatalogType" ADD VALUE IF NOT EXISTS 'MARITAL_STATUS';
ALTER TYPE "ClientCatalogType" ADD VALUE IF NOT EXISTS 'ACADEMIC_LEVEL';
ALTER TYPE "ClientCatalogType" ADD VALUE IF NOT EXISTS 'SOCIAL_NETWORK';
ALTER TYPE "ClientCatalogType" ADD VALUE IF NOT EXISTS 'LOCATION_TYPE';
ALTER TYPE "ClientCatalogType" ADD VALUE IF NOT EXISTS 'RELATIONSHIP_TYPE';

CREATE TABLE IF NOT EXISTS "ClientDemographicData" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "maritalStatusId" TEXT,
  "academicLevelId" TEXT,
  "responsibleClientId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientDemographicData_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientGuardianRelation" (
  "id" TEXT NOT NULL,
  "minorClientId" TEXT NOT NULL,
  "guardianClientId" TEXT NOT NULL,
  "relationshipTypeId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientGuardianRelation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientIdentifier" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "countryId" TEXT,
  "documentTypeId" TEXT,
  "value" TEXT NOT NULL,
  "valueNormalized" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientIdentifier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientPhone" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "e164" VARCHAR(20),
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientPhone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientDemographicData_clientId_key" ON "ClientDemographicData"("clientId");
CREATE INDEX IF NOT EXISTS "ClientDemographicData_maritalStatusId_idx" ON "ClientDemographicData"("maritalStatusId");
CREATE INDEX IF NOT EXISTS "ClientDemographicData_academicLevelId_idx" ON "ClientDemographicData"("academicLevelId");
CREATE INDEX IF NOT EXISTS "ClientDemographicData_responsibleClientId_idx" ON "ClientDemographicData"("responsibleClientId");

CREATE UNIQUE INDEX IF NOT EXISTS "ClientGuardianRelation_minorClientId_guardianClientId_key" ON "ClientGuardianRelation"("minorClientId", "guardianClientId");
CREATE INDEX IF NOT EXISTS "ClientGuardianRelation_minorClientId_isActive_idx" ON "ClientGuardianRelation"("minorClientId", "isActive");
CREATE INDEX IF NOT EXISTS "ClientGuardianRelation_guardianClientId_isActive_idx" ON "ClientGuardianRelation"("guardianClientId", "isActive");
CREATE INDEX IF NOT EXISTS "ClientGuardianRelation_relationshipTypeId_idx" ON "ClientGuardianRelation"("relationshipTypeId");

CREATE UNIQUE INDEX IF NOT EXISTS "ClientIdentifier_clientId_documentTypeId_valueNormalized_key" ON "ClientIdentifier"("clientId", "documentTypeId", "valueNormalized");
CREATE INDEX IF NOT EXISTS "ClientIdentifier_clientId_isPrimary_isActive_idx" ON "ClientIdentifier"("clientId", "isPrimary", "isActive");
CREATE INDEX IF NOT EXISTS "ClientIdentifier_documentTypeId_idx" ON "ClientIdentifier"("documentTypeId");
CREATE INDEX IF NOT EXISTS "ClientIdentifier_countryId_idx" ON "ClientIdentifier"("countryId");
CREATE INDEX IF NOT EXISTS "ClientIdentifier_valueNormalized_idx" ON "ClientIdentifier"("valueNormalized");

CREATE UNIQUE INDEX IF NOT EXISTS "ClientPhone_clientId_countryCode_number_key" ON "ClientPhone"("clientId", "countryCode", "number");
CREATE INDEX IF NOT EXISTS "ClientPhone_clientId_isPrimary_isActive_idx" ON "ClientPhone"("clientId", "isPrimary", "isActive");
CREATE INDEX IF NOT EXISTS "ClientPhone_clientId_isActive_idx" ON "ClientPhone"("clientId", "isActive");
CREATE INDEX IF NOT EXISTS "ClientPhone_e164_idx" ON "ClientPhone"("e164");

DO $$
BEGIN
  ALTER TABLE "ClientDemographicData"
    ADD CONSTRAINT "ClientDemographicData_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientDemographicData"
    ADD CONSTRAINT "ClientDemographicData_maritalStatusId_fkey"
    FOREIGN KEY ("maritalStatusId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientDemographicData"
    ADD CONSTRAINT "ClientDemographicData_academicLevelId_fkey"
    FOREIGN KEY ("academicLevelId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientDemographicData"
    ADD CONSTRAINT "ClientDemographicData_responsibleClientId_fkey"
    FOREIGN KEY ("responsibleClientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientGuardianRelation"
    ADD CONSTRAINT "ClientGuardianRelation_minorClientId_fkey"
    FOREIGN KEY ("minorClientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientGuardianRelation"
    ADD CONSTRAINT "ClientGuardianRelation_guardianClientId_fkey"
    FOREIGN KEY ("guardianClientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientGuardianRelation"
    ADD CONSTRAINT "ClientGuardianRelation_relationshipTypeId_fkey"
    FOREIGN KEY ("relationshipTypeId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientIdentifier"
    ADD CONSTRAINT "ClientIdentifier_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientIdentifier"
    ADD CONSTRAINT "ClientIdentifier_countryId_fkey"
    FOREIGN KEY ("countryId") REFERENCES "GeoCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientIdentifier"
    ADD CONSTRAINT "ClientIdentifier_documentTypeId_fkey"
    FOREIGN KEY ("documentTypeId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientPhone"
    ADD CONSTRAINT "ClientPhone_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
