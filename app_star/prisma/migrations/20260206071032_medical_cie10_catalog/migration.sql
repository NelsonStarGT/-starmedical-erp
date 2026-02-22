-- CreateEnum
CREATE TYPE "Icd10Source" AS ENUM ('WHO_OPS_PDF', 'LOCAL');

-- CreateEnum
CREATE TYPE "Icd10AuditAction" AS ENUM ('CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE');

-- CreateTable
CREATE TABLE "Icd10Code" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chapter" TEXT,
    "chapterRange" TEXT,
    "level" INTEGER NOT NULL,
    "parentCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" "Icd10Source" NOT NULL DEFAULT 'LOCAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Icd10Code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Icd10Audit" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "action" "Icd10AuditAction" NOT NULL,
    "diffJson" JSONB NOT NULL,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Icd10Audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Icd10Code_code_key" ON "Icd10Code"("code");

-- CreateIndex
CREATE INDEX "Icd10Code_code_idx" ON "Icd10Code"("code");

-- CreateIndex
CREATE INDEX "Icd10Code_title_idx" ON "Icd10Code"("title");

-- CreateIndex
CREATE INDEX "Icd10Code_isActive_idx" ON "Icd10Code"("isActive");

-- CreateIndex
CREATE INDEX "Icd10Code_level_idx" ON "Icd10Code"("level");

-- CreateIndex
CREATE INDEX "Icd10Code_chapter_idx" ON "Icd10Code"("chapter");

-- CreateIndex
CREATE INDEX "Icd10Code_isActive_level_chapter_idx" ON "Icd10Code"("isActive", "level", "chapter");

-- CreateIndex
CREATE INDEX "Icd10Audit_codeId_createdAt_idx" ON "Icd10Audit"("codeId", "createdAt");

-- CreateIndex
CREATE INDEX "Icd10Audit_action_createdAt_idx" ON "Icd10Audit"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Icd10Audit" ADD CONSTRAINT "Icd10Audit_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "Icd10Code"("id") ON DELETE CASCADE ON UPDATE CASCADE;
