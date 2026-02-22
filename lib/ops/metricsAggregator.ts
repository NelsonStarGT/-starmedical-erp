import os from "node:os";
import { prisma } from "@/lib/prisma";
import type { OpsMetricsRange, OpsMetricsServiceRow, OpsMetricsSnapshot } from "@/lib/ops/types";

function resolveRange(input?: string | null): OpsMetricsRange {
  const normalized = String(input || "").trim().toLowerCase();
  if (normalized === "15m") return "15m";
  if (normalized === "1h") return "1h";
  return "5m";
}

function appServiceRow(range: OpsMetricsRange): OpsMetricsServiceRow {
  const cpuCount = Math.max(1, os.cpus().length || 1);
  const load = os.loadavg()[0] || 0;
  const cpuPercent = Math.max(0, Math.min(100, (load / cpuCount) * 100));
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = Math.max(0, totalMem - freeMem);
  const memPct = totalMem > 0 ? (usedMem / totalMem) * 100 : null;

  return {
    serviceKey: "app",
    status: "up",
    sampleWindow: range,
    cpuPercent,
    cpuPct: cpuPercent,
    memoryBytes: usedMem,
    memBytes: usedMem,
    memoryPercent: memPct,
    memPct,
    networkRxBytesPerSec: 0,
    netRxBytes: 0,
    networkTxBytesPerSec: 0,
    netTxBytes: 0,
    bandwidthBytesPerSec: 0,
    checkedAt: new Date().toISOString()
  };
}

async function dbServiceRow(range: OpsMetricsRange): Promise<OpsMetricsServiceRow> {
  const checkedAt = new Date().toISOString();
  try {
    await (prisma as any).$queryRaw`SELECT 1`;
    return {
      serviceKey: "db",
      status: "up",
      sampleWindow: range,
      cpuPercent: 0,
      cpuPct: 0,
      memoryBytes: 0,
      memBytes: 0,
      memoryPercent: null,
      memPct: null,
      networkRxBytesPerSec: 0,
      netRxBytes: 0,
      networkTxBytesPerSec: 0,
      netTxBytes: 0,
      bandwidthBytesPerSec: 0,
      checkedAt
    };
  } catch {
    return {
      serviceKey: "db",
      status: "down",
      sampleWindow: range,
      cpuPercent: 0,
      cpuPct: 0,
      memoryBytes: 0,
      memBytes: 0,
      memoryPercent: null,
      memPct: null,
      networkRxBytesPerSec: 0,
      netRxBytes: 0,
      networkTxBytesPerSec: 0,
      netTxBytes: 0,
      bandwidthBytesPerSec: 0,
      checkedAt
    };
  }
}

export async function collectOpsMetricsSnapshot(input?: { range?: string | null; tenantId?: string | null }): Promise<OpsMetricsSnapshot> {
  const startedAt = Date.now();
  const range = resolveRange(input?.range);
  const services = [appServiceRow(range), await dbServiceRow(range)];
  const status = services.some((service) => service.status === "down") ? "down" : "ok";

  return {
    status,
    timestamp: new Date().toISOString(),
    range,
    projectName: process.env.OPS_PROJECT_PREFIX || "starmedical",
    durationMs: Date.now() - startedAt,
    services
  };
}
