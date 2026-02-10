-- CreateEnum
CREATE TYPE "PortalPaymentStatus" AS ENUM ('NONE', 'PENDING', 'PAID');

-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'REQUESTED';

-- AlterTable
ALTER TABLE "Appointment"
  ADD COLUMN "paymentIntentId" TEXT,
  ADD COLUMN "portalPaymentStatus" "PortalPaymentStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "ClientProfile"
  ADD COLUMN "partyId" TEXT;

-- AlterTable
ALTER TABLE "PortalSession"
  ADD COLUMN "refreshTokenHash" TEXT,
  ADD COLUMN "refreshExpiresAt" TIMESTAMP(3),
  ADD COLUMN "refreshConsumedAt" TIMESTAMP(3),
  ADD COLUMN "lastRotatedAt" TIMESTAMP(3),
  ADD COLUMN "rotationCounter" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PortalSessionRotationLog" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "usedRefreshTokenHash" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT,
  "userAgentHash" TEXT,

  CONSTRAINT "PortalSessionRotationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalRateLimitBucket" (
  "id" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PortalRateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientProfile_partyId_idx" ON "ClientProfile"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalSession_refreshTokenHash_key" ON "PortalSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "PortalSession_refreshExpiresAt_idx" ON "PortalSession"("refreshExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortalSessionRotationLog_usedRefreshTokenHash_key" ON "PortalSessionRotationLog"("usedRefreshTokenHash");

-- CreateIndex
CREATE INDEX "PortalSessionRotationLog_sessionId_rotatedAt_idx" ON "PortalSessionRotationLog"("sessionId", "rotatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortalRateLimitBucket_keyHash_windowStart_key" ON "PortalRateLimitBucket"("keyHash", "windowStart");

-- CreateIndex
CREATE INDEX "PortalRateLimitBucket_expiresAt_idx" ON "PortalRateLimitBucket"("expiresAt");

-- AddForeignKey
ALTER TABLE "ClientProfile"
ADD CONSTRAINT "ClientProfile_partyId_fkey"
FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalSessionRotationLog"
ADD CONSTRAINT "PortalSessionRotationLog_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "PortalSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
