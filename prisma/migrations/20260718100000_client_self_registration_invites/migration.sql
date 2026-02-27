-- CreateEnum
CREATE TYPE "ClientSelfRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ClientRegistrationSequenceCounter" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "clientType" "ClientProfileType" NOT NULL,
  "prefix" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientRegistrationSequenceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRegistrationInvite" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "clientType" "ClientProfileType" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "note" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientRegistrationInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSelfRegistration" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "inviteId" TEXT NOT NULL,
  "status" "ClientSelfRegistrationStatus" NOT NULL DEFAULT 'PENDING',
  "clientType" "ClientProfileType" NOT NULL,
  "provisionalCode" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "displayName" TEXT,
  "documentRef" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "submittedFromIpHash" TEXT,
  "submittedFromUserAgent" TEXT,
  "rejectedReason" TEXT,
  "reviewNotes" TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "assignedClientId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientSelfRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientRegistrationSequenceCounter_tenantId_clientType_key"
ON "ClientRegistrationSequenceCounter"("tenantId", "clientType");

-- CreateIndex
CREATE INDEX "ClientRegistrationSequenceCounter_tenantId_prefix_idx"
ON "ClientRegistrationSequenceCounter"("tenantId", "prefix");

-- CreateIndex
CREATE UNIQUE INDEX "ClientRegistrationInvite_tokenHash_key"
ON "ClientRegistrationInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "ClientRegistrationInvite_tenantId_clientType_revokedAt_expiresAt_idx"
ON "ClientRegistrationInvite"("tenantId", "clientType", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "ClientRegistrationInvite_createdByUserId_createdAt_idx"
ON "ClientRegistrationInvite"("createdByUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSelfRegistration_tenantId_provisionalCode_key"
ON "ClientSelfRegistration"("tenantId", "provisionalCode");

-- CreateIndex
CREATE INDEX "ClientSelfRegistration_tenantId_status_createdAt_idx"
ON "ClientSelfRegistration"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ClientSelfRegistration_inviteId_createdAt_idx"
ON "ClientSelfRegistration"("inviteId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientSelfRegistration_documentRef_idx"
ON "ClientSelfRegistration"("documentRef");

-- CreateIndex
CREATE INDEX "ClientSelfRegistration_email_idx"
ON "ClientSelfRegistration"("email");

-- CreateIndex
CREATE INDEX "ClientSelfRegistration_phone_idx"
ON "ClientSelfRegistration"("phone");

-- CreateIndex
CREATE INDEX "ClientSelfRegistration_assignedClientId_idx"
ON "ClientSelfRegistration"("assignedClientId");

-- AddForeignKey
ALTER TABLE "ClientRegistrationInvite"
ADD CONSTRAINT "ClientRegistrationInvite_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSelfRegistration"
ADD CONSTRAINT "ClientSelfRegistration_inviteId_fkey"
FOREIGN KEY ("inviteId") REFERENCES "ClientRegistrationInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSelfRegistration"
ADD CONSTRAINT "ClientSelfRegistration_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSelfRegistration"
ADD CONSTRAINT "ClientSelfRegistration_assignedClientId_fkey"
FOREIGN KEY ("assignedClientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
