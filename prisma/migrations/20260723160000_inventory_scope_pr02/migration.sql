-- PR-02: inventory real scope (tenantId + deletedAt + branch-aware indexes)
-- Safe strategy: add nullable columns, backfill tenantId, then enforce NOT NULL + default.

-- 1) Columns
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "ProductSubcategory" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ProductSubcategory" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "ServiceCategory" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ServiceCategory" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "ServiceSubcategory" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ServiceSubcategory" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "InventoryArea" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "InventoryArea" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "PriceList" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PriceList" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "PriceListItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PriceListItem" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "ProductStock" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ProductStock" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "PurchaseRequestItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PurchaseRequestItem" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Combo" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Combo" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "ComboService" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ComboService" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "ComboProduct" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ComboProduct" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "InventoryEmailSetting" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "InventoryEmailSetting" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "InventoryEmailSchedule" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "InventoryEmailSchedule" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "InventoryEmailScheduleLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "InventoryEmailScheduleLog" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "InventoryMarginPolicy" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "InventoryMarginPolicy" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "InventoryReportLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "InventoryReportLog" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- 2) Backfill tenantId (DEFAULT_TENANT_ID if provided via app.default_tenant_id setting, fallback global)
DO $$
DECLARE
  resolved_tenant TEXT := COALESCE(NULLIF(current_setting('app.default_tenant_id', true), ''), 'global');
BEGIN
  UPDATE "ProductCategory" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "ProductSubcategory" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "ServiceCategory" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "ServiceSubcategory" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "InventoryArea" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "PriceList" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "PriceListItem" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "Product" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "Service" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "ProductStock" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "InventoryMovement" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "PurchaseRequest" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "PurchaseRequestItem" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "PurchaseOrder" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "PurchaseOrderItem" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "Combo" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "ComboService" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "ComboProduct" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "InventoryEmailSetting" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "InventoryEmailSchedule" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "InventoryEmailScheduleLog" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "InventoryMarginPolicy" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
  UPDATE "InventoryReportLog" SET "tenantId" = resolved_tenant WHERE "tenantId" IS NULL OR btrim("tenantId") = '';
END $$;

-- 3) Enforce NOT NULL + defaults on tenantId
ALTER TABLE "ProductCategory" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "ProductCategory" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductSubcategory" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "ProductSubcategory" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ServiceCategory" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "ServiceCategory" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ServiceSubcategory" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "ServiceSubcategory" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryArea" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "InventoryArea" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PriceList" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "PriceList" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PriceListItem" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "PriceListItem" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "Product" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "Service" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProductStock" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "ProductStock" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryMovement" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "InventoryMovement" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PurchaseRequest" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "PurchaseRequest" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PurchaseRequestItem" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "PurchaseRequestItem" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "PurchaseOrder" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Combo" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "Combo" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ComboService" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "ComboService" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ComboProduct" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "ComboProduct" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryEmailSetting" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "InventoryEmailSetting" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryEmailSchedule" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "InventoryEmailSchedule" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryEmailScheduleLog" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "InventoryEmailScheduleLog" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryMarginPolicy" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "InventoryMarginPolicy" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryReportLog" ALTER COLUMN "tenantId" SET DEFAULT 'global';
ALTER TABLE "InventoryReportLog" ALTER COLUMN "tenantId" SET NOT NULL;

-- 4) Unique keys updated to tenant-aware variants
ALTER TABLE "ProductStock" DROP CONSTRAINT IF EXISTS "ProductStock_productId_branchId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ProductStock_tenantId_productId_branchId_key" ON "ProductStock"("tenantId", "productId", "branchId");

ALTER TABLE "ComboService" DROP CONSTRAINT IF EXISTS "ComboService_comboId_serviceId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ComboService_tenantId_comboId_serviceId_key" ON "ComboService"("tenantId", "comboId", "serviceId");

ALTER TABLE "ComboProduct" DROP CONSTRAINT IF EXISTS "ComboProduct_comboId_productId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ComboProduct_tenantId_comboId_productId_key" ON "ComboProduct"("tenantId", "comboId", "productId");

ALTER TABLE "InventoryReportLog" DROP CONSTRAINT IF EXISTS "InventoryReportLog_settingId_periodFrom_periodTo_key";
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryReportLog_tenantId_settingId_periodFrom_periodTo_key"
  ON "InventoryReportLog"("tenantId", "settingId", "periodFrom", "periodTo");

-- 5) Scope indexes
CREATE INDEX IF NOT EXISTS "ProductCategory_tenantId_deletedAt_idx" ON "ProductCategory"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ProductCategory_tenantId_status_deletedAt_idx" ON "ProductCategory"("tenantId", "status", "deletedAt");

CREATE INDEX IF NOT EXISTS "ProductSubcategory_tenantId_deletedAt_idx" ON "ProductSubcategory"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ProductSubcategory_tenantId_status_deletedAt_idx" ON "ProductSubcategory"("tenantId", "status", "deletedAt");

CREATE INDEX IF NOT EXISTS "ServiceCategory_tenantId_deletedAt_idx" ON "ServiceCategory"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ServiceCategory_tenantId_status_deletedAt_idx" ON "ServiceCategory"("tenantId", "status", "deletedAt");

CREATE INDEX IF NOT EXISTS "ServiceSubcategory_tenantId_deletedAt_idx" ON "ServiceSubcategory"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ServiceSubcategory_tenantId_status_deletedAt_idx" ON "ServiceSubcategory"("tenantId", "status", "deletedAt");

CREATE INDEX IF NOT EXISTS "InventoryArea_tenantId_deletedAt_idx" ON "InventoryArea"("tenantId", "deletedAt");

