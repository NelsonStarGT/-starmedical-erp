import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { instrumentSchema } from "@/lib/labtest/schemas";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;
  const instruments = await prisma.labInstrument.findMany({ orderBy: { name: "asc" } });
  return jsonOk(instruments);
}

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, ["LABTEST:WRITE", "LABTEST:ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = instrumentSchema.safeParse(body);
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");
  const input = parsed.data;

  const inst = await prisma.labInstrument.upsert({
    where: { id: input.id || "new" },
    update: {
      name: input.name,
      area: input.area,
      connectionStatus: input.connectionStatus || "UNKNOWN",
      mappingJson: input.mappingJson || {},
      notes: input.notes || null
    },
    create: {
      name: input.name,
      area: input.area,
      connectionStatus: input.connectionStatus || "UNKNOWN",
      mappingJson: input.mappingJson || {},
      notes: input.notes || null,
      createdById: auth.user?.id || null
    }
  });

  return jsonOk(inst, input.id ? 200 : 201);
}
