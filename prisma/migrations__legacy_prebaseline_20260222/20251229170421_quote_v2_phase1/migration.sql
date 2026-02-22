-- CreateEnum
CREATE TYPE "QuoteType" AS ENUM ('B2B', 'B2C');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVAL_PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('PENDING', 'QUOTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CrmRequestStatus" AS ENUM ('PENDIENTE', 'COTIZADA');

-- AlterTable
ALTER TABLE "CrmQuote" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "rejectedReason" TEXT;

-- CreateTable
CREATE TABLE "CrmRequest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "services" "CrmServiceType"[],
    "description" TEXT NOT NULL,
    "status" "CrmRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmQuoteRequest" (
    "quoteId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "CrmQuoteRequest_pkey" PRIMARY KEY ("quoteId","requestId")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "QuoteType" NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "number" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "sentAt" TIMESTAMP(3),
    "approvalRequestedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "templateId" TEXT,
    "notes" TEXT,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pdfUrl" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "refCode" TEXT,
    "description" TEXT,
    "qty" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discountPct" DECIMAL(5,2),
    "lineTotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "QuoteType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sectionsJson" JSONB,
    "headerJson" JSONB,
    "coverImageUrl" TEXT,
    "introLetterHtml" TEXT,
    "experienceLogosJson" JSONB,
    "termsHtml" TEXT,
    "bankAccountsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultTemplateB2BId" TEXT,
    "defaultTemplateB2CId" TEXT,
    "defaultValidityDays" INTEGER NOT NULL DEFAULT 30,
    "defaultIntroLetterHtml" TEXT,
    "defaultTermsB2BHtml" TEXT,
    "defaultTermsB2CHtml" TEXT,
    "defaultFooterJson" JSONB,
    "defaultBankAccountsJson" JSONB,
    "defaultChequePayableTo" TEXT,
    "defaultPaymentTerms" TEXT,
    "defaultDeliveryTime" TEXT,
    "defaultDeliveryNote" TEXT,
    "showTaxIncludedText" BOOLEAN NOT NULL DEFAULT true,
    "showBankBlock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "services" "CrmServiceType"[],
    "description" TEXT NOT NULL,
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'PENDING',
    "quoteId" TEXT,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmRequest_dealId_status_idx" ON "CrmRequest"("dealId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE INDEX "Quote_dealId_idx" ON "Quote"("dealId");

-- CreateIndex
CREATE INDEX "Quote_dealId_status_idx" ON "Quote"("dealId", "status");

-- CreateIndex
CREATE INDEX "Quote_dealId_isActive_idx" ON "Quote"("dealId", "isActive");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteRequest_dealId_idx" ON "QuoteRequest"("dealId");

-- CreateIndex
CREATE INDEX "QuoteRequest_quoteId_idx" ON "QuoteRequest"("quoteId");

-- AddForeignKey
ALTER TABLE "CrmRequest" ADD CONSTRAINT "CrmRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmQuoteRequest" ADD CONSTRAINT "CrmQuoteRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "CrmQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmQuoteRequest" ADD CONSTRAINT "CrmQuoteRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CrmRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuoteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteSettings" ADD CONSTRAINT "QuoteSettings_defaultTemplateB2BId_fkey" FOREIGN KEY ("defaultTemplateB2BId") REFERENCES "QuoteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteSettings" ADD CONSTRAINT "QuoteSettings_defaultTemplateB2CId_fkey" FOREIGN KEY ("defaultTemplateB2CId") REFERENCES "QuoteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
