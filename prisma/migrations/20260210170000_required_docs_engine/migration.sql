-- AlterTable
ALTER TABLE "ClientRulesConfig"
  ADD COLUMN "healthProfileWeight" INTEGER NOT NULL DEFAULT 70,
  ADD COLUMN "healthDocsWeight" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "ClientRequiredDocumentRule" (
  "id" TEXT NOT NULL,
  "clientType" "ClientProfileType" NOT NULL,
  "documentTypeId" TEXT NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
  "requiresExpiry" BOOLEAN NOT NULL DEFAULT false,
  "weight" INTEGER NOT NULL DEFAULT 5,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientRequiredDocumentRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientRequiredDocumentRule_weight_check" CHECK ("weight" >= 1 AND "weight" <= 10)
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientRequiredDocumentRule_clientType_documentTypeId_key"
ON "ClientRequiredDocumentRule"("clientType", "documentTypeId");

-- CreateIndex
CREATE INDEX "ClientRequiredDocumentRule_clientType_isActive_idx"
ON "ClientRequiredDocumentRule"("clientType", "isActive");

-- CreateIndex
CREATE INDEX "ClientRequiredDocumentRule_documentTypeId_idx"
ON "ClientRequiredDocumentRule"("documentTypeId");

-- AddForeignKey
ALTER TABLE "ClientRequiredDocumentRule"
ADD CONSTRAINT "ClientRequiredDocumentRule_documentTypeId_fkey"
FOREIGN KEY ("documentTypeId") REFERENCES "ClientCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
