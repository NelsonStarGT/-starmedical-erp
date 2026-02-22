ALTER TABLE "EncounterOrderRequest"
ADD COLUMN IF NOT EXISTS "assignedToService" TEXT,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedByName" TEXT;

CREATE INDEX IF NOT EXISTS "EncounterOrderRequest_updatedAt_idx"
ON "EncounterOrderRequest"("updatedAt");

CREATE INDEX IF NOT EXISTS "EncounterOrderRequest_modality_status_priority_createdAt_idx"
ON "EncounterOrderRequest"("modality", "status", "priority", "createdAt");
