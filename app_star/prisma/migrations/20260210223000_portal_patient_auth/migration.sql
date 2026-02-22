-- CreateTable
CREATE TABLE "PortalOtpChallenge" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "clientId" TEXT,
  "codeHash" TEXT,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT,
  "userAgentHash" TEXT,

  CONSTRAINT "PortalOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalSession" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "sessionTokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "ipHash" TEXT,
  "userAgentHash" TEXT,

  CONSTRAINT "PortalSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalAuditLog" (
  "id" TEXT NOT NULL,
  "clientId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PortalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalOtpChallenge_destination_expiresAt_idx" ON "PortalOtpChallenge"("destination", "expiresAt");

-- CreateIndex
CREATE INDEX "PortalOtpChallenge_clientId_idx" ON "PortalOtpChallenge"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalSession_sessionTokenHash_key" ON "PortalSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "PortalSession_clientId_expiresAt_idx" ON "PortalSession"("clientId", "expiresAt");

-- CreateIndex
CREATE INDEX "PortalAuditLog_clientId_createdAt_idx" ON "PortalAuditLog"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "PortalAuditLog_action_idx" ON "PortalAuditLog"("action");

-- AddForeignKey
ALTER TABLE "PortalOtpChallenge"
ADD CONSTRAINT "PortalOtpChallenge_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalSession"
ADD CONSTRAINT "PortalSession_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAuditLog"
ADD CONSTRAINT "PortalAuditLog_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
