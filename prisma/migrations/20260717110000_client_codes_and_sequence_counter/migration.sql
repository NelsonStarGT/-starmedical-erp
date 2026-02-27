-- AlterTable
ALTER TABLE "ClientProfile"
  ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'global',
  ADD COLUMN "clientCode" TEXT;

-- CreateTable
CREATE TABLE "ClientSequenceCounter" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "clientType" "ClientProfileType" NOT NULL,
  "prefix" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientSequenceCounter_pkey" PRIMARY KEY ("id")
);

-- Reindex ClientProfile for tenant-scoped queries
DROP INDEX IF EXISTS "ClientProfile_type_deletedAt_idx";
CREATE UNIQUE INDEX "ClientProfile_tenantId_clientCode_key" ON "ClientProfile"("tenantId", "clientCode");
CREATE INDEX "ClientProfile_tenantId_type_deletedAt_idx" ON "ClientProfile"("tenantId", "type", "deletedAt");

-- Sequence uniqueness and lookup indexes
CREATE UNIQUE INDEX "ClientSequenceCounter_tenantId_clientType_key"
  ON "ClientSequenceCounter"("tenantId", "clientType");
CREATE INDEX "ClientSequenceCounter_tenantId_prefix_idx"
  ON "ClientSequenceCounter"("tenantId", "prefix");
