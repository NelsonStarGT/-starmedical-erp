-- CreateEnum
CREATE TYPE "QuoteDeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "QuoteDeliveryStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'PENDING_PROVIDER');

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteDelivery" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "dealId" TEXT,
    "channel" "QuoteDeliveryChannel" NOT NULL,
    "to" JSONB NOT NULL,
    "cc" JSONB,
    "bcc" JSONB,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "pdfUrl" TEXT NOT NULL,
    "pdfHash" TEXT NOT NULL,
    "pdfVersion" INTEGER NOT NULL DEFAULT 1,
    "fileAssetId" TEXT,
    "status" "QuoteDeliveryStatus" NOT NULL DEFAULT 'SENDING',
    "provider" TEXT NOT NULL DEFAULT 'SMTP',
    "providerMessageId" TEXT,
    "actorUserId" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");

-- CreateIndex
CREATE INDEX "QuoteDelivery_quoteId_createdAt_idx" ON "QuoteDelivery"("quoteId", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteDelivery_status_idx" ON "QuoteDelivery"("status");

-- CreateIndex
CREATE INDEX "QuoteDelivery_providerMessageId_idx" ON "QuoteDelivery"("providerMessageId");

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDelivery" ADD CONSTRAINT "QuoteDelivery_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
