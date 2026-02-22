import type { AgendaRow, MedicalPersona, QuickHistory } from "@/components/medical/agenda/types";

export type WorklistQuickFilterKey =
  | "today"
  | "overdue"
  | "waiting"
  | "triage"
  | "ready"
  | "in_consult"
  | "done";

export type WorklistFiltersState = {
  quick: WorklistQuickFilterKey;
  query: string;
};

export type WorklistRow = AgendaRow & {
  queueItemId: string;
  ticketCode: string;
};

export type WorklistMockSnapshot = {
  items: WorklistRow[];
  quickHistoryByPatientId: Record<string, QuickHistory>;
};

export type { MedicalPersona };

