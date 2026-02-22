-- CreateTable
CREATE TABLE IF NOT EXISTS "PhoneCountryCode" (
    "id" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "dialCode" TEXT NOT NULL,
    "minLength" INTEGER NOT NULL,
    "maxLength" INTEGER NOT NULL,
    "example" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneCountryCode_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "phoneE164" VARCHAR(20);

-- AlterTable
ALTER TABLE "ClientContact" ADD COLUMN IF NOT EXISTS "phoneE164" VARCHAR(20);

-- AlterTable
ALTER TABLE "CompanyContact" ADD COLUMN IF NOT EXISTS "phoneE164" VARCHAR(20);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PhoneCountryCode_iso2_key" ON "PhoneCountryCode"("iso2");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PhoneCountryCode_dialCode_idx" ON "PhoneCountryCode"("dialCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PhoneCountryCode_isActive_countryName_idx" ON "PhoneCountryCode"("isActive", "countryName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientProfile_phoneE164_idx" ON "ClientProfile"("phoneE164");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientContact_phoneE164_idx" ON "ClientContact"("phoneE164");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CompanyContact_phoneE164_idx" ON "CompanyContact"("phoneE164");
