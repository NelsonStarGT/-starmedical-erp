-- SystemEventLog v1.1: resolución persistente
ALTER TABLE "SystemEventLog"
ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "resolvedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "resolutionNote" TEXT;

CREATE INDEX IF NOT EXISTS "SystemEventLog_resolvedAt_idx" ON "SystemEventLog"("resolvedAt");
CREATE INDEX IF NOT EXISTS "SystemEventLog_resolvedByUserId_resolvedAt_idx" ON "SystemEventLog"("resolvedByUserId", "resolvedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'SystemEventLog_resolvedByUserId_fkey'
  ) THEN
    ALTER TABLE "SystemEventLog"
    ADD CONSTRAINT "SystemEventLog_resolvedByUserId_fkey"
    FOREIGN KEY ("resolvedByUserId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
