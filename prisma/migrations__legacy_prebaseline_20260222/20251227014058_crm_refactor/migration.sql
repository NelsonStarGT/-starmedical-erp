/*
  Warnings:

  - The values [MEETING] on the enum `CrmActivityType` will be removed. If these variants are still used in the database, this will fail.
  - The values [NEW,CONTACTED,QUOTE_SENT,NEGOTIATION,APPROVED,WON,LOST] on the enum `CrmDealStage` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[dealId,sequence]` on the table `CrmQuote` will be added. If there are existing duplicate values, this will fail.

*/

-- CreateEnum
CREATE TYPE "CrmSlaStatus" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "CrmServiceType" AS ENUM ('BOTIQUINES', 'EXTINTORES', 'CAPACITACIONES', 'CLINICAS_EMPRESARIALES', 'SSO', 'SERVICIOS_MEDICOS', 'CONSULTAS', 'LABORATORIO', 'RAYOS_X', 'ULTRASONIDO', 'MEMBRESIAS');

-- AlterEnum CrmActivityType with mapping
BEGIN;
CREATE TYPE "CrmActivityType_new" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL', 'VISIT', 'NOTE', 'SYSTEM');
ALTER TABLE "CrmActivity" ALTER COLUMN "type" TYPE "CrmActivityType_new" USING (
  CASE "type"::text
    WHEN 'CALL' THEN 'CALL'::"CrmActivityType_new"
    WHEN 'WHATSAPP' THEN 'WHATSAPP'::"CrmActivityType_new"
    WHEN 'EMAIL' THEN 'EMAIL'::"CrmActivityType_new"
    WHEN 'MEETING' THEN 'VISIT'::"CrmActivityType_new"
    WHEN 'NOTE' THEN 'NOTE'::"CrmActivityType_new"
    ELSE 'SYSTEM'::"CrmActivityType_new"
  END
);
ALTER TYPE "CrmActivityType" RENAME TO "CrmActivityType_old";
ALTER TYPE "CrmActivityType_new" RENAME TO "CrmActivityType";
DROP TYPE "CrmActivityType_old";
COMMIT;

-- AlterEnum CrmDealStage with mapping
BEGIN;
CREATE TYPE "CrmDealStage_new" AS ENUM ('NUEVO', 'CONTACTADO', 'DIAGNOSTICO', 'COTIZACION', 'NEGOCIACION', 'GANADO', 'PERDIDO');
ALTER TABLE "CrmDeal" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "CrmDeal" ALTER COLUMN "stage" TYPE "CrmDealStage_new" USING (
  CASE "stage"::text
    WHEN 'NEW' THEN 'NUEVO'::"CrmDealStage_new"
    WHEN 'CONTACTED' THEN 'CONTACTADO'::"CrmDealStage_new"
    WHEN 'QUOTE_SENT' THEN 'COTIZACION'::"CrmDealStage_new"
    WHEN 'NEGOTIATION' THEN 'NEGOCIACION'::"CrmDealStage_new"
    WHEN 'APPROVED' THEN 'GANADO'::"CrmDealStage_new"
    WHEN 'WON' THEN 'GANADO'::"CrmDealStage_new"
    WHEN 'LOST' THEN 'PERDIDO'::"CrmDealStage_new"
    ELSE 'NUEVO'::"CrmDealStage_new"
  END
);
ALTER TYPE "CrmDealStage" RENAME TO "CrmDealStage_old";
ALTER TYPE "CrmDealStage_new" RENAME TO "CrmDealStage";
DROP TYPE "CrmDealStage_old";
ALTER TABLE "CrmDeal" ALTER COLUMN "stage" SET DEFAULT 'NUEVO';
COMMIT;

-- AlterEnum
ALTER TYPE "CrmQuoteItemType" ADD VALUE IF NOT EXISTS 'MANUAL';

-- AlterTable
ALTER TABLE "CrmCalendarEvent" ADD COLUMN "dealId" TEXT;

-- AlterTable
ALTER TABLE "CrmDeal" ADD COLUMN "competitor" TEXT,
ADD COLUMN "nextAction" TEXT,
ADD COLUMN "nextActionAt" TIMESTAMP(3),
ADD COLUMN "pipelineId" TEXT,
ADD COLUMN "slaStatus" "CrmSlaStatus" NOT NULL DEFAULT 'GREEN',
ADD COLUMN "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "stage" SET DEFAULT 'NUEVO';

-- AlterTable
ALTER TABLE "CrmQuote" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sequence" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "versionLabel" TEXT;

-- AlterTable
ALTER TABLE "CrmQuoteItem" ADD COLUMN "discountPct" INTEGER,
ADD COLUMN "manualDescription" TEXT,
ADD COLUMN "manualUnitPrice" DECIMAL(12,2),
ALTER COLUMN "itemId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CrmPipeline" (
    "id" TEXT NOT NULL,
    "type" "CrmPipelineType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CrmPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "stage" "CrmDealStage" NOT NULL,
    "probabilityPct" INTEGER NOT NULL,
    "slaDays" INTEGER NOT NULL,
    "expectedActions" JSONB,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CrmPipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDealStageHistory" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStage" "CrmDealStage",
    "toStage" "CrmDealStage" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,
    "comment" TEXT,

    CONSTRAINT "CrmDealStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDealServiceInterest" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "serviceType" "CrmServiceType" NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "CrmDealServiceInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmPipeline_type_idx" ON "CrmPipeline"("type");

-- CreateIndex
CREATE INDEX "CrmPipelineStage_pipelineId_order_idx" ON "CrmPipelineStage"("pipelineId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPipelineStage_pipelineId_stage_key" ON "CrmPipelineStage"("pipelineId", "stage");

-- CreateIndex
CREATE INDEX "CrmDealStageHistory_dealId_changedAt_idx" ON "CrmDealStageHistory"("dealId", "changedAt");

-- CreateIndex
CREATE INDEX "CrmDealServiceInterest_dealId_idx" ON "CrmDealServiceInterest"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmDealServiceInterest_dealId_serviceType_key" ON "CrmDealServiceInterest"("dealId", "serviceType");

-- CreateIndex
CREATE INDEX "CrmCalendarEvent_dealId_idx" ON "CrmCalendarEvent"("dealId");

-- CreateIndex
CREATE INDEX "CrmDeal_pipelineId_idx" ON "CrmDeal"("pipelineId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmQuote_dealId_sequence_key" ON "CrmQuote"("dealId", "sequence");

-- AddForeignKey
ALTER TABLE "CrmPipelineStage" ADD CONSTRAINT "CrmPipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmPipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDealStageHistory" ADD CONSTRAINT "CrmDealStageHistory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDealServiceInterest" ADD CONSTRAINT "CrmDealServiceInterest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCalendarEvent" ADD CONSTRAINT "CrmCalendarEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
