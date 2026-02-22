-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Activo';

-- AlterTable
ALTER TABLE "ProductSubcategory" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Activo';

-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Activo';

-- AlterTable
ALTER TABLE "ServiceSubcategory" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Activo';

-- CreateTable
CREATE TABLE "Combo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceFinal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "costProductsTotal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "costCalculated" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboService" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "ComboService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboProduct" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(12,4),

    CONSTRAINT "ComboProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComboService_comboId_serviceId_key" ON "ComboService"("comboId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ComboProduct_comboId_productId_key" ON "ComboProduct"("comboId", "productId");

-- AddForeignKey
ALTER TABLE "ComboService" ADD CONSTRAINT "ComboService_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboService" ADD CONSTRAINT "ComboService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboProduct" ADD CONSTRAINT "ComboProduct_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboProduct" ADD CONSTRAINT "ComboProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
