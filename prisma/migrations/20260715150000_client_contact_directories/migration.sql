-- CreateTable
CREATE TABLE "ClientContactDepartmentDirectory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContactDepartmentDirectory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContactJobTitleDirectory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContactJobTitleDirectory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContactDepartmentJobTitle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "jobTitleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContactDepartmentJobTitle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientContactDepartmentDirectory_tenantId_code_key" ON "ClientContactDepartmentDirectory"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContactDepartmentDirectory_tenantId_name_key" ON "ClientContactDepartmentDirectory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ClientContactDepartmentDirectory_tenantId_isActive_sortOrder_name_idx" ON "ClientContactDepartmentDirectory"("tenantId", "isActive", "sortOrder", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContactJobTitleDirectory_tenantId_code_key" ON "ClientContactJobTitleDirectory"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContactJobTitleDirectory_tenantId_name_key" ON "ClientContactJobTitleDirectory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ClientContactJobTitleDirectory_tenantId_isActive_sortOrder_name_idx" ON "ClientContactJobTitleDirectory"("tenantId", "isActive", "sortOrder", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContactDepartmentJobTitle_tenantId_departmentId_jobTitleId_key" ON "ClientContactDepartmentJobTitle"("tenantId", "departmentId", "jobTitleId");

-- CreateIndex
CREATE INDEX "ClientContactDepartmentJobTitle_tenantId_departmentId_isActive_idx" ON "ClientContactDepartmentJobTitle"("tenantId", "departmentId", "isActive");

-- CreateIndex
CREATE INDEX "ClientContactDepartmentJobTitle_tenantId_jobTitleId_isActive_idx" ON "ClientContactDepartmentJobTitle"("tenantId", "jobTitleId", "isActive");

-- AddForeignKey
ALTER TABLE "ClientContactDepartmentJobTitle" ADD CONSTRAINT "ClientContactDepartmentJobTitle_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "ClientContactDepartmentDirectory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContactDepartmentJobTitle" ADD CONSTRAINT "ClientContactDepartmentJobTitle_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "ClientContactJobTitleDirectory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
