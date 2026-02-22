-- CreateEnum
CREATE TYPE "ClientCatalogType" AS ENUM ('INSTITUTION_TYPE', 'SECTOR', 'CLIENT_STATUS', 'RELATION_TYPE', 'PAYMENT_TERM', 'DOCUMENT_TYPE');

-- CreateEnum
CREATE TYPE "ClientLocationType" AS ENUM ('GENERAL', 'HOME', 'WORK', 'BUSINESS', 'OTHER');

-- AlterEnum
ALTER TYPE "ClientProfileType" ADD VALUE 'INSTITUTION';

-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "institutionTypeId" TEXT,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "paymentTermId" TEXT,
ADD COLUMN     "relationTypeId" TEXT,
ADD COLUMN     "secondLastName" TEXT,
ADD COLUMN     "sectorId" TEXT,
ADD COLUMN     "statusId" TEXT,
ADD COLUMN     "tradeName" TEXT;

-- CreateTable
CREATE TABLE "ClientCatalogItem" (
    "id" TEXT NOT NULL,
    "type" "ClientCatalogType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientDocument" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "documentTypeId" TEXT,
    "title" TEXT NOT NULL,
    "fileAssetId" TEXT,
    "fileUrl" TEXT,
    "originalName" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLocation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "ClientLocationType" NOT NULL,
    "label" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "department" TEXT,
    "country" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "role" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRulesConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "alertDays30" INTEGER NOT NULL DEFAULT 30,
    "alertDays15" INTEGER NOT NULL DEFAULT 15,
    "alertDays7" INTEGER NOT NULL DEFAULT 7,
    "requiredDocsJson" JSONB,
    "requiredFieldsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRulesConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientCatalogItem_type_isActive_idx" ON "ClientCatalogItem"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCatalogItem_type_name_key" ON "ClientCatalogItem"("type", "name");

-- CreateIndex
CREATE INDEX "ClientDocument_clientId_createdAt_idx" ON "ClientDocument"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientDocument_expiresAt_idx" ON "ClientDocument"("expiresAt");

-- CreateIndex
CREATE INDEX "ClientDocument_documentTypeId_idx" ON "ClientDocument"("documentTypeId");

-- CreateIndex
CREATE INDEX "ClientLocation_clientId_type_idx" ON "ClientLocation"("clientId", "type");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_idx" ON "ClientContact"("clientId");

-- CreateIndex
CREATE INDEX "ClientNote_clientId_createdAt_idx" ON "ClientNote"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_institutionTypeId_fkey" FOREIGN KEY ("institutionTypeId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_relationTypeId_fkey" FOREIGN KEY ("relationTypeId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "ClientCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLocation" ADD CONSTRAINT "ClientLocation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
