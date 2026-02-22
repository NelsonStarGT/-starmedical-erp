-- Add logoFileKey to store the storage path for the institutional logo
ALTER TABLE "HrSettings" ADD COLUMN IF NOT EXISTS "logoFileKey" TEXT;
