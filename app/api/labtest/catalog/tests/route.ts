import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { labCatalogTestSchema } from "@/lib/labtest/schemas";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const tests = await prisma.labTestCatalogTest.findMany({
      include: { category: true, subcategory: true },
      orderBy: [{ name: "asc" }]
    });
    return jsonOk(tests);
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError((err as any)?.message || "No se pudo listar pruebas", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:ADMIN");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = labCatalogTestSchema.safeParse(body);
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");
  const input = parsed.data;

  try {
    const saved = input.id
      ? await prisma.labTestCatalogTest.upsert({
          where: { id: input.id },
          update: {
            code: input.code,
            name: input.name,
            area: input.area,
            categoryId: input.categoryId || null,
            subcategoryId: input.subcategoryId || null,
            sampleTypeDefault: input.sampleTypeDefault || null,
            isActive: input.isActive ?? true
          },
          create: {
            id: input.id,
            code: input.code,
            name: input.name,
            area: input.area,
            categoryId: input.categoryId || null,
            subcategoryId: input.subcategoryId || null,
            sampleTypeDefault: input.sampleTypeDefault || null,
            isActive: input.isActive ?? true
          }
        })
      : await prisma.labTestCatalogTest.create({
          data: {
            code: input.code,
            name: input.name,
            area: input.area,
            categoryId: input.categoryId || null,
            subcategoryId: input.subcategoryId || null,
            sampleTypeDefault: input.sampleTypeDefault || null,
            isActive: input.isActive ?? true
          }
        });

    return jsonOk(saved, input.id ? 200 : 201);
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError((err as any)?.message || "No se pudo guardar la prueba", 500);
  }
}
