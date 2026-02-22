import { EventEmitter } from "events";
import { Cita } from "@/lib/types/agenda";

export type AgendaEvent =
  | { type: "appointment_created"; data: Cita }
  | { type: "appointment_updated"; data: Cita }
  | { type: "appointment_deleted"; data: { id: string; sucursalId?: string | null } };

class AgendaEmitter extends EventEmitter {}

export const agendaEmitter = new AgendaEmitter();
