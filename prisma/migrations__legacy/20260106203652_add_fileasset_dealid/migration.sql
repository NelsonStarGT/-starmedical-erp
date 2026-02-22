-- DropIndex
DROP INDEX "FileAsset_dealId_idx";

-- AlterTable
ALTER TABLE "SequenceCounter" ALTER COLUMN "updatedAt" DROP DEFAULT;
