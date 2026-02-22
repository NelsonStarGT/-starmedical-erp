/*
  Warnings:

  - You are about to drop the column `supplierId` on the `Payable` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Payable` table. The data in that column could be lost. The data in that column will be cast from `Decimal(14,2)` to `Decimal(12,2)`.
  - You are about to alter the column `paidAmount` on the `Payable` table. The data in that column could be lost. The data in that column will be cast from `Decimal(14,2)` to `Decimal(12,2)`.
  - The `status` column on the `Payable` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `amount` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(14,2)` to `Decimal(12,2)`.
  - You are about to drop the column `clientId` on the `Receivable` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Receivable` table. The data in that column could be lost. The data in that column will be cast from `Decimal(14,2)` to `Decimal(12,2)`.
  - You are about to alter the column `paidAmount` on the `Receivable` table. The data in that column could be lost. The data in that column will be cast from `Decimal(14,2)` to `Decimal(12,2)`.
  - The `status` column on the `Receivable` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `legalEntityId` to the `FinancialAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `legalEntityId` to the `Payable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partyId` to the `Payable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `legalEntityId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `method` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `legalEntityId` to the `Receivable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partyId` to the `Receivable` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CLIENT', 'PROVIDER', 'PROFESSIONAL', 'INSURER', 'OTHER');

-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "CreditTerm" AS ENUM ('CASH', 'DAYS_15', 'DAYS_30', 'DAYS_45', 'DAYS_60', 'DAYS_90', 'OTHER');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'POS', 'CHECK', 'OTHER');

-- AlterEnum
ALTER TYPE "FinancialAccountType" ADD VALUE 'POS';

-- AlterTable
ALTER TABLE "FinancialAccount" ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "legalEntityId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "legalEntityId" TEXT,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceType" TEXT;

-- AlterTable
ALTER TABLE "Payable" DROP COLUMN "supplierId",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "legalEntityId" TEXT NOT NULL,
ADD COLUMN     "partyId" TEXT NOT NULL,
ADD COLUMN     "subcategoryId" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "paidAmount" SET DATA TYPE DECIMAL(12,2),
DROP COLUMN "status",
ADD COLUMN     "status" "DocStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "legalEntityId" TEXT NOT NULL,
ADD COLUMN     "method" "PaymentMethod" NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Receivable" DROP COLUMN "clientId",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "creditTerm" "CreditTerm" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "legalEntityId" TEXT NOT NULL,
ADD COLUMN     "partyId" TEXT NOT NULL,
ADD COLUMN     "subcategoryId" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "paidAmount" SET DATA TYPE DECIMAL(12,2),
DROP COLUMN "status",
ADD COLUMN     "status" "DocStatus" NOT NULL DEFAULT 'OPEN';

-- DropEnum
DROP TYPE "PayableStatus";

-- DropEnum
DROP TYPE "ReceivableStatus";

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comercialName" TEXT,
    "nit" TEXT,
    "fiscalAddress" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "type" "PartyType" NOT NULL,
    "name" TEXT NOT NULL,
    "nit" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "id" TEXT NOT NULL,
    "flowType" "FlowType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAttachment" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,
    "receivableId" TEXT,
    "payableId" TEXT,
    "paymentId" TEXT,

    CONSTRAINT "FinanceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCategory_slug_key" ON "FinanceCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceSubcategory_slug_key" ON "FinanceSubcategory"("slug");

-- CreateIndex
CREATE INDEX "FinancialAccount_legalEntityId_idx" ON "FinancialAccount"("legalEntityId");

-- CreateIndex
CREATE INDEX "Payable_legalEntityId_idx" ON "Payable"("legalEntityId");

-- CreateIndex
CREATE INDEX "Payable_partyId_idx" ON "Payable"("partyId");

-- CreateIndex
CREATE INDEX "Receivable_legalEntityId_idx" ON "Receivable"("legalEntityId");

-- CreateIndex
CREATE INDEX "Receivable_partyId_idx" ON "Receivable"("partyId");

-- AddForeignKey
ALTER TABLE "FinanceSubcategory" ADD CONSTRAINT "FinanceSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAttachment" ADD CONSTRAINT "FinanceAttachment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAttachment" ADD CONSTRAINT "FinanceAttachment_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "Payable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAttachment" ADD CONSTRAINT "FinanceAttachment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "FinanceSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "FinanceSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
