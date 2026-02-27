import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { purgeSystemEventLogs, resolveSystemEventDigest } from "@/lib/ops/eventLog.server";

test("resolveSystemEventDigest persiste resolución por digest con filtros tenant/domain", async () => {
  const original = (prisma as any).systemEventLog.updateMany;
  let captured: any = null;
  (prisma as any).systemEventLog.updateMany = async (args: any) => {
    captured = args;
    return { count: 4 };
  };

  try {
    const result = await resolveSystemEventDigest({
      digest: "digest-123",
      resolved: true,
      resolutionNote: " Resuelto por migración aplicada ",
      resolvedByUserId: "user-1",
      tenantId: "tenant-alpha",
      domain: "clients"
    });

    assert.equal(result.updatedCount, 4);
    assert.equal(result.resolved, true);
    assert.equal(captured.where.digest, "digest-123");
    assert.equal(captured.where.tenantId, "tenant-alpha");
    assert.equal(captured.where.domain, "clients");
    assert.equal(captured.data.resolvedByUserId, "user-1");
    assert.equal(captured.data.resolutionNote, "Resuelto por migración aplicada");
    assert.ok(captured.data.resolvedAt instanceof Date);
  } finally {
    (prisma as any).systemEventLog.updateMany = original;
  }
});

test("resolveSystemEventDigest limpia resolución cuando se marca pendiente", async () => {
  const original = (prisma as any).systemEventLog.updateMany;
  let captured: any = null;
  (prisma as any).systemEventLog.updateMany = async (args: any) => {
    captured = args;
    return { count: 2 };
  };

  try {
    const result = await resolveSystemEventDigest({
      digest: "digest-456",
      resolved: false
    });

    assert.equal(result.updatedCount, 2);
    assert.equal(result.resolved, false);
    assert.deepEqual(captured.data, {
      resolvedAt: null,
      resolvedByUserId: null,
      resolutionNote: null
    });
  } finally {
    (prisma as any).systemEventLog.updateMany = original;
  }
});

test("purgeSystemEventLogs aplica retención 30d por defecto", async () => {
  const original = (prisma as any).systemEventLog.deleteMany;
  let captured: any = null;
  (prisma as any).systemEventLog.deleteMany = async (args: any) => {
    captured = args;
    return { count: 9 };
  };

  try {
    const startMs = Date.now();
    const result = await purgeSystemEventLogs();
    const expectedCutoffMs = startMs - 30 * 24 * 60 * 60 * 1000;
    const actualCutoffMs = new Date(captured.where.createdAt.lt).getTime();

    assert.equal(result.deletedCount, 9);
    assert.equal(result.retentionDays, 30);
    assert.ok(Math.abs(actualCutoffMs - expectedCutoffMs) < 5000);
    assert.equal(captured.where.tenantId, undefined);
  } finally {
    (prisma as any).systemEventLog.deleteMany = original;
  }
});
