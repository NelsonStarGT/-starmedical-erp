-- CreateTable
CREATE TABLE "EncounterSupply" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,4),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByName" TEXT,

    CONSTRAINT "EncounterSupply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EncounterSupply_encounterId_createdAt_idx" ON "EncounterSupply"("encounterId", "createdAt");

-- CreateIndex
CREATE INDEX "EncounterSupply_source_idx" ON "EncounterSupply"("source");

-- AddForeignKey
ALTER TABLE "EncounterSupply" ADD CONSTRAINT "EncounterSupply_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
