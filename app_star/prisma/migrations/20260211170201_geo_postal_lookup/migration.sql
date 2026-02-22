-- CreateTable
CREATE TABLE "GeoPostalCode" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "admin1Id" TEXT,
    "admin2Id" TEXT,
    "admin3Id" TEXT,
    "label" TEXT,
    "isOperational" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoPostalCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeoPostalCode_countryId_postalCode_idx" ON "GeoPostalCode"("countryId", "postalCode");

-- CreateIndex
CREATE INDEX "GeoPostalCode_postalCode_idx" ON "GeoPostalCode"("postalCode");

-- CreateIndex
CREATE INDEX "GeoPostalCode_admin1Id_idx" ON "GeoPostalCode"("admin1Id");

-- CreateIndex
CREATE INDEX "GeoPostalCode_admin2Id_idx" ON "GeoPostalCode"("admin2Id");

-- CreateIndex
CREATE INDEX "GeoPostalCode_admin3Id_idx" ON "GeoPostalCode"("admin3Id");

-- AddForeignKey
ALTER TABLE "GeoPostalCode" ADD CONSTRAINT "GeoPostalCode_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "GeoCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoPostalCode" ADD CONSTRAINT "GeoPostalCode_admin1Id_fkey" FOREIGN KEY ("admin1Id") REFERENCES "GeoAdmin1"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoPostalCode" ADD CONSTRAINT "GeoPostalCode_admin2Id_fkey" FOREIGN KEY ("admin2Id") REFERENCES "GeoAdmin2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoPostalCode" ADD CONSTRAINT "GeoPostalCode_admin3Id_fkey" FOREIGN KEY ("admin3Id") REFERENCES "GeoAdmin3"("id") ON DELETE SET NULL ON UPDATE CASCADE;
