-- Diagnostics module (LIS/RIS) core schema.

-- CreateEnum
CREATE TYPE "DiagnosticOrderStatus" AS ENUM ('DRAFT', 'PAID', 'IN_PROGRESS', 'READY', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiagnosticItemKind" AS ENUM ('LAB', 'IMAGING');

-- CreateEnum
CREATE TYPE "DiagnosticItemStatus" AS ENUM ('ORDERED', 'COLLECTED', 'IN_ANALYSIS', 'PENDING_VALIDATION', 'VALIDATED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImagingModality" AS ENUM ('XR', 'US', 'CT', 'MR');

-- CreateEnum
CREATE TYPE "LabResultFlag" AS ENUM ('NORMAL', 'HIGH', 'LOW', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SIGNED', 'RELEASED');

-- CreateEnum
CREATE TYPE "IntegrationInboxStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "DiagnosticOrder" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "status" "DiagnosticOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "totalAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticCatalogItem" (
    "id" TEXT NOT NULL,
    "kind" "DiagnosticItemKind" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "modality" "ImagingModality",
    "unit" TEXT,
    "refLow" DECIMAL(12, 4),
    "refHigh" DECIMAL(12, 4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "DiagnosticItemKind" NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "status" "DiagnosticItemStatus" NOT NULL DEFAULT 'ORDERED',
    "priority" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSpecimen" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "specimenCode" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3),
    "collectedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabSpecimen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "testCode" TEXT,
    "valueText" TEXT,
    "valueNumber" DECIMAL(14, 4),
    "unit" TEXT,
    "refLow" DECIMAL(12, 4),
    "refHigh" DECIMAL(12, 4),
    "flag" "LabResultFlag",
    "resultAt" TIMESTAMP(3),
    "enteredByUserId" TEXT,
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingStudy" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "modality" "ImagingModality" NOT NULL,
    "orthancStudyId" TEXT,
    "studyInstanceUID" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagingStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingReport" (
    "id" TEXT NOT NULL,
    "imagingStudyId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "findings" TEXT,
    "impression" TEXT,
    "createdByUserId" TEXT,
    "signedByUserId" TEXT,
    "signedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImagingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationInbox" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "patientExternalId" TEXT,
    "status" "IntegrationInboxStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "IntegrationInbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagnosticOrder_status_idx" ON "DiagnosticOrder"("status");

-- CreateIndex
CREATE INDEX "DiagnosticOrder_orderedAt_idx" ON "DiagnosticOrder"("orderedAt");

-- CreateIndex
CREATE INDEX "DiagnosticOrder_branchId_idx" ON "DiagnosticOrder"("branchId");

-- CreateIndex
CREATE INDEX "DiagnosticOrder_patientId_idx" ON "DiagnosticOrder"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticCatalogItem_code_key" ON "DiagnosticCatalogItem"("code");

-- CreateIndex
CREATE INDEX "DiagnosticCatalogItem_kind_idx" ON "DiagnosticCatalogItem"("kind");

-- CreateIndex
CREATE INDEX "DiagnosticCatalogItem_isActive_idx" ON "DiagnosticCatalogItem"("isActive");

-- CreateIndex
CREATE INDEX "DiagnosticOrderItem_orderId_idx" ON "DiagnosticOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "DiagnosticOrderItem_status_idx" ON "DiagnosticOrderItem"("status");

-- CreateIndex
CREATE INDEX "DiagnosticOrderItem_kind_idx" ON "DiagnosticOrderItem"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "LabSpecimen_orderItemId_key" ON "LabSpecimen"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LabSpecimen_specimenCode_key" ON "LabSpecimen"("specimenCode");

-- CreateIndex
CREATE INDEX "LabResult_orderItemId_idx" ON "LabResult"("orderItemId");

-- CreateIndex
CREATE INDEX "LabResult_flag_idx" ON "LabResult"("flag");

-- CreateIndex
CREATE UNIQUE INDEX "ImagingStudy_orderItemId_key" ON "ImagingStudy"("orderItemId");

-- CreateIndex
CREATE INDEX "ImagingStudy_orthancStudyId_idx" ON "ImagingStudy"("orthancStudyId");

-- CreateIndex
CREATE INDEX "ImagingReport_status_idx" ON "ImagingReport"("status");

-- CreateIndex
CREATE INDEX "ImagingReport_imagingStudyId_idx" ON "ImagingReport"("imagingStudyId");

-- CreateIndex
CREATE INDEX "IntegrationInbox_status_idx" ON "IntegrationInbox"("status");

-- CreateIndex
CREATE INDEX "IntegrationInbox_source_idx" ON "IntegrationInbox"("source");

-- AddForeignKey
ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrderItem" ADD CONSTRAINT "DiagnosticOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DiagnosticOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrderItem" ADD CONSTRAINT "DiagnosticOrderItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "DiagnosticCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSpecimen" ADD CONSTRAINT "LabSpecimen_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "DiagnosticOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSpecimen" ADD CONSTRAINT "LabSpecimen_collectedByUserId_fkey" FOREIGN KEY ("collectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "DiagnosticOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_enteredByUserId_fkey" FOREIGN KEY ("enteredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingStudy" ADD CONSTRAINT "ImagingStudy_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "DiagnosticOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingReport" ADD CONSTRAINT "ImagingReport_imagingStudyId_fkey" FOREIGN KEY ("imagingStudyId") REFERENCES "ImagingStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingReport" ADD CONSTRAINT "ImagingReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingReport" ADD CONSTRAINT "ImagingReport_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
