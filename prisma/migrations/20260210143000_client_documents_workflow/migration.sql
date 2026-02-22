-- CreateEnum
CREATE TYPE "ClientDocumentApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ClientDocument"
  ADD COLUMN "approvalStatus" "ClientDocumentApprovalStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedByUserId" TEXT,
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedByUserId" TEXT,
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "supersededAt" TIMESTAMP(3),
  ADD COLUMN "supersededByDocumentId" TEXT;

-- Data backfill defaults for legacy records
UPDATE "ClientDocument"
SET "approvalStatus" = 'PENDING'
WHERE "approvalStatus" IS NULL;

UPDATE "ClientDocument"
SET "version" = 1
WHERE "version" IS NULL;

-- CreateTable
CREATE TABLE "ClientAuditEvent" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorUserId" TEXT,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB,

  CONSTRAINT "ClientAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientDocument_clientId_approvalStatus_idx" ON "ClientDocument"("clientId", "approvalStatus");

-- CreateIndex
CREATE INDEX "ClientDocument_clientId_expiresAt_idx" ON "ClientDocument"("clientId", "expiresAt");

-- CreateIndex
CREATE INDEX "ClientDocument_supersededByDocumentId_idx" ON "ClientDocument"("supersededByDocumentId");

-- CreateIndex
CREATE INDEX "ClientAuditEvent_clientId_timestamp_idx" ON "ClientAuditEvent"("clientId", "timestamp");

-- CreateIndex
CREATE INDEX "ClientAuditEvent_action_idx" ON "ClientAuditEvent"("action");

-- CreateIndex
CREATE INDEX "ClientAuditEvent_actorUserId_idx" ON "ClientAuditEvent"("actorUserId");

-- AddForeignKey
ALTER TABLE "ClientDocument"
ADD CONSTRAINT "ClientDocument_approvedByUserId_fkey"
FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument"
ADD CONSTRAINT "ClientDocument_rejectedByUserId_fkey"
FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument"
ADD CONSTRAINT "ClientDocument_supersededByDocumentId_fkey"
FOREIGN KEY ("supersededByDocumentId") REFERENCES "ClientDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAuditEvent"
ADD CONSTRAINT "ClientAuditEvent_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAuditEvent"
ADD CONSTRAINT "ClientAuditEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
