import { NextRequest } from "next/server";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { prisma } from "@/lib/prisma";
import { templateSchema } from "@/lib/labtest/schemas";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;
  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area") || undefined;
  const templates = await prisma.labTemplate.findMany({
    where: area ? { area: area as any } : undefined,
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
  });
  return jsonOk(templates);
}

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:ADMIN");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");
  const input = parsed.data;

  const template = await prisma.labTemplate.upsert({
    where: { id: input.id || "new" },
    update: {
      title: input.title,
      area: input.area,
      html: input.html,
      isDefault: input.isDefault ?? false,
      createdById: auth.user?.id || null
    },
    create: {
      title: input.title,
      area: input.area,
      html: input.html,
      isDefault: input.isDefault ?? false,
      createdById: auth.user?.id || null
    }
  });

  return jsonOk(template, input.id ? 200 : 201);
}
