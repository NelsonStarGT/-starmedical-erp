-- CreateTable
CREATE TABLE "ClientPbxCategoryDirectory" (
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

    CONSTRAINT "ClientPbxCategoryDirectory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientPbxCategoryDirectory_tenantId_code_key" ON "ClientPbxCategoryDirectory"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPbxCategoryDirectory_tenantId_name_key" ON "ClientPbxCategoryDirectory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ClientPbxCategoryDirectory_tenantId_isActive_sortOrder_name_idx" ON "ClientPbxCategoryDirectory"("tenantId", "isActive", "sortOrder", "name");
