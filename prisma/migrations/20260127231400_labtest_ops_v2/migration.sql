-- CreateEnum
CREATE TYPE "LabTemplateFieldDataType" AS ENUM ('TEXT', 'NUMBER');

-- AlterEnum
ALTER TYPE "LabSampleType" ADD VALUE 'SWAB';

-- AlterTable
ALTER TABLE "LabSample" ADD COLUMN     "specimenSeq" INTEGER,
ADD COLUMN     "specimenSeqDateKey" TEXT;

-- AlterTable
ALTER TABLE "LabTestOrder" ADD COLUMN     "reportSeq" INTEGER,
ADD COLUMN     "reportSeqDateKey" TEXT;

-- AlterTable
ALTER TABLE "LabTestSetting" ADD COLUMN     "logsPrefixReport" TEXT DEFAULT 'RPT',
ADD COLUMN     "logsPrefixSpecimen" TEXT DEFAULT 'LAB',
ADD COLUMN     "logsResetDaily" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportsDefaultRangeDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "templatesPreviewMode" TEXT DEFAULT 'HTML',
ADD COLUMN     "workbenchAutoInProcess" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LabSequenceCounter" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "branchId" TEXT,
    "lastValue" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabSequenceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTemplateV2" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "area" "LabArea" NOT NULL,
    "headerHtml" TEXT,
    "footerHtml" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTemplateV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTemplateField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataType" "LabTemplateFieldDataType" NOT NULL,
    "unitDefault" TEXT,
    "refLowDefault" DECIMAL(14,4),
    "refHighDefault" DECIMAL(14,4),
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LabTemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestCatalogCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTestCatalogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestCatalogSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTestCatalogSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestCatalogTest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" "LabArea" NOT NULL,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "sampleTypeDefault" "LabSampleType",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTestCatalogTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabSequenceCounter_key_dateKey_branchId_key" ON "LabSequenceCounter"("key", "dateKey", "branchId");

-- CreateIndex
CREATE INDEX "LabTemplateField_templateId_idx" ON "LabTemplateField"("templateId");

-- CreateIndex
CREATE INDEX "LabTestCatalogSubcategory_categoryId_idx" ON "LabTestCatalogSubcategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "LabTestCatalogSubcategory_categoryId_name_key" ON "LabTestCatalogSubcategory"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LabTestCatalogTest_code_key" ON "LabTestCatalogTest"("code");

-- CreateIndex
CREATE INDEX "LabTestCatalogTest_categoryId_idx" ON "LabTestCatalogTest"("categoryId");

-- CreateIndex
CREATE INDEX "LabTestCatalogTest_subcategoryId_idx" ON "LabTestCatalogTest"("subcategoryId");

-- AddForeignKey
ALTER TABLE "LabSequenceCounter" ADD CONSTRAINT "LabSequenceCounter_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTemplateV2" ADD CONSTRAINT "LabTemplateV2_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTemplateField" ADD CONSTRAINT "LabTemplateField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LabTemplateV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestCatalogSubcategory" ADD CONSTRAINT "LabTestCatalogSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LabTestCatalogCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestCatalogTest" ADD CONSTRAINT "LabTestCatalogTest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LabTestCatalogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestCatalogTest" ADD CONSTRAINT "LabTestCatalogTest_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "LabTestCatalogSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
