-- Memberships P2: recurrente gateway + billing profile + webhook events

ALTER TYPE "MembershipStatus"
  ADD VALUE IF NOT EXISTS 'PENDIENTE_PAGO';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipBillingProvider') THEN
    CREATE TYPE "MembershipBillingProvider" AS ENUM ('MANUAL', 'RECURRENT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MembershipGatewayConfig" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "provider" "MembershipBillingProvider" NOT NULL DEFAULT 'RECURRENT',
  "apiKey" TEXT,
  "webhookSecret" TEXT,
  "mode" TEXT NOT NULL DEFAULT 'test',
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "lastWebhookAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipGatewayConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MembershipContractBillingProfile" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "provider" "MembershipBillingProvider" NOT NULL DEFAULT 'MANUAL',
  "recurrenteCustomerId" TEXT,
  "recurrenteSubscriptionId" TEXT,
  "lastPaymentIntentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipContractBillingProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MembershipContractBillingProfile_contractId_key"
  ON "MembershipContractBillingProfile"("contractId");

CREATE INDEX IF NOT EXISTS "MembershipContractBillingProfile_provider_status_idx"
  ON "MembershipContractBillingProfile"("provider", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MembershipContractBillingProfile_contractId_fkey'
  ) THEN
    ALTER TABLE "MembershipContractBillingProfile"
      ADD CONSTRAINT "MembershipContractBillingProfile_contractId_fkey"
      FOREIGN KEY ("contractId") REFERENCES "MembershipContract"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MembershipWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "MembershipBillingProvider" NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "signature" TEXT,
  "contractId" TEXT,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MembershipWebhookEvent_eventId_key"
  ON "MembershipWebhookEvent"("eventId");

CREATE INDEX IF NOT EXISTS "MembershipWebhookEvent_provider_createdAt_idx"
  ON "MembershipWebhookEvent"("provider", "createdAt");

CREATE INDEX IF NOT EXISTS "MembershipWebhookEvent_contractId_idx"
  ON "MembershipWebhookEvent"("contractId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MembershipWebhookEvent_contractId_fkey'
  ) THEN
    ALTER TABLE "MembershipWebhookEvent"
      ADD CONSTRAINT "MembershipWebhookEvent_contractId_fkey"
      FOREIGN KEY ("contractId") REFERENCES "MembershipContract"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
