#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isMissingSystemEventLogTable(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    if ((error as { code?: unknown }).code === "P2021") return true;
  }
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();
  return normalized.includes("systemeventlog") && normalized.includes("does not exist");
}

function parseNumberFlag(flagName: string, defaultValue: number) {
  const flag = process.argv.find((item) => item.startsWith(`${flagName}=`));
  if (!flag) return defaultValue;
  const raw = Number(flag.split("=")[1]);
  if (!Number.isFinite(raw)) return defaultValue;
  return Math.min(Math.max(Math.trunc(raw), 1), 365);
}

function parseStringFlag(flagName: string) {
  const flag = process.argv.find((item) => item.startsWith(`${flagName}=`));
  if (!flag) return null;
  const value = (flag.split("=")[1] || "").trim();
  return value ? value : null;
}

async function run() {
  const days = parseNumberFlag("--days", 30);
  const tenantId = parseStringFlag("--tenant");
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let result: { count: number };
  try {
    result = await prisma.systemEventLog.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        ...(tenantId ? { tenantId } : {})
      }
    });
  } catch (error) {
    if (isMissingSystemEventLogTable(error)) {
      console.warn("[ops:events:purge] skipped: SystemEventLog table missing (run migrations first).");
      return;
    }
    throw error;
  }

  console.info(
    `[ops:events:purge] deleted=${result.count} retentionDays=${days} cutoff=${cutoff.toISOString()}${tenantId ? ` tenant=${tenantId}` : ""}`
  );
}

run()
  .catch((error) => {
    console.error("[ops:events:purge] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
