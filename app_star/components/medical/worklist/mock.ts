import type { WorklistMockSnapshot, WorklistRow } from "./types";
import type { AgendaRow } from "@/components/medical/agenda/types";
import { buildAgendaMockData } from "@/components/medical/agenda/mock";

export function buildWorklistMockData(params: {
  date: string;
  myDoctorId: string;
  myDoctorName: string;
}): WorklistMockSnapshot {
  const base = buildAgendaMockData(params);

  const items: WorklistRow[] = base.rows.map((row: AgendaRow, idx) => ({
    ...row,
    queueItemId: `qi-${row.id}`,
    ticketCode: `SM-${String(idx + 1).padStart(3, "0")}`
  }));

  // Add a couple of non-happy-path states for UI coverage.
  if (items[2]) items[2] = { ...items[2], status: "rescheduled" };
  if (items[7]) items[7] = { ...items[7], status: "no_show" };

  return { items, quickHistoryByPatientId: base.quickHistoryByPatientId };
}