CREATE INDEX IF NOT EXISTS "PriceList_tenantId_deletedAt_idx" ON "PriceList"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "PriceList_tenantId_estado_deletedAt_idx" ON "PriceList"("tenantId", "estado", "deletedAt");
CREATE INDEX IF NOT EXISTS "PriceList_tenantId_updatedAt_deletedAt_idx" ON "PriceList"("tenantId", "updatedAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "PriceListItem_tenantId_deletedAt_idx" ON "PriceListItem"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "PriceListItem_tenantId_priceListId_deletedAt_idx" ON "PriceListItem"("tenantId", "priceListId", "deletedAt");

CREATE INDEX IF NOT EXISTS "Product_tenantId_deletedAt_idx" ON "Product"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Product_tenantId_status_deletedAt_idx" ON "Product"("tenantId", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS "Product_tenantId_updatedAt_deletedAt_idx" ON "Product"("tenantId", "updatedAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "Service_tenantId_deletedAt_idx" ON "Service"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Service_tenantId_status_deletedAt_idx" ON "Service"("tenantId", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS "Service_tenantId_updatedAt_deletedAt_idx" ON "Service"("tenantId", "updatedAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "ProductStock_tenantId_deletedAt_idx" ON "ProductStock"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ProductStock_tenantId_branchId_deletedAt_idx" ON "ProductStock"("tenantId", "branchId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ProductStock_tenantId_updatedAt_deletedAt_idx" ON "ProductStock"("tenantId", "updatedAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "InventoryMovement_tenantId_deletedAt_idx" ON "InventoryMovement"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_tenantId_branchId_deletedAt_idx" ON "InventoryMovement"("tenantId", "branchId", "deletedAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_tenantId_createdAt_deletedAt_idx" ON "InventoryMovement"("tenantId", "createdAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "PurchaseRequest_tenantId_deletedAt_idx" ON "PurchaseRequest"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "PurchaseRequest_tenantId_branchId_deletedAt_idx" ON "PurchaseRequest"("tenantId", "branchId", "deletedAt");
CREATE INDEX IF NOT EXISTS "PurchaseRequest_tenantId_status_deletedAt_idx" ON "PurchaseRequest"("tenantId", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS "PurchaseRequest_tenantId_updatedAt_deletedAt_idx" ON "PurchaseRequest"("tenantId", "updatedAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "PurchaseRequestItem_tenantId_deletedAt_idx" ON "PurchaseRequestItem"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "PurchaseRequestItem_tenantId_purchaseRequestId_deletedAt_idx" ON "PurchaseRequestItem"("tenantId", "purchaseRequestId", "deletedAt");

CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_deletedAt_idx" ON "PurchaseOrder"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_branchId_deletedAt_idx" ON "PurchaseOrder"("tenantId", "branchId", "deletedAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_status_deletedAt_idx" ON "PurchaseOrder"("tenantId", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_updatedAt_deletedAt_idx" ON "PurchaseOrder"("tenantId", "updatedAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_tenantId_deletedAt_idx" ON "PurchaseOrderItem"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_tenantId_purchaseOrderId_deletedAt_idx" ON "PurchaseOrderItem"("tenantId", "purchaseOrderId", "deletedAt");

CREATE INDEX IF NOT EXISTS "Combo_tenantId_deletedAt_idx" ON "Combo"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Combo_tenantId_status_deletedAt_idx" ON "Combo"("tenantId", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS "Combo_tenantId_updatedAt_deletedAt_idx" ON "Combo"("tenantId", "updatedAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "ComboService_tenantId_deletedAt_idx" ON "ComboService"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ComboService_tenantId_comboId_deletedAt_idx" ON "ComboService"("tenantId", "comboId", "deletedAt");

CREATE INDEX IF NOT EXISTS "ComboProduct_tenantId_deletedAt_idx" ON "ComboProduct"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ComboProduct_tenantId_comboId_deletedAt_idx" ON "ComboProduct"("tenantId", "comboId", "deletedAt");

CREATE INDEX IF NOT EXISTS "InventoryEmailSetting_tenantId_deletedAt_idx" ON "InventoryEmailSetting"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "InventoryEmailSetting_tenantId_isEnabled_deletedAt_idx" ON "InventoryEmailSetting"("tenantId", "isEnabled", "deletedAt");
CREATE INDEX IF NOT EXISTS "InventoryEmailSetting_tenantId_updatedAt_deletedAt_idx" ON "InventoryEmailSetting"("tenantId", "updatedAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "InventoryEmailSchedule_tenantId_deletedAt_idx" ON "InventoryEmailSchedule"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "InventoryEmailSchedule_tenantId_isEnabled_deletedAt_idx" ON "InventoryEmailSchedule"("tenantId", "isEnabled", "deletedAt");
CREATE INDEX IF NOT EXISTS "InventoryEmailSchedule_tenantId_updatedAt_deletedAt_idx" ON "InventoryEmailSchedule"("tenantId", "updatedAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "InventoryEmailScheduleLog_tenantId_deletedAt_idx" ON "InventoryEmailScheduleLog"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "InventoryEmailScheduleLog_tenantId_sentAt_deletedAt_idx" ON "InventoryEmailScheduleLog"("tenantId", "sentAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "InventoryMarginPolicy_tenantId_deletedAt_idx" ON "InventoryMarginPolicy"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "InventoryMarginPolicy_tenantId_updatedAt_deletedAt_idx" ON "InventoryMarginPolicy"("tenantId", "updatedAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "InventoryReportLog_tenantId_deletedAt_idx" ON "InventoryReportLog"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "InventoryReportLog_tenantId_sentAt_deletedAt_idx" ON "InventoryReportLog"("tenantId", "sentAt", "deletedAt");
