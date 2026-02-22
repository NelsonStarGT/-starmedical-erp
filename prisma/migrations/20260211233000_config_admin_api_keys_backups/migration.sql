-- Config Central: API keys + backups policy/run skeleton

CREATE TABLE IF NOT EXISTS "AdminApiKey" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "keyHash" TEXT NOT NULL,
  "secretLast4" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "rotatedFromId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminApiKey_keyHash_key" ON "AdminApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "AdminApiKey_revokedAt_createdAt_idx" ON "AdminApiKey"("revokedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminApiKey_createdByUserId_idx" ON "AdminApiKey"("createdByUserId");
CREATE INDEX IF NOT EXISTS "AdminApiKey_rotatedFromId_idx" ON "AdminApiKey"("rotatedFromId");

CREATE TABLE IF NOT EXISTS "AdminBackupPolicy" (
  "id" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "retentionDays" INTEGER NOT NULL DEFAULT 30,
  "manualExportEnabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminBackupPolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminBackupPolicy_updatedAt_idx" ON "AdminBackupPolicy"("updatedAt");
CREATE INDEX IF NOT EXISTS "AdminBackupPolicy_updatedByUserId_idx" ON "AdminBackupPolicy"("updatedByUserId");

INSERT INTO "AdminBackupPolicy" ("id", "version", "retentionDays", "manualExportEnabled")
VALUES ('global', 1, 30, true)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "AdminBackupRun" (
  "id" TEXT NOT NULL,
  "triggerMode" TEXT NOT NULL DEFAULT 'MANUAL',
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "requestedByUserId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminBackupRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminBackupRun_createdAt_idx" ON "AdminBackupRun"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminBackupRun_requestedByUserId_idx" ON "AdminBackupRun"("requestedByUserId");
