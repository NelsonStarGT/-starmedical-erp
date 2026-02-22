-- DropIndex
DROP INDEX "ClientAffiliation_entityClientId_idx";

-- DropIndex
DROP INDEX "ClientAffiliation_personClientId_idx";

-- DropIndex
DROP INDEX "ClientAffiliation_status_idx";

-- DropIndex
DROP INDEX "EncounterOrderRequest_modality_status_priority_createdAt_idx";

-- DropIndex
DROP INDEX "EncounterOrderRequest_updatedAt_idx";

-- AlterTable
ALTER TABLE "Encounter" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EncounterReconsulta" ALTER COLUMN "noteRichJson" DROP DEFAULT,
ALTER COLUMN "noteRichHtml" DROP DEFAULT,
ALTER COLUMN "interpretation" DROP DEFAULT,
ALTER COLUMN "conduct" DROP DEFAULT,
ALTER COLUMN "therapeuticAdjustment" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EncounterResult" ALTER COLUMN "imageUrls" DROP DEFAULT,
ALTER COLUMN "values" DROP DEFAULT;
