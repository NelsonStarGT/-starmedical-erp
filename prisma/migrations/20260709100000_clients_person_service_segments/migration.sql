DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientServiceSegment') THEN
    CREATE TYPE "ClientServiceSegment" AS ENUM ('PARTICULAR', 'COMPANY', 'INSTITUTION', 'INSURER');
  END IF;
END$$;

ALTER TABLE "ClientProfile"
  ADD COLUMN IF NOT EXISTS "serviceSegments" "ClientServiceSegment"[] DEFAULT ARRAY['PARTICULAR']::"ClientServiceSegment"[];

UPDATE "ClientProfile"
SET "serviceSegments" = ARRAY['PARTICULAR']::"ClientServiceSegment"[]
WHERE "serviceSegments" IS NULL;

ALTER TABLE "ClientProfile"
  ALTER COLUMN "serviceSegments" SET DEFAULT ARRAY['PARTICULAR']::"ClientServiceSegment"[],
  ALTER COLUMN "serviceSegments" SET NOT NULL;
