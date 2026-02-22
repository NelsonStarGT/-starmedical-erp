-- AlterTable
ALTER TABLE "ClientProfile"
  ADD COLUMN "photoAssetId" TEXT,
  ADD COLUMN "photoUrl" TEXT;

-- CreateIndex
CREATE INDEX "ClientProfile_photoAssetId_idx" ON "ClientProfile"("photoAssetId");

-- AddForeignKey
ALTER TABLE "ClientProfile"
ADD CONSTRAINT "ClientProfile_photoAssetId_fkey"
FOREIGN KEY ("photoAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
