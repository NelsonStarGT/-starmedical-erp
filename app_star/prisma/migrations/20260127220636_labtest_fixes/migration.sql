-- CreateEnum
CREATE TYPE "LabTestPriority" AS ENUM ('ROUTINE', 'URGENT', 'STAT');

-- CreateEnum
CREATE TYPE "LabTestStatus" AS ENUM ('REQUESTED', 'REQUIREMENTS_PENDING', 'READY_FOR_COLLECTION', 'COLLECTED', 'QUEUED', 'IN_PROCESS', 'RESULT_CAPTURED', 'TECH_VALIDATED', 'RELEASED', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabArea" AS ENUM ('HEMATOLOGY', 'CHEMISTRY', 'ELECTROLYTES', 'URINE', 'STOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "LabSampleType" AS ENUM ('BLOOD', 'URINE', 'STOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "LabMessageChannel" AS ENUM ('WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "LabMessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "LabMessagePurpose" AS ENUM ('CONTACT', 'RESULT');

-- CreateEnum
CREATE TYPE "LabInstrumentStatus" AS ENUM ('ONLINE', 'OFFLINE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "LabPatient" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "docId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabPatient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "patientId" TEXT,
    "labPatientId" TEXT,
    "priority" "LabTestPriority" NOT NULL DEFAULT 'ROUTINE',
    "status" "LabTestStatus" NOT NULL DEFAULT 'REQUESTED',
    "fastingRequired" BOOLEAN NOT NULL DEFAULT false,
    "fastingConfirmed" BOOLEAN,
    "requirementsNotes" TEXT,
    "areaHint" "LabArea",
    "branchId" TEXT,
    "createdById" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentById" TEXT,
    "sentChannel" "LabMessageChannel",
    "sentRecipient" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTestOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "area" "LabArea" NOT NULL,
    "status" "LabTestStatus" NOT NULL DEFAULT 'REQUESTED',
    "priority" "LabTestPriority" NOT NULL DEFAULT 'ROUTINE',
    "requirementsNotes" TEXT,
    "sampleId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSample" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "type" "LabSampleType" NOT NULL,
    "status" "LabTestStatus" NOT NULL DEFAULT 'READY_FOR_COLLECTION',
    "area" "LabArea",
    "fastingConfirmed" BOOLEAN,
    "collectedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestResult" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sampleId" TEXT,
    "status" "LabTestStatus" NOT NULL DEFAULT 'RESULT_CAPTURED',
    "valueText" TEXT,
    "valueNumber" DECIMAL(14,4),
    "unit" TEXT,
    "refLow" DECIMAL(12,4),
    "refHigh" DECIMAL(12,4),
    "flag" "LabResultFlag",
    "resultAt" TIMESTAMP(3),
    "enteredByUserId" TEXT,
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "area" "LabArea" NOT NULL,
    "html" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabMessageLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "channel" "LabMessageChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "LabMessageStatus" NOT NULL DEFAULT 'PENDING',
    "purpose" "LabMessagePurpose" NOT NULL DEFAULT 'CONTACT',
    "payloadJson" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabInstrument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" "LabArea" NOT NULL,
    "connectionStatus" "LabInstrumentStatus" NOT NULL DEFAULT 'UNKNOWN',
    "mappingJson" JSONB,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestSetting" (
    "id" TEXT NOT NULL DEFAULT 'labtest-default',
    "defaultMessage" TEXT,
    "slaRoutineMin" INTEGER NOT NULL DEFAULT 720,
    "slaUrgentMin" INTEGER NOT NULL DEFAULT 180,
    "slaStatMin" INTEGER NOT NULL DEFAULT 60,
    "defaultChannel" "LabMessageChannel" NOT NULL DEFAULT 'EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTestSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabTestOrder_code_key" ON "LabTestOrder"("code");

-- CreateIndex
CREATE INDEX "LabTestOrder_status_idx" ON "LabTestOrder"("status");

-- CreateIndex
CREATE INDEX "LabTestOrder_priority_idx" ON "LabTestOrder"("priority");

-- CreateIndex
CREATE INDEX "LabTestOrder_branchId_idx" ON "LabTestOrder"("branchId");

-- CreateIndex
CREATE INDEX "LabTestItem_orderId_idx" ON "LabTestItem"("orderId");

-- CreateIndex
CREATE INDEX "LabTestItem_area_idx" ON "LabTestItem"("area");

-- CreateIndex
CREATE INDEX "LabTestItem_status_idx" ON "LabTestItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LabSample_barcode_key" ON "LabSample"("barcode");

-- CreateIndex
CREATE INDEX "LabSample_status_idx" ON "LabSample"("status");

-- CreateIndex
CREATE INDEX "LabTestResult_itemId_idx" ON "LabTestResult"("itemId");

-- CreateIndex
CREATE INDEX "LabTestResult_flag_idx" ON "LabTestResult"("flag");

-- CreateIndex
CREATE INDEX "LabMessageLog_channel_idx" ON "LabMessageLog"("channel");

-- CreateIndex
CREATE INDEX "LabMessageLog_status_idx" ON "LabMessageLog"("status");

-- CreateIndex
CREATE INDEX "LabMessageLog_purpose_idx" ON "LabMessageLog"("purpose");

-- AddForeignKey
ALTER TABLE "LabTestOrder" ADD CONSTRAINT "LabTestOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestOrder" ADD CONSTRAINT "LabTestOrder_labPatientId_fkey" FOREIGN KEY ("labPatientId") REFERENCES "LabPatient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestOrder" ADD CONSTRAINT "LabTestOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestOrder" ADD CONSTRAINT "LabTestOrder_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestItem" ADD CONSTRAINT "LabTestItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LabTestOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestItem" ADD CONSTRAINT "LabTestItem_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "LabSample"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestItem" ADD CONSTRAINT "LabTestItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LabTestOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestResult" ADD CONSTRAINT "LabTestResult_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "LabTestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestResult" ADD CONSTRAINT "LabTestResult_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "LabSample"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestResult" ADD CONSTRAINT "LabTestResult_enteredByUserId_fkey" FOREIGN KEY ("enteredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestResult" ADD CONSTRAINT "LabTestResult_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTemplate" ADD CONSTRAINT "LabTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabMessageLog" ADD CONSTRAINT "LabMessageLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LabTestOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabMessageLog" ADD CONSTRAINT "LabMessageLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabInstrument" ADD CONSTRAINT "LabInstrument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
