DO $$ BEGIN
  CREATE TYPE "ClientPhoneRelationType" AS ENUM ('TITULAR', 'CONYUGE', 'HIJO_A', 'MADRE', 'PADRE', 'ENCARGADO', 'OTRO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ClientPhone"
  ADD COLUMN IF NOT EXISTS "relationType" "ClientPhoneRelationType",
  ADD COLUMN IF NOT EXISTS "canCall" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "canWhatsapp" BOOLEAN;

UPDATE "ClientPhone"
SET
  "relationType" = COALESCE("relationType", 'TITULAR'::"ClientPhoneRelationType"),
  "canCall" = COALESCE("canCall", true),
  "canWhatsapp" = COALESCE("canWhatsapp", false)
WHERE "relationType" IS NULL OR "canCall" IS NULL OR "canWhatsapp" IS NULL;

ALTER TABLE "ClientPhone"
  ALTER COLUMN "relationType" SET DEFAULT 'TITULAR'::"ClientPhoneRelationType",
  ALTER COLUMN "relationType" SET NOT NULL,
  ALTER COLUMN "canCall" SET DEFAULT true,
  ALTER COLUMN "canCall" SET NOT NULL,
  ALTER COLUMN "canWhatsapp" SET DEFAULT false,
  ALTER COLUMN "canWhatsapp" SET NOT NULL;

ALTER TABLE "ClientProfile"
  ADD COLUMN IF NOT EXISTS "institutionIsPublic" BOOLEAN;
