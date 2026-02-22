import { NextRequest } from "next/server";
import { LabArea, LabTestPriority, LabTestStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { serializeLabOrder } from "@/lib/labtest/transformers";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const areaParam = url.searchParams.get("area");
  const priorityParam = url.searchParams.get("priority");
  const statusParam = url.searchParams.get("status");

  const where: Prisma.LabTestResultWhereInput = {};
  const dates: any = {};
  if (fromParam) {
    const fromDate = new Date(fromParam);
    if (!isNaN(fromDate.valueOf())) dates.gte = fromDate;
  }
  if (toParam) {
    const toDate = new Date(toParam);
    if (!isNaN(toDate.valueOf())) dates.lte = toDate;
  }
  if (Object.keys(dates).length) {
    where.createdAt = dates;
  }

  if (statusParam && Object.values(LabTestStatus).includes(statusParam as LabTestStatus)) {
    where.status = statusParam as LabTestStatus;
  }

  const itemFilter: Prisma.LabTestItemWhereInput = {};
  const branchId = auth.user?.branchId || undefined;
  const orderFilter: Prisma.LabTestOrderWhereInput = {};
  if (areaParam && Object.values(LabArea).includes(areaParam as LabArea)) {
    itemFilter.area = areaParam as LabArea;
  }
  if (priorityParam && Object.values(LabTestPriority).includes(priorityParam as LabTestPriority)) {
    orderFilter.priority = priorityParam as LabTestPriority;
  }
  if (branchId) {
    orderFilter.branchId = branchId;
  }
  if (Object.keys(orderFilter).length) {
    itemFilter.order = orderFilter;
  }
  if (Object.keys(itemFilter).length) {
    where.item = itemFilter;
  }

  try {
    const results = await prisma.labTestResult.findMany({
      where,
      include: {
        item: {
          include: {
            order: { include: { patient: true, labPatient: true } },
            sample: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    const data = results.map((res) => ({
      ...res,
      item: {
        ...res.item,
        order: serializeLabOrder(res.item.order)
      }
    }));

    return jsonOk(data);
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError((err as any)?.message || "No se pudo obtener bitácora de resultados", 500);
  }
}
