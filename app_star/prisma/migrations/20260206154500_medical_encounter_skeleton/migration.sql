-- Encounter real (incremental scaffold). Mantiene compatibilidad con modo mock.
CREATE TABLE IF NOT EXISTS "Encounter" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "closedById" TEXT,
  CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Encounter_patientId_idx" ON "Encounter"("patientId");
CREATE INDEX IF NOT EXISTS "Encounter_status_createdAt_idx" ON "Encounter"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "EncounterResult" (
  "id" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL,
  "pdfUrl" TEXT,
  "imageUrls" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "values" JSONB NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT "EncounterResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EncounterResult_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EncounterResult_encounterId_performedAt_idx" ON "EncounterResult"("encounterId", "performedAt");
CREATE INDEX IF NOT EXISTS "EncounterResult_status_idx" ON "EncounterResult"("status");

CREATE TABLE IF NOT EXISTS "EncounterReconsulta" (
  "id" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "sourceResultId" TEXT,
  "sourceResultTitle" TEXT,
  "entryTitle" TEXT NOT NULL,
  "noteRichJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "noteRichHtml" TEXT NOT NULL DEFAULT '',
  "interpretation" TEXT NOT NULL DEFAULT '',
  "conduct" TEXT NOT NULL DEFAULT '',
  "therapeuticAdjustment" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" TEXT,
  "authorName" TEXT,
  CONSTRAINT "EncounterReconsulta_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EncounterReconsulta_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EncounterReconsulta_encounterId_createdAt_idx" ON "EncounterReconsulta"("encounterId", "createdAt");
CREATE INDEX IF NOT EXISTS "EncounterReconsulta_type_idx" ON "EncounterReconsulta"("type");

CREATE TABLE IF NOT EXISTS "EncounterDocument" (
  "id" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "storageRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EncounterDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EncounterDocument_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EncounterDocument_encounterId_createdAt_idx" ON "EncounterDocument"("encounterId", "createdAt");
CREATE INDEX IF NOT EXISTS "EncounterDocument_kind_idx" ON "EncounterDocument"("kind");
