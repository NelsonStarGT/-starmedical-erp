import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { labTemplateV2Schema } from "@/lib/labtest/schemas";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const templates = await prisma.labTemplateV2.findMany({
      include: { fields: { where: { isActive: true }, orderBy: [{ order: "asc" }, { label: "asc" }] } },
      orderBy: [{ area: "asc" }, { isDefault: "desc" }, { updatedAt: "desc" }]
    });
    return jsonOk(templates);
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError((err as any)?.message || "No se pudieron listar plantillas v2", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:ADMIN");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = labTemplateV2Schema.safeParse(body);
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");
  const input = parsed.data;
  const guard = `${input.headerHtml || ""}${input.footerHtml || ""}`.toLowerCase();
  if (guard.includes("<script") || guard.includes("onload=") || guard.includes("onclick=")) {
    return jsonError("Template inseguro", 400, "INVALID_TEMPLATE");
  }

  try {
    const saved = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.labTemplateV2.updateMany({ where: { area: input.area }, data: { isDefault: false } });
      }

      const baseData = {
        title: input.title,
        area: input.area,
        headerHtml: input.headerHtml || null,
        footerHtml: input.footerHtml || null,
        isDefault: input.isDefault ?? false,
        createdById: auth.user?.id || null
      };

      const tpl = input.id
        ? await tx.labTemplateV2.upsert({
            where: { id: input.id },
            update: baseData,
            create: { id: input.id, ...baseData }
          })
        : await tx.labTemplateV2.create({ data: baseData });

      if (input.fields?.length) {
        for (const field of input.fields) {
          if (field.id) {
            await tx.labTemplateField.upsert({
              where: { id: field.id },
              update: {
                templateId: tpl.id,
                key: field.key,
                label: field.label,
                dataType: field.dataType,
                unitDefault: field.unitDefault || null,
                refLowDefault: field.refLowDefault ?? null,
                refHighDefault: field.refHighDefault ?? null,
                order: field.order ?? 0,
                isActive: field.isActive ?? true
              },
              create: {
                id: field.id,
                templateId: tpl.id,
                key: field.key,
                label: field.label,
                dataType: field.dataType,
                unitDefault: field.unitDefault || null,
                refLowDefault: field.refLowDefault ?? null,
                refHighDefault: field.refHighDefault ?? null,
                order: field.order ?? 0,
                isActive: field.isActive ?? true
              }
            });
          } else {
            await tx.labTemplateField.create({
              data: {
                templateId: tpl.id,
                key: field.key,
                label: field.label,
                dataType: field.dataType,
                unitDefault: field.unitDefault || null,
                refLowDefault: field.refLowDefault ?? null,
                refHighDefault: field.refHighDefault ?? null,
                order: field.order ?? 0,
                isActive: field.isActive ?? true
              }
            });
          }
        }
      }

      return tpl;
    });

    const full = await prisma.labTemplateV2.findUnique({
      where: { id: saved.id },
      include: { fields: { where: { isActive: true }, orderBy: [{ order: "asc" }, { label: "asc" }] } }
    });

    return jsonOk(full, input.id ? 200 : 201);
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError((err as any)?.message || "No se pudo guardar la plantilla v2", 500);
  }
}
