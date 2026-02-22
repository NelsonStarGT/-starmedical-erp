-- AlterEnum
ALTER TYPE "ClientProfileType" ADD VALUE 'INSURER';

-- CreateEnum
CREATE TYPE "ClientAffiliationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ClientAffiliationPayerType" AS ENUM ('PERSON', 'COMPANY', 'INSTITUTION', 'INSURER');

-- CreateTable
CREATE TABLE "ClientAffiliation" (
    "id" TEXT NOT NULL,
    "personClientId" TEXT NOT NULL,
    "entityClientId" TEXT NOT NULL,
    "role" TEXT,
    "status" "ClientAffiliationStatus" NOT NULL DEFAULT 'ACTIVE',
    "payerType" "ClientAffiliationPayerType" NOT NULL DEFAULT 'PERSON',
    "payerClientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientAffiliation_personClientId_entityClientId_key" ON "ClientAffiliation"("personClientId", "entityClientId");

-- CreateIndex
CREATE INDEX "ClientAffiliation_personClientId_idx" ON "ClientAffiliation"("personClientId");

-- CreateIndex
CREATE INDEX "ClientAffiliation_entityClientId_idx" ON "ClientAffiliation"("entityClientId");

-- CreateIndex
CREATE INDEX "ClientAffiliation_payerClientId_idx" ON "ClientAffiliation"("payerClientId");

-- CreateIndex
CREATE INDEX "ClientAffiliation_status_idx" ON "ClientAffiliation"("status");

-- AddForeignKey
ALTER TABLE "ClientAffiliation" ADD CONSTRAINT "ClientAffiliation_personClientId_fkey" FOREIGN KEY ("personClientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAffiliation" ADD CONSTRAINT "ClientAffiliation_entityClientId_fkey" FOREIGN KEY ("entityClientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAffiliation" ADD CONSTRAINT "ClientAffiliation_payerClientId_fkey" FOREIGN KEY ("payerClientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

