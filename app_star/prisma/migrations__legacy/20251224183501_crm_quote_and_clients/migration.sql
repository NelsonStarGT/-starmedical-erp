/*
  Warnings:

  - You are about to drop the column `paymentTerms` on the `CrmAccount` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `CrmAccount` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `CrmActivity` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `CrmContact` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `CrmContact` table. All the data in the column will be lost.
  - You are about to drop the column `whatsapp` on the `CrmContact` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `CrmDeal` table. All the data in the column will be lost.
  - You are about to drop the column `closeDate` on the `CrmDeal` table. All the data in the column will be lost.
  - You are about to drop the column `probability` on the `CrmDeal` table. All the data in the column will be lost.
  - The `stage` column on the `CrmDeal` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `name` on the `CrmLead` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `CrmContact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `CrmLead` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CrmDealStage" AS ENUM ('NEW', 'CONTACTED', 'QUOTE_SENT', 'NEGOTIATION', 'APPROVED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "CrmQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'WON');

-- CreateEnum
CREATE TYPE "CrmQuoteItemType" AS ENUM ('PRODUCT', 'SERVICE', 'COMBO');

-- CreateEnum
CREATE TYPE "ClientProfileType" AS ENUM ('PERSON', 'COMPANY');

-- AlterEnum
ALTER TYPE "CrmActivityType" ADD VALUE 'NOTE';

-- AlterTable
ALTER TABLE "CrmAccount" DROP COLUMN "paymentTerms",
DROP COLUMN "size",
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "creditTerm" TEXT,
ADD COLUMN     "nit" TEXT,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "CrmActivity" DROP COLUMN "result",
ADD COLUMN     "nextStepDateTime" TIMESTAMP(3),
ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "CrmContact" DROP COLUMN "name",
DROP COLUMN "title",
DROP COLUMN "whatsapp",
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'PERSON';

-- AlterTable
ALTER TABLE "CrmDeal" DROP COLUMN "amount",
DROP COLUMN "closeDate",
DROP COLUMN "probability",
ADD COLUMN     "amountEstimated" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "expectedCloseDate" TIMESTAMP(3),
ADD COLUMN     "lostReason" TEXT,
ADD COLUMN     "probabilityPct" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "source" TEXT,
DROP COLUMN "stage",
ADD COLUMN     "stage" "CrmDealStage" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "CrmLead" DROP COLUMN "name",
ADD COLUMN     "fullName" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "type" "ClientProfileType" NOT NULL,
    "companyName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "nit" TEXT,
    "dpi" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmQuote" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "quoteNumber" INTEGER NOT NULL,
    "status" "CrmQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "internalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "internalMargin" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmQuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "itemType" "CrmQuoteItemType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "costTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "marginTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "CrmQuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_nit_key" ON "ClientProfile"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_dpi_key" ON "ClientProfile"("dpi");

-- CreateIndex
CREATE INDEX "ClientProfile_email_phone_idx" ON "ClientProfile"("email", "phone");

-- CreateIndex
CREATE INDEX "CrmQuote_dealId_idx" ON "CrmQuote"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmQuote_quoteNumber_key" ON "CrmQuote"("quoteNumber");

-- CreateIndex
CREATE INDEX "CrmQuoteItem_quoteId_idx" ON "CrmQuoteItem"("quoteId");

-- CreateIndex
CREATE INDEX "CrmAccount_nit_idx" ON "CrmAccount"("nit");

-- CreateIndex
CREATE INDEX "CrmAccount_ownerId_idx" ON "CrmAccount"("ownerId");

-- CreateIndex
CREATE INDEX "CrmContact_email_phone_idx" ON "CrmContact"("email", "phone");

-- CreateIndex
CREATE INDEX "CrmDeal_pipelineType_stage_idx" ON "CrmDeal"("pipelineType", "stage");

-- AddForeignKey
ALTER TABLE "CrmAccount" ADD CONSTRAINT "CrmAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmQuote" ADD CONSTRAINT "CrmQuote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmQuoteItem" ADD CONSTRAINT "CrmQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "CrmQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
