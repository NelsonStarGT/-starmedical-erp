-- Add phonesJson to store multiple phones for contacts/patients
ALTER TABLE "CrmContact" ADD COLUMN "phonesJson" JSONB;
