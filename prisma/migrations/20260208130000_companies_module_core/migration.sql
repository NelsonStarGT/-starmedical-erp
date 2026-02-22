-- CreateEnum
CREATE TYPE "CompanyKind" AS ENUM ('COMPANY', 'INSTITUTION', 'INSURER');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CompanyContractStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "CompanyContactRole" AS ENUM ('LEGAL_REPRESENTATIVE', 'ADMINISTRATIVE', 'HUMAN_RESOURCES', 'OCCUPATIONAL_HEALTH', 'BILLING', 'PROCUREMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyContactStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CompanyContactChannel" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyLocationType" AS ENUM ('HEADQUARTERS', 'BRANCH', 'BILLING', 'SERVICE_SITE', 'OCCUPATIONAL_SITE', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyLocationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CompanyDocumentType" AS ENUM ('MASTER_SERVICE_AGREEMENT', 'ADDENDUM', 'INSURANCE_POLICY', 'TAX_CERTIFICATE', 'AUTHORIZATION_LETTER', 'OCCUPATIONAL_PROGRAM', 'NDA', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyDocumentStatus" AS ENUM ('PENDING_REVIEW', 'VALID', 'EXPIRING', 'EXPIRED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "clientProfileId" TEXT NOT NULL,
    "partyId" TEXT,
    "defaultBillingLegalEntityId" TEXT,
    "code" TEXT,
    "kind" "CompanyKind" NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "contractStatus" "CompanyContractStatus" NOT NULL DEFAULT 'PENDING',
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "taxId" TEXT,
    "registrationNumber" TEXT,
    "billingEmail" TEXT,
    "billingPhone" TEXT,
    "website" TEXT,
    "contractCode" TEXT,
    "contractStartDate" TIMESTAMP(3),
    "contractEndDate" TIMESTAMP(3),
    "defaultCreditTerm" "CreditTerm",
    "defaultPaymentMethod" "PaymentMethod",
    "notes" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "deletedByUserId" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "companyId" TEXT NOT NULL,
    "personClientId" TEXT,
    "role" "CompanyContactRole" NOT NULL DEFAULT 'ADMINISTRATIVE',
    "status" "CompanyContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "phoneExtension" TEXT,
    "preferredChannel" "CompanyContactChannel",
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "receivesBillingEmails" BOOLEAN NOT NULL DEFAULT false,
    "receivesMedicalResults" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "deletedByUserId" TEXT,

    CONSTRAINT "CompanyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "type" "CompanyLocationType" NOT NULL DEFAULT 'HEADQUARTERS',
    "status" "CompanyLocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "geoCountryId" TEXT,
    "geoAdmin1Id" TEXT,
    "geoAdmin2Id" TEXT,
    "geoAdmin3Id" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "supportsReception" BOOLEAN NOT NULL DEFAULT false,
    "supportsOccupationalHealth" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "deletedByUserId" TEXT,

    CONSTRAINT "CompanyLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "companyId" TEXT NOT NULL,
    "companyLocationId" TEXT,
    "fileAssetId" TEXT,
    "type" "CompanyDocumentType" NOT NULL,
    "status" "CompanyDocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "title" TEXT NOT NULL,
    "code" TEXT,
    "issuedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "renewalReminderDays" INTEGER DEFAULT 30,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "deletedByUserId" TEXT,

    CONSTRAINT "CompanyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_clientProfileId_key" ON "Company"("clientProfileId");

-- CreateIndex
CREATE INDEX "Company_tenantId_kind_status_deletedAt_idx" ON "Company"("tenantId", "kind", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Company_tenantId_contractStatus_deletedAt_idx" ON "Company"("tenantId", "contractStatus", "deletedAt");

-- CreateIndex
CREATE INDEX "Company_taxId_idx" ON "Company"("taxId");

-- CreateIndex
CREATE INDEX "Company_partyId_idx" ON "Company"("partyId");

-- CreateIndex
CREATE INDEX "Company_defaultBillingLegalEntityId_idx" ON "Company"("defaultBillingLegalEntityId");

-- CreateIndex
CREATE INDEX "Company_deletedAt_idx" ON "Company"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Company_tenantId_code_key" ON "Company"("tenantId", "code");

-- CreateIndex
CREATE INDEX "CompanyContact_tenantId_status_deletedAt_idx" ON "CompanyContact"("tenantId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "CompanyContact_companyId_status_deletedAt_idx" ON "CompanyContact"("companyId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "CompanyContact_personClientId_idx" ON "CompanyContact"("personClientId");

-- CreateIndex
CREATE INDEX "CompanyContact_email_idx" ON "CompanyContact"("email");

-- CreateIndex
CREATE INDEX "CompanyContact_deletedAt_idx" ON "CompanyContact"("deletedAt");

-- CreateIndex
CREATE INDEX "CompanyLocation_tenantId_status_deletedAt_idx" ON "CompanyLocation"("tenantId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "CompanyLocation_companyId_type_status_deletedAt_idx" ON "CompanyLocation"("companyId", "type", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "CompanyLocation_branchId_idx" ON "CompanyLocation"("branchId");

-- CreateIndex
CREATE INDEX "CompanyLocation_geoCountryId_idx" ON "CompanyLocation"("geoCountryId");

-- CreateIndex
CREATE INDEX "CompanyLocation_geoAdmin1Id_idx" ON "CompanyLocation"("geoAdmin1Id");

-- CreateIndex
CREATE INDEX "CompanyLocation_geoAdmin2Id_idx" ON "CompanyLocation"("geoAdmin2Id");

-- CreateIndex
CREATE INDEX "CompanyLocation_geoAdmin3Id_idx" ON "CompanyLocation"("geoAdmin3Id");

-- CreateIndex
CREATE INDEX "CompanyLocation_deletedAt_idx" ON "CompanyLocation"("deletedAt");

-- CreateIndex
CREATE INDEX "CompanyDocument_tenantId_status_deletedAt_idx" ON "CompanyDocument"("tenantId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "CompanyDocument_companyId_type_status_deletedAt_idx" ON "CompanyDocument"("companyId", "type", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "CompanyDocument_companyLocationId_idx" ON "CompanyDocument"("companyLocationId");

-- CreateIndex
CREATE INDEX "CompanyDocument_fileAssetId_idx" ON "CompanyDocument"("fileAssetId");

-- CreateIndex
CREATE INDEX "CompanyDocument_expiresAt_deletedAt_idx" ON "CompanyDocument"("expiresAt", "deletedAt");

-- CreateIndex
CREATE INDEX "CompanyDocument_deletedAt_idx" ON "CompanyDocument"("deletedAt");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_defaultBillingLegalEntityId_fkey" FOREIGN KEY ("defaultBillingLegalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyContact" ADD CONSTRAINT "CompanyContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyContact" ADD CONSTRAINT "CompanyContact_personClientId_fkey" FOREIGN KEY ("personClientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLocation" ADD CONSTRAINT "CompanyLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLocation" ADD CONSTRAINT "CompanyLocation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLocation" ADD CONSTRAINT "CompanyLocation_geoCountryId_fkey" FOREIGN KEY ("geoCountryId") REFERENCES "GeoCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLocation" ADD CONSTRAINT "CompanyLocation_geoAdmin1Id_fkey" FOREIGN KEY ("geoAdmin1Id") REFERENCES "GeoAdmin1"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLocation" ADD CONSTRAINT "CompanyLocation_geoAdmin2Id_fkey" FOREIGN KEY ("geoAdmin2Id") REFERENCES "GeoAdmin2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLocation" ADD CONSTRAINT "CompanyLocation_geoAdmin3Id_fkey" FOREIGN KEY ("geoAdmin3Id") REFERENCES "GeoAdmin3"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
