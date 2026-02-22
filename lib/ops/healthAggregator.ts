import { prisma } from "@/lib/prisma";
import type { OpsHealthGlobalStatus, OpsHealthServiceReport, OpsHealthSnapshot } from "@/lib/ops/types";

function getBuildInfo() {
  return {
    commit: process.env.GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
    version: process.env.APP_VERSION || process.env.npm_package_version || "0.0.0",
    nodeEnv: process.env.NODE_ENV || "development"
  };
}

function nowIso() {
  return new Date().toISOString();
}

function toGlobalStatus(services: OpsHealthServiceReport[]): OpsHealthGlobalStatus {
  const required = services.filter((service) => service.required);
  if (required.some((service) => service.status === "down")) return "down";
  if (required.some((service) => service.status === "degraded" || service.status === "optional_down")) return "degraded";
  return "ok";
}

async function checkDb(): Promise<OpsHealthServiceReport> {
  const startedAt = Date.now();
  try {
    await (prisma as any).$queryRaw`SELECT 1`;
    return {
      serviceKey: "db",
      label: "Postgres",
      status: "up",
      required: true,
      latencyMs: Date.now() - startedAt,
      checkedAt: nowIso(),
      detail: "ok"
    };
  } catch (error) {
    return {
      serviceKey: "db",
      label: "Postgres",
      status: "down",
      required: true,
      latencyMs: Date.now() - startedAt,
      checkedAt: nowIso(),
      detail: error instanceof Error ? error.message : "db_unreachable"
    };
  }
}

function checkApp(): OpsHealthServiceReport {
  return {
    serviceKey: "app",
    label: "Next.js API",
    status: "up",
    required: true,
    latencyMs: 0,
    checkedAt: nowIso(),
    detail: "running"
  };
}

export async function collectOpsHealthSnapshot(): Promise<OpsHealthSnapshot> {
  const startedAt = Date.now();
  const services = [checkApp(), await checkDb()];

  return {
    status: toGlobalStatus(services),
    timestamp: nowIso(),
    durationMs: Date.now() - startedAt,
    build: getBuildInfo(),
    services
  };
}
