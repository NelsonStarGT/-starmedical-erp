-- Subscriptions P2.B: pharmacy medication subscriptions + discount scaffold

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PharmacySubscriptionStatus') THEN
    CREATE TYPE "PharmacySubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PharmacyRegimenFrequency') THEN
    CREATE TYPE "PharmacyRegimenFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM_DAYS');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PharmacyDeliveryMethod') THEN
    CREATE TYPE "PharmacyDeliveryMethod" AS ENUM ('PICKUP', 'DELIVERY');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PharmacyContactPreference') THEN
    CREATE TYPE "PharmacyContactPreference" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PharmacyReminderEventType') THEN
    CREATE TYPE "PharmacyReminderEventType" AS ENUM ('PREPARED', 'CONTACTED', 'DELIVERED', 'PICKUP_READY', 'BILLING_LINK');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PharmacySubscriptionConfig" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "medicationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "discountEnabled" BOOLEAN NOT NULL DEFAULT false,
  "reminderLeadDays" INTEGER NOT NULL DEFAULT 3,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PharmacySubscriptionConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PharmacySubscriptionConfig" ("id", "medicationEnabled", "discountEnabled", "reminderLeadDays")
VALUES (1, true, false, 3)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "PharmacyMedicationSubscription" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "branchId" TEXT,
  "frequency" "PharmacyRegimenFrequency" NOT NULL DEFAULT 'MONTHLY',
  "customDays" INTEGER,
  "nextFillAt" TIMESTAMP(3) NOT NULL,
  "lastFillAt" TIMESTAMP(3),
  "deliveryMethod" "PharmacyDeliveryMethod" NOT NULL DEFAULT 'PICKUP',
  "contactPreference" "PharmacyContactPreference" NOT NULL DEFAULT 'WHATSAPP',
  "status" "PharmacySubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PharmacyMedicationSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PharmacyMedicationSubscription_branchId_status_nextFillAt_idx"
  ON "PharmacyMedicationSubscription"("branchId", "status", "nextFillAt");

CREATE INDEX IF NOT EXISTS "PharmacyMedicationSubscription_patientId_status_idx"
  ON "PharmacyMedicationSubscription"("patientId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PharmacyMedicationSubscription_branchId_fkey'
  ) THEN
    ALTER TABLE "PharmacyMedicationSubscription"
      ADD CONSTRAINT "PharmacyMedicationSubscription_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PharmacyMedicationSubscriptionItem" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "medicationId" TEXT NOT NULL,
  "qty" DECIMAL(12,2) NOT NULL DEFAULT 1,
  "instructions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PharmacyMedicationSubscriptionItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PharmacyMedicationSubscriptionItem_subscriptionId_idx"
  ON "PharmacyMedicationSubscriptionItem"("subscriptionId");

CREATE INDEX IF NOT EXISTS "PharmacyMedicationSubscriptionItem_medicationId_idx"
  ON "PharmacyMedicationSubscriptionItem"("medicationId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PharmacyMedicationSubscriptionItem_subscriptionId_fkey'
  ) THEN
    ALTER TABLE "PharmacyMedicationSubscriptionItem"
      ADD CONSTRAINT "PharmacyMedicationSubscriptionItem_subscriptionId_fkey"
      FOREIGN KEY ("subscriptionId") REFERENCES "PharmacyMedicationSubscription"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PharmacyReminderEvent" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "eventType" "PharmacyReminderEventType" NOT NULL,
  "notes" TEXT,
  "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PharmacyReminderEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PharmacyReminderEvent_subscriptionId_happenedAt_idx"
  ON "PharmacyReminderEvent"("subscriptionId", "happenedAt");

CREATE INDEX IF NOT EXISTS "PharmacyReminderEvent_eventType_happenedAt_idx"
  ON "PharmacyReminderEvent"("eventType", "happenedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PharmacyReminderEvent_subscriptionId_fkey'
  ) THEN
    ALTER TABLE "PharmacyReminderEvent"
      ADD CONSTRAINT "PharmacyReminderEvent_subscriptionId_fkey"
      FOREIGN KEY ("subscriptionId") REFERENCES "PharmacyMedicationSubscription"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PharmacyDiscountSubscriptionPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "percentage" DECIMAL(5,2) NOT NULL,
  "rules" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PharmacyDiscountSubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PharmacyDiscountSubscriptionPlan_isActive_createdAt_idx"
  ON "PharmacyDiscountSubscriptionPlan"("isActive", "createdAt");

CREATE TABLE IF NOT EXISTS "PharmacyDiscountSubscription" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "clientId" TEXT,
  "patientId" TEXT,
  "branchId" TEXT,
  "status" "PharmacySubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PharmacyDiscountSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PharmacyDiscountSubscription_planId_status_idx"
  ON "PharmacyDiscountSubscription"("planId", "status");

CREATE INDEX IF NOT EXISTS "PharmacyDiscountSubscription_clientId_status_idx"
  ON "PharmacyDiscountSubscription"("clientId", "status");

CREATE INDEX IF NOT EXISTS "PharmacyDiscountSubscription_patientId_status_idx"
  ON "PharmacyDiscountSubscription"("patientId", "status");

CREATE INDEX IF NOT EXISTS "PharmacyDiscountSubscription_branchId_status_idx"
  ON "PharmacyDiscountSubscription"("branchId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PharmacyDiscountSubscription_planId_fkey'
  ) THEN
    ALTER TABLE "PharmacyDiscountSubscription"
      ADD CONSTRAINT "PharmacyDiscountSubscription_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "PharmacyDiscountSubscriptionPlan"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PharmacyDiscountSubscription_branchId_fkey'
  ) THEN
    ALTER TABLE "PharmacyDiscountSubscription"
      ADD CONSTRAINT "PharmacyDiscountSubscription_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
