import test from "node:test";
import assert from "node:assert/strict";
import { buildOpsAlertCandidates } from "@/lib/ops/alerts";
import { buildOpsMetricsSnapshotServiceRows, isOpsAlertCooldownActive } from "@/lib/ops/store";
import type { OpsHealthSnapshot, OpsMetricsSnapshot } from "@/lib/ops/types";

function buildHealthSnapshot(input: {
  status: "ok" | "degraded" | "down";
  dbStatus: "up" | "down" | "degraded";
}): OpsHealthSnapshot {
  return {
    status: input.status,
    timestamp: "2026-02-20T12:00:00.000Z",
    durationMs: 120,
    build: {
      commit: "abc123",
      version: "1.0.0",
      nodeEnv: "test"
    },
    services: [
      {
        serviceKey: "app",
        label: "App",
        status: "up",
        required: true,
        latencyMs: 12,
        checkedAt: "2026-02-20T12:00:00.000Z"
      },
      {
        serviceKey: "db",
        label: "PostgreSQL",
        status: input.dbStatus,
        required: true,
        latencyMs: 22,
        checkedAt: "2026-02-20T12:00:00.000Z"
      }
    ]
  };
}

function buildMetricsSnapshot(cpuPct = 10, memPct = 40): OpsMetricsSnapshot {
  return {
    status: "ok",
    timestamp: "2026-02-20T12:00:00.000Z",
    range: "5m",
    projectName: "starmedical-local",
    durationMs: 90,
    services: [
      {
        serviceKey: "app",
        status: "up",
        sampleWindow: "5m",
        cpuPercent: cpuPct,
        cpuPct,
        memoryBytes: 500_000_000,
        memBytes: 500_000_000,
        memoryPercent: memPct,
        memPct,
        networkRxBytesPerSec: 10,
        netRxBytes: 10,
        networkTxBytesPerSec: 5,
        netTxBytes: 5,
        bandwidthBytesPerSec: 15,
        checkedAt: "2026-02-20T12:00:00.000Z"
      }
    ]
  };
}

test("ops scheduler: transición ok->down genera alerta de health_transition", () => {
  const alerts = buildOpsAlertCandidates({
    tenantId: "tenant_a",
    previousHealth: {
      status: "ok",
      services: {
        app: "up",
        db: "up"
      }
    },
    currentHealth: buildHealthSnapshot({ status: "down", dbStatus: "down" }),
    currentMetrics: buildMetricsSnapshot(20, 50)
  });

  const globalTransition = alerts.filter((item) => item.type === "health_transition" && item.toStatus === "down");
  assert.equal(globalTransition.length, 1);
  assert.equal(globalTransition[0]?.level, "critical");
});

test("ops scheduler: umbral de CPU alto produce dedupeKey estable", () => {
  const alerts = buildOpsAlertCandidates({
    tenantId: "tenant_a",
    previousHealth: null,
    currentHealth: buildHealthSnapshot({ status: "ok", dbStatus: "up" }),
    currentMetrics: buildMetricsSnapshot(92, 40)
  });

  const cpuAlerts = alerts.filter((item) => item.type === "metrics_threshold" && item.toStatus?.startsWith("cpu_"));
  assert.equal(cpuAlerts.length, 1);
  assert.equal(cpuAlerts[0]?.dedupeKey, "tenant_a:metrics_threshold:app:cpu_high");
});

test("ops scheduler: cooldown helper bloquea mientras no expira", () => {
  const now = new Date("2026-02-20T12:00:00.000Z").getTime();
  assert.equal(isOpsAlertCooldownActive("2026-02-20T12:09:00.000Z", now), true);
  assert.equal(isOpsAlertCooldownActive("2026-02-20T11:59:59.000Z", now), false);
});

test("ops metrics store helper: crea rows por servicio", () => {
  const snapshot = buildMetricsSnapshot(12, 51);
  snapshot.services.push({
    serviceKey: "db",
    status: "up",
    sampleWindow: "5m",
    cpuPercent: 30,
    cpuPct: 30,
    memoryBytes: 1_200_000_000,
    memBytes: 1_200_000_000,
    memoryPercent: 60,
    memPct: 60,
    networkRxBytesPerSec: 100,
    netRxBytes: 100,
    networkTxBytesPerSec: 80,
    netTxBytes: 80,
    bandwidthBytesPerSec: 180,
    checkedAt: "2026-02-20T12:00:00.000Z"
  });

  const rows = buildOpsMetricsSnapshotServiceRows({
    snapshotId: "snap_1",
    tenantId: "tenant_a",
    snapshot
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.snapshotId, "snap_1");
  assert.equal(rows[0]?.tenantId, "tenant_a");
  assert.equal(typeof rows[0]?.memoryBytes, "bigint");
});
