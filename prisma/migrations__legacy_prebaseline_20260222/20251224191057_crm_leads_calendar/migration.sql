/*
  Warnings:

  - You are about to drop the column `fullName` on the `CrmLead` table. All the data in the column will be lost.
  - The `status` column on the `CrmLead` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `leadType` to the `CrmLead` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CrmLeadType" AS ENUM ('COMPANY', 'PATIENT');

-- CreateEnum
CREATE TYPE "CrmLeadStatus" AS ENUM ('NEW', 'QUOTED', 'FOLLOW_UP', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "CrmCalendarEventType" AS ENUM ('VISITA', 'REUNION_VIRTUAL', 'LLAMADA', 'SEGUIMIENTO');

-- AlterTable
ALTER TABLE "CrmLead" DROP COLUMN "fullName",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "leadType" "CrmLeadType" NOT NULL,
ADD COLUMN     "nextActionAt" TIMESTAMP(3),
ADD COLUMN     "nit" TEXT,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "personDpi" TEXT,
ADD COLUMN     "personName" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "CrmLeadStatus" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "CrmQuote" ADD COLUMN     "leadId" TEXT,
ALTER COLUMN "dealId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CrmCalendarEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "quoteId" TEXT,
    "type" "CrmCalendarEventType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "ownerId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmCalendarEvent_leadId_idx" ON "CrmCalendarEvent"("leadId");

-- CreateIndex
CREATE INDEX "CrmCalendarEvent_quoteId_idx" ON "CrmCalendarEvent"("quoteId");

-- CreateIndex
CREATE INDEX "CrmCalendarEvent_type_startAt_idx" ON "CrmCalendarEvent"("type", "startAt");

-- CreateIndex
CREATE INDEX "CrmLead_leadType_status_idx" ON "CrmLead"("leadType", "status");

-- CreateIndex
CREATE INDEX "CrmLead_nit_idx" ON "CrmLead"("nit");

-- CreateIndex
CREATE INDEX "CrmLead_personDpi_idx" ON "CrmLead"("personDpi");

-- CreateIndex
CREATE INDEX "CrmQuote_leadId_idx" ON "CrmQuote"("leadId");

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmQuote" ADD CONSTRAINT "CrmQuote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCalendarEvent" ADD CONSTRAINT "CrmCalendarEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCalendarEvent" ADD CONSTRAINT "CrmCalendarEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "CrmQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
