import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export async function nextSequence(client: PrismaClientOrTx = prisma, key: string, dateKey: string, branchId?: string | null) {
  const branch = branchId || "global";
  const updated = await client.labSequenceCounter.upsert({
    where: { key_dateKey_branchId: { key, dateKey, branchId: branch as any } },
    update: { lastValue: { increment: 1 } },
    create: { key, dateKey, branchId: branch, lastValue: 1 }
  });

  return updated.lastValue;
}
