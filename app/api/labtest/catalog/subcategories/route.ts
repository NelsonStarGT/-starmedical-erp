import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { labCatalogSubcategorySchema } from "@/lib/labtest/schemas";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const subs = await prisma.labTestCatalogSubcategory.findMany({
      include: { category: true },
      orderBy: [{ order: "asc" }, { name: "asc" }]
    });
    return jsonOk(subs);
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError((err as any)?.message || "No se pudo listar subcategorías", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:ADMIN");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = labCatalogSubcategorySchema.safeParse(body);
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");
  const input = parsed.data;

  try {
    const saved = input.id
      ? await prisma.labTestCatalogSubcategory.upsert({
          where: { id: input.id },
          update: { categoryId: input.categoryId, name: input.name, order: input.order ?? 0, isActive: input.isActive ?? true },
          create: { id: input.id, categoryId: input.categoryId, name: input.name, order: input.order ?? 0, isActive: input.isActive ?? true }
        })
      : await prisma.labTestCatalogSubcategory.create({
          data: { categoryId: input.categoryId, name: input.name, order: input.order ?? 0, isActive: input.isActive ?? true }
        });

    return jsonOk(saved, input.id ? 200 : 201);
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError((err as any)?.message || "No se pudo guardar la subcategoría", 500);
  }
}
