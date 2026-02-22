import { NextRequest } from "next/server";
import { LabArea, LabTestPriority, LabTestStatus } from "@prisma/client";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { listRequirements } from "@/lib/server/labtest.service";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const priorityParam = searchParams.get("priority");
  const areaParam = searchParams.get("area");
  const fastingParam = searchParams.get("fasting");

  let status: LabTestStatus | undefined;
  if (statusParam && Object.values(LabTestStatus).includes(statusParam as LabTestStatus)) {
    status = statusParam as LabTestStatus;
  }
  let priority: LabTestPriority | undefined;
  if (priorityParam && Object.values(LabTestPriority).includes(priorityParam as LabTestPriority)) {
    priority = priorityParam as LabTestPriority;
  }
  let area: LabArea | undefined;
  if (areaParam && Object.values(LabArea).includes(areaParam as LabArea)) {
    area = areaParam as LabArea;
  }

  const fasting = fastingParam === "required" || fastingParam === "confirmed" || fastingParam === "unconfirmed" ? fastingParam : undefined;

  const data = await listRequirements({ status, priority, area, fasting });
  return jsonOk(data);
}
