-- Persona blood type should be optional (null when unknown).
ALTER TABLE "ClientProfile"
  ALTER COLUMN "bloodType" DROP DEFAULT;
