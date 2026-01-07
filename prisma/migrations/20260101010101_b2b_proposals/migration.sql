-- CreateEnum
CREATE TYPE "B2BProposalStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "SequenceCounter" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SequenceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2BProposalDoc" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "sequenceYear" INTEGER NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "sequenceLabel" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "B2BProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "contentJson" JSONB,
    "contentText" TEXT,
    "totalDeclared" DECIMAL(14, 2),
    "lastPdfFileAssetId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BProposalDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SequenceCounter_key_key" ON "SequenceCounter"("key");

-- CreateIndex
CREATE UNIQUE INDEX "B2BProposalDoc_sequenceYear_sequenceNumber_key" ON "B2BProposalDoc"("sequenceYear", "sequenceNumber");

-- CreateIndex
CREATE INDEX "B2BProposalDoc_dealId_createdAt_idx" ON "B2BProposalDoc"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "B2BProposalDoc_status_idx" ON "B2BProposalDoc"("status");

-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "dealId" TEXT;

-- CreateIndex
CREATE INDEX "FileAsset_dealId_idx" ON "FileAsset"("dealId");

-- AddForeignKey
ALTER TABLE "B2BProposalDoc" ADD CONSTRAINT "B2BProposalDoc_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BProposalDoc" ADD CONSTRAINT "B2BProposalDoc_lastPdfFileAssetId_fkey" FOREIGN KEY ("lastPdfFileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BProposalDoc" ADD CONSTRAINT "B2BProposalDoc_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BProposalDoc" ADD CONSTRAINT "B2BProposalDoc_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
