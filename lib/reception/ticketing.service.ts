import "server-only";

import { OperationalArea, type Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export type GenerateTicketInput = {
  siteId: string;
  area: OperationalArea;
  date?: Date;
};

export function getTicketPrefix(area: OperationalArea): string {
  switch (area) {
    case OperationalArea.CONSULTATION:
      return "C-";
    case OperationalArea.LAB:
      return "L-";
    case OperationalArea.XRAY:
      return "RX-";
    case OperationalArea.ULTRASOUND:
      return "US-";
    case OperationalArea.URGENT_CARE:
      return "U-";
    default: {
      const exhaustive: never = area;
      throw new Error(`Área no soportada para ticket: ${exhaustive}`);
    }
  }
}

export function getTicketDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function generateNextTicket(
  input: GenerateTicketInput,
  client: PrismaClientOrTx = prisma
): Promise<string> {
  const dateKey = getTicketDateKey(input.date ?? new Date());
  const seq = await client.ticketSequence.upsert({
    where: {
      siteId_area_dateKey: {
        siteId: input.siteId,
        area: input.area,
        dateKey
      }
    },
    update: {
      lastNumber: { increment: 1 }
    },
    create: {
      siteId: input.siteId,
      area: input.area,
      dateKey,
      lastNumber: 1
    }
  });

  const prefix = getTicketPrefix(input.area);
  const padded = String(seq.lastNumber).padStart(3, "0");
  return `${prefix}${padded}`;
}
