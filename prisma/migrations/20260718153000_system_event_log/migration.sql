-- CreateTable
CREATE TABLE IF NOT EXISTS "SystemEventLog" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId" TEXT,
  "domain" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "code" TEXT,
  "resource" TEXT,
  "messageShort" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "metaJson" JSONB,
  CONSTRAINT "SystemEventLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "SystemEventLog_createdAt_idx" ON "SystemEventLog"("createdAt");
CREATE INDEX IF NOT EXISTS "SystemEventLog_tenantId_createdAt_idx" ON "SystemEventLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "SystemEventLog_domain_createdAt_idx" ON "SystemEventLog"("domain", "createdAt");
CREATE INDEX IF NOT EXISTS "SystemEventLog_eventType_createdAt_idx" ON "SystemEventLog"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "SystemEventLog_severity_createdAt_idx" ON "SystemEventLog"("severity", "createdAt");
CREATE INDEX IF NOT EXISTS "SystemEventLog_digest_idx" ON "SystemEventLog"("digest");

-- Foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SystemEventLog_tenantId_fkey'
  ) THEN
    ALTER TABLE "SystemEventLog"
    ADD CONSTRAINT "SystemEventLog_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
