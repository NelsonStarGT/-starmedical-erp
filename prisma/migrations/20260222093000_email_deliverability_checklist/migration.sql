-- Add tenant-scoped SMTP deliverability checklist (SPF/DKIM/DMARC) storage
ALTER TABLE "GlobalEmailConfig"
ADD COLUMN IF NOT EXISTS "deliverabilityChecklist" JSONB;
