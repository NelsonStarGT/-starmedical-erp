-- Reception module: patient fields + reception notes + source type
CREATE TYPE "PatientSex" AS ENUM ('M', 'F');

ALTER TYPE "DiagnosticOrderSourceType" ADD VALUE IF NOT EXISTS 'RECEPTION';

ALTER TABLE "ClientProfile"
  ADD COLUMN "sex" "PatientSex",
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "address" TEXT;

CREATE TABLE "ReceptionNote" (
  "id" TEXT NOT NULL,
  "diagnosticOrderId" TEXT NOT NULL,
  "vitalSignsJson" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT,
  CONSTRAINT "ReceptionNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReceptionNote_diagnosticOrderId_key" ON "ReceptionNote"("diagnosticOrderId");
CREATE INDEX "ReceptionNote_diagnosticOrderId_idx" ON "ReceptionNote"("diagnosticOrderId");
CREATE INDEX "ReceptionNote_createdByUserId_idx" ON "ReceptionNote"("createdByUserId");

ALTER TABLE "ReceptionNote" ADD CONSTRAINT "ReceptionNote_diagnosticOrderId_fkey" FOREIGN KEY ("diagnosticOrderId") REFERENCES "DiagnosticOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReceptionNote" ADD CONSTRAINT "ReceptionNote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
