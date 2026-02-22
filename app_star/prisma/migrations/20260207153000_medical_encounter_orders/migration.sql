CREATE TABLE "EncounterOrderRequest" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceCode" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByName" TEXT,
    CONSTRAINT "EncounterOrderRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EncounterOrderRequest_encounterId_createdAt_idx" ON "EncounterOrderRequest"("encounterId", "createdAt");
CREATE INDEX "EncounterOrderRequest_modality_idx" ON "EncounterOrderRequest"("modality");
CREATE INDEX "EncounterOrderRequest_status_idx" ON "EncounterOrderRequest"("status");

ALTER TABLE "EncounterOrderRequest"
ADD CONSTRAINT "EncounterOrderRequest_encounterId_fkey"
FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
