-- AlterTable
ALTER TABLE "DiagnosticOrder"
  ADD COLUMN "resultFileAssetId" TEXT;

-- AlterTable
ALTER TABLE "LabTestOrder"
  ADD COLUMN "resultFileAssetId" TEXT;

-- CreateIndex
CREATE INDEX "DiagnosticOrder_resultFileAssetId_idx" ON "DiagnosticOrder"("resultFileAssetId");

-- CreateIndex
CREATE INDEX "LabTestOrder_resultFileAssetId_idx" ON "LabTestOrder"("resultFileAssetId");

-- AddForeignKey
ALTER TABLE "DiagnosticOrder"
ADD CONSTRAINT "DiagnosticOrder_resultFileAssetId_fkey"
FOREIGN KEY ("resultFileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestOrder"
ADD CONSTRAINT "LabTestOrder_resultFileAssetId_fkey"
FOREIGN KEY ("resultFileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
