-- CreateEnum
CREATE TYPE "AttendanceLivenessLevel" AS ENUM ('OFF', 'BASIC', 'PROVIDER');

-- CreateTable
CREATE TABLE "AttendanceSiteConfig" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "customerId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 100,
    "allowOutOfZone" BOOLEAN NOT NULL DEFAULT false,
    "requirePhoto" BOOLEAN NOT NULL DEFAULT false,
    "requireLiveness" "AttendanceLivenessLevel" NOT NULL DEFAULT 'OFF',
    "windowBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "windowAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "antiPassback" BOOLEAN NOT NULL DEFAULT false,
    "allowedSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePunchToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "employeeId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePunchToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceSiteConfig_customerId_idx" ON "AttendanceSiteConfig"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSiteConfig_siteId_key" ON "AttendanceSiteConfig"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePunchToken_token_key" ON "AttendancePunchToken"("token");

-- CreateIndex
CREATE INDEX "AttendancePunchToken_siteId_idx" ON "AttendancePunchToken"("siteId");

-- CreateIndex
CREATE INDEX "AttendancePunchToken_employeeId_idx" ON "AttendancePunchToken"("employeeId");

-- AddForeignKey
ALTER TABLE "AttendancePunchToken" ADD CONSTRAINT "AttendancePunchToken_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePunchToken" ADD CONSTRAINT "AttendancePunchToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
