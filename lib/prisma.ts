import { PrismaClient } from "@prisma/client";

if (typeof window !== "undefined") {
  throw new Error("lib/prisma.ts solo puede importarse en entorno server.");
}

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
