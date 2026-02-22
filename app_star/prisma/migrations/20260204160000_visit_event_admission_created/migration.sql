-- Reception: add admission event type for VisitEvent audit
ALTER TYPE "VisitEventType" ADD VALUE IF NOT EXISTS 'ADMISSION_CREATED';
