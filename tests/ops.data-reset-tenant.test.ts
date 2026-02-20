import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { executeOpsDataReset } from "@/lib/ops/dataReset";

type DelegateMap = Record<string, unknown>;

function snapshotDelegates(keys: string[]) {
  const source = prisma as unknown as DelegateMap;
  const snapshot: DelegateMap = {};
  for (const key of keys) {
    snapshot[key] = source[key];
  }
  return snapshot;
}

function restoreDelegates(snapshot: DelegateMap) {
  const source = prisma as unknown as DelegateMap;
  for (const [key, value] of Object.entries(snapshot)) {
    source[key] = value;
  }
}

const DELEGATE_KEYS = [
  "inventoryMovement",
  "productStock",
  "opsHealthCheck",
  "processingArtifact",
  "processingJob",
  "portalSessionRotationLog",
  "portalSession",
  "portalOtpChallenge"
];

test("ops data reset: inventory_runtime con tenant scope se salta por no tenantId en tablas", async () => {
  const snapshot = snapshotDelegates(DELEGATE_KEYS);
  let inventoryCalled = false;
  let stockCalled = false;

  try {
    (prisma as any).inventoryMovement = {
      deleteMany: async () => {
        inventoryCalled = true;
        return { count: 10 };
      }
    };
    (prisma as any).productStock = {
      updateMany: async () => {
        stockCalled = true;
        return { count: 5 };
      }
    };

    const result = await executeOpsDataReset({
      scope: "module",
      module: "inventory_runtime",
      tenantId: "tenant-a"
    });

    assert.equal(inventoryCalled, false);
    assert.equal(stockCalled, false);
    assert.equal(result.summary.skipped_no_tenant_inventory_runtime, 2);
    assert.equal(result.summary.skipped_no_tenant, 2);
  } finally {
    restoreDelegates(snapshot);
  }
});

test("ops data reset: módulo tenant-aware requiere tenantId", async () => {
  await assert.rejects(
    executeOpsDataReset({
      scope: "module",
      module: "processing_jobs",
      tenantId: null
    }),
    /tenant_id_required/
  );
});

test("ops data reset: processing_jobs filtra deleteMany por tenantId", async () => {
  const snapshot = snapshotDelegates(DELEGATE_KEYS);
  const artifactArgs: unknown[] = [];
  const jobArgs: unknown[] = [];

  try {
    (prisma as any).processingArtifact = {
      deleteMany: async (args: unknown) => {
        artifactArgs.push(args);
        return { count: 3 };
      }
    };
    (prisma as any).processingJob = {
      deleteMany: async (args: unknown) => {
        jobArgs.push(args);
        return { count: 2 };
      }
    };

    const result = await executeOpsDataReset({
      scope: "module",
      module: "processing_jobs",
      tenantId: "tenant-42"
    });

    assert.equal(result.summary.deletedProcessingArtifacts, 3);
    assert.equal(result.summary.deletedProcessingJobs, 2);

    assert.deepEqual(artifactArgs[0], { where: { job: { tenantId: "tenant-42" } } });
    assert.deepEqual(jobArgs[0], { where: { tenantId: "tenant-42" } });
  } finally {
    restoreDelegates(snapshot);
  }
});
