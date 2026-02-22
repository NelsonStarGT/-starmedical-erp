-- Enums para contactos y notas del módulo Clientes
CREATE TYPE "ClientContactRelationType" AS ENUM ('FAMILY', 'WORK', 'FRIEND', 'OTHER');
CREATE TYPE "ClientNoteType" AS ENUM ('ADMIN', 'RECEPCION', 'CLINICA', 'OTRA');
CREATE TYPE "ClientNoteVisibility" AS ENUM ('INTERNA', 'VISIBLE_PACIENTE');

-- Contactos: tipo de relación, vínculo a persona existente y flags operativos
ALTER TABLE "ClientContact"
ADD COLUMN "linkedPersonClientId" TEXT,
ADD COLUMN "relationType" "ClientContactRelationType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "isEmergencyContact" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ClientContact"
ADD CONSTRAINT "ClientContact_linkedPersonClientId_fkey"
FOREIGN KEY ("linkedPersonClientId") REFERENCES "ClientProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ClientContact_linkedPersonClientId_idx" ON "ClientContact"("linkedPersonClientId");

-- Notas: título opcional, tipo y visibilidad
ALTER TABLE "ClientNote"
ADD COLUMN "title" TEXT,
ADD COLUMN "noteType" "ClientNoteType" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN "visibility" "ClientNoteVisibility" NOT NULL DEFAULT 'INTERNA';

CREATE INDEX "ClientNote_clientId_noteType_createdAt_idx" ON "ClientNote"("clientId", "noteType", "createdAt");
