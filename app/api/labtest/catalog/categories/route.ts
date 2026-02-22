import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { labCatalogCategorySchema } from "@/lib/labtest/schemas";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const categories = await prisma.labTestCatalogCategory.findMany({
      include: { subcats: true },
      orderBy: [{ order: "asc" }, { name: "asc" }]
    });
    return jsonOk(categories);
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError((err as any)?.message || "No se pudo listar categorías", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:ADMIN");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = labCatalogCategorySchema.safeParse(body);
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");
  const input = parsed.data;

  try {
    const saved = input.id
      ? await prisma.labTestCatalogCategory.upsert({
          where: { id: input.id },
          update: { name: input.name, order: input.order ?? 0, isActive: input.isActive ?? true },
          create: { id: input.id, name: input.name, order: input.order ?? 0, isActive: input.isActive ?? true }
        })
      : await prisma.labTestCatalogCategory.create({
          data: { name: input.name, order: input.order ?? 0, isActive: input.isActive ?? true }
        });

    return jsonOk(saved, input.id ? 200 : 201);
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError((err as any)?.message || "No se pudo guardar la categoría", 500);
  }
}
