/*
  Warnings:

  - Made the column `branchId` on table `LabAccess` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "LabAccess" ALTER COLUMN "branchId" SET NOT NULL,
ALTER COLUMN "branchId" SET DEFAULT 'GLOBAL';

-- CreateTable
CREATE TABLE "LabOtpAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabOtpAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabOtpAttempt_userId_idx" ON "LabOtpAttempt"("userId");

-- CreateIndex
CREATE INDEX "LabOtpAttempt_createdAt_idx" ON "LabOtpAttempt"("createdAt");
