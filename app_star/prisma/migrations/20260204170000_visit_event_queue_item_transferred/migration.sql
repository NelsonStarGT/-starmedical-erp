-- Add new VisitEventType for queue transfers (Reception v2).
ALTER TYPE "VisitEventType" ADD VALUE IF NOT EXISTS 'QUEUE_ITEM_TRANSFERRED';
