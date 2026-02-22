import type { OperationalArea, QueueItemStatus } from "@prisma/client";

export type PublicTurnoState = QueueItemStatus;

export type PublicTurnoItem = {
  ticketCode: string;
  state: PublicTurnoState;
  roomLabel?: string | null;
  calledAt?: string | null;
};

export type PublicTurnosArea = {
  area: OperationalArea;
  nowServing: PublicTurnoItem[];
  calling: PublicTurnoItem[];
  waiting: PublicTurnoItem[];
};

export type PublicTurnosResponse = {
  siteId: string;
  generatedAt: string;
  areas: PublicTurnosArea[];
};

export type GetPublicTurnosInput = {
  siteId: string;
  area?: OperationalArea;
  limit?: number;
};
