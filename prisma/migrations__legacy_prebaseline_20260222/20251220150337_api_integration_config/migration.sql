-- CreateEnum
CREATE TYPE "ApiIntegrationKey" AS ENUM ('WHATSAPP', 'SMS', 'LABORATORIO', 'ASISTENCIA', 'SAT_FACTURACION', 'GOOGLE_DRIVE', 'WEBHOOKS', 'OTRO');

-- CreateTable
CREATE TABLE "ApiIntegrationConfig" (
    "id" TEXT NOT NULL,
    "key" "ApiIntegrationKey" NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "baseUrl" TEXT,
    "apiKeyEnc" TEXT,
    "apiSecretEnc" TEXT,
    "tokenEnc" TEXT,
    "extraJson" TEXT,
    "lastTestAt" TIMESTAMP(3),
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiIntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiIntegrationConfig_key_key" ON "ApiIntegrationConfig"("key");
