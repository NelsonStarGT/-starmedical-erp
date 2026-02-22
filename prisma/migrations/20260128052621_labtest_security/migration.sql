-- CreateEnum
CREATE TYPE "LabRole" AS ENUM ('LAB_TECH', 'LAB_SUPERVISOR', 'LAB_ADMIN');

-- AlterTable
ALTER TABLE "LabTestSetting" ADD COLUMN     "idleTimeoutMinutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "otpTtlMinutes" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "requireOtpForLabTest" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "LabAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "LabRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOtpChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "LabOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabAccess_userId_idx" ON "LabAccess"("userId");

-- CreateIndex
CREATE INDEX "LabAccess_role_idx" ON "LabAccess"("role");

-- CreateIndex
CREATE INDEX "LabAccess_isActive_idx" ON "LabAccess"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LabAccess_userId_role_branchId_key" ON "LabAccess"("userId", "role", "branchId");

-- CreateIndex
CREATE INDEX "LabOtpChallenge_userId_idx" ON "LabOtpChallenge"("userId");

-- CreateIndex
CREATE INDEX "LabOtpChallenge_expiresAt_idx" ON "LabOtpChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "LabAccess" ADD CONSTRAINT "LabAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOtpChallenge" ADD CONSTRAINT "LabOtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
