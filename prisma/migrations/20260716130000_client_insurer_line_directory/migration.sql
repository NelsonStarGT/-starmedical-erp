-- CreateTable
CREATE TABLE "ClientInsurerLineDirectory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInsurerLineDirectory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientInsurerLineDirectory_tenantId_code_key" ON "ClientInsurerLineDirectory"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInsurerLineDirectory_tenantId_name_key" ON "ClientInsurerLineDirectory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ClientInsurerLineDirectory_tenantId_isActive_sortOrder_name_idx" ON "ClientInsurerLineDirectory"("tenantId", "isActive", "sortOrder", "name");
