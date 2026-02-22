-- memberships admin v2
-- P0: defaults de IDs en Prisma (cuid()) se resuelven en cliente Prisma.
-- SQL se centra en columnas/tablas nuevas para v2 y hardening de estructura.

DO $$
BEGIN
  CREATE TYPE "MembershipPlanSegment" AS ENUM ('B2C', 'B2B');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MembershipPlanCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "segment" "MembershipPlanSegment" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipPlanCategory_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "MembershipPlanCategory"
    ADD CONSTRAINT "MembershipPlanCategory_name_segment_key" UNIQUE ("name", "segment");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "MembershipPlanCategory_segment_isActive_sortOrder_idx"
  ON "MembershipPlanCategory"("segment", "isActive", "sortOrder");

ALTER TABLE IF EXISTS "MembershipPlan"
  ADD COLUMN IF NOT EXISTS "segment" "MembershipPlanSegment";

ALTER TABLE IF EXISTS "MembershipPlan"
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

ALTER TABLE IF EXISTS "MembershipPlan"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

UPDATE "MembershipPlan"
SET "segment" = CASE
  WHEN "type" = 'EMPRESARIAL' THEN 'B2B'::"MembershipPlanSegment"
  ELSE 'B2C'::"MembershipPlanSegment"
END
WHERE "segment" IS NULL;

ALTER TABLE IF EXISTS "MembershipPlan"
  ALTER COLUMN "segment" SET DEFAULT 'B2C';

ALTER TABLE IF EXISTS "MembershipPlan"
  ALTER COLUMN "segment" SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE "MembershipPlan"
    ADD CONSTRAINT "MembershipPlan_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "MembershipPlanCategory"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "MembershipPlan_segment_active_idx"
  ON "MembershipPlan"("segment", "active");

CREATE INDEX IF NOT EXISTS "MembershipPlan_categoryId_idx"
  ON "MembershipPlan"("categoryId");

ALTER TABLE IF EXISTS "MembershipContract"
  ADD COLUMN IF NOT EXISTS "lastInvoiceId" TEXT;

CREATE INDEX IF NOT EXISTS "MembershipContract_lastInvoiceId_idx"
  ON "MembershipContract"("lastInvoiceId");

CREATE TABLE IF NOT EXISTS "MembershipPublicSubscriptionRequest" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'WEB',
  "planId" TEXT NOT NULL,
  "segment" "MembershipPlanSegment" NOT NULL,
  "categoryId" TEXT,
  "clientProfileId" TEXT,
  "contractId" TEXT,
  "invoiceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "requestPayload" JSONB NOT NULL,
  "responsePayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipPublicSubscriptionRequest_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "MembershipPublicSubscriptionRequest"
    ADD CONSTRAINT "MembershipPublicSubscriptionRequest_idempotencyKey_key" UNIQUE ("idempotencyKey");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MembershipPublicSubscriptionRequest"
    ADD CONSTRAINT "MembershipPublicSubscriptionRequest_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MembershipPublicSubscriptionRequest"
    ADD CONSTRAINT "MembershipPublicSubscriptionRequest_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "MembershipPlanCategory"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MembershipPublicSubscriptionRequest"
    ADD CONSTRAINT "MembershipPublicSubscriptionRequest_clientProfileId_fkey"
    FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MembershipPublicSubscriptionRequest"
    ADD CONSTRAINT "MembershipPublicSubscriptionRequest_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "MembershipContract"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "MembershipPublicSubscriptionRequest_planId_createdAt_idx"
  ON "MembershipPublicSubscriptionRequest"("planId", "createdAt");

CREATE INDEX IF NOT EXISTS "MembershipPublicSubscriptionRequest_segment_createdAt_idx"
  ON "MembershipPublicSubscriptionRequest"("segment", "createdAt");

CREATE INDEX IF NOT EXISTS "MembershipPublicSubscriptionRequest_contractId_idx"
  ON "MembershipPublicSubscriptionRequest"("contractId");

CREATE INDEX IF NOT EXISTS "MembershipPublicSubscriptionRequest_clientProfileId_idx"
  ON "MembershipPublicSubscriptionRequest"("clientProfileId");
