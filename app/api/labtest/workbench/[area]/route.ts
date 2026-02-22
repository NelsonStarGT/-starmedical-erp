import { NextRequest } from "next/server";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { listWorkbench } from "@/lib/server/labtest.service";
import { slugToArea } from "@/lib/labtest/areas";

export async function GET(_req: NextRequest, { params }: { params: { area: string } }) {
  const auth = await requireLabTestPermission(_req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const area = slugToArea[params.area] || null;
  if (!area) {
    return jsonError("Área inválida", 400, "INVALID_AREA");
  }

  const data = await listWorkbench(area);
  return jsonOk(data);
}
