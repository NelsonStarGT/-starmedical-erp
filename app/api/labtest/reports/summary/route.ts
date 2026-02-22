import { NextRequest } from "next/server";
import { LabTestPriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { getLabTestSettings } from "@/lib/labtest/settings";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  try {
    const settings = await getLabTestSettings();
    const today = toParam ? new Date(toParam) : new Date();
    const fromDefault = new Date(today);
    fromDefault.setDate(fromDefault.getDate() - (settings.reportsDefaultRangeDays || 7));

    const from = fromParam ? new Date(fromParam) : fromDefault;
    const to = toParam ? new Date(toParam) : today;

    const branchId = auth.user?.branchId || undefined;
    const orderWhere = {
      createdAt: { gte: from, lte: to },
      ...(branchId ? { branchId } : {})
    };

    const totalOrders = await prisma.labTestOrder.count({ where: orderWhere });

    const byPriority = await Promise.all(
      Object.values(LabTestPriority).map(async (priority) => ({
        priority,
        count: await prisma.labTestOrder.count({ where: { ...orderWhere, priority } })
      }))
    );

    const itemsForStats = await prisma.labTestItem.findMany({
      where: { order: orderWhere },
      select: { area: true, name: true }
    });

    const byAreaMap: Record<string, number> = {};
    const testFreq: Record<string, number> = {};
    for (const it of itemsForStats) {
      byAreaMap[it.area] = (byAreaMap[it.area] || 0) + 1;
      testFreq[it.name] = (testFreq[it.name] || 0) + 1;
    }
    const byArea = Object.entries(byAreaMap).map(([area, count]) => ({ area, count }));
    const topTests = Object.entries(testFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const releasedResults = await prisma.labTestResult.findMany({
      where: { releasedAt: { not: null }, item: { order: orderWhere } },
      select: {
        releasedAt: true,
        item: { select: { order: { select: { createdAt: true } } } }
      }
    });

    const tatReleased = releasedResults
      .map((res) => {
        if (!res.releasedAt) return null;
        const start = res.item.order.createdAt;
        return (res.releasedAt.getTime() - start.getTime()) / 60000;
      })
      .filter((v): v is number => v !== null);
    const avgTATReleasedMin = tatReleased.length ? Math.round(tatReleased.reduce((a, b) => a + b, 0) / tatReleased.length) : null;

    const sentOrders = await prisma.labTestOrder.findMany({
      where: { ...orderWhere, sentAt: { not: null } },
      select: { createdAt: true, sentAt: true }
    });
    const tatSent = sentOrders
      .map((order) => {
        if (!order.sentAt) return null;
        return (order.sentAt.getTime() - order.createdAt.getTime()) / 60000;
      })
      .filter((v): v is number => v !== null);
    const avgTATSentMin = tatSent.length ? Math.round(tatSent.reduce((a, b) => a + b, 0) / tatSent.length) : null;

    const pendingCounts = {
      requirements: await prisma.labTestOrder.count({ where: { ...orderWhere, status: "REQUIREMENTS_PENDING" } }),
      collection: await prisma.labTestOrder.count({ where: { ...orderWhere, status: "READY_FOR_COLLECTION" } }),
      inProcess: await prisma.labTestItem.count({ where: { order: orderWhere, status: "IN_PROCESS" } }),
      validation: await prisma.labTestItem.count({ where: { order: orderWhere, status: "RESULT_CAPTURED" } })
    };

    return jsonOk({
      range: { from: from.toISOString(), to: to.toISOString() },
      totalOrders,
      byPriority,
      byArea,
      avgTATReleasedMin,
      avgTATSentMin,
      pendingCounts,
      topTests
    });
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError((err as any)?.message || "No se pudo generar el resumen", 500);
  }
}
