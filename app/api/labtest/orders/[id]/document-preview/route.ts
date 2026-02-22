import { NextRequest } from "next/server";
import { LabArea } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { serializeLabOrder } from "@/lib/labtest/transformers";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";

function normalizeKey(value?: string | null) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mostCommonArea(items: { area: LabArea }[]) {
  const counts: Record<string, number> = {};
  for (const it of items) {
    counts[it.area] = (counts[it.area] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (sorted[0]?.[0] as LabArea | undefined) || null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireLabTestPermission(_req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const branchId = auth.user?.branchId || undefined;
    const order = await prisma.labTestOrder.findFirst({
      where: { id: params.id, ...(branchId ? { branchId } : {}) },
      include: {
        items: { include: { results: { orderBy: { createdAt: "desc" }, take: 1 } } },
        patient: true,
        labPatient: true
      }
    });

    if (!order) return jsonError("Orden no encontrada", 404);

    const orderSerialized = serializeLabOrder(order);
    const area = order.areaHint || mostCommonArea(order.items) || "OTHER";

    let template = await prisma.labTemplateV2.findFirst({
      where: { area, isDefault: true },
      orderBy: { updatedAt: "desc" }
    });
    if (!template) {
      template = await prisma.labTemplateV2.findFirst({ where: { area }, orderBy: { updatedAt: "desc" } });
    }

    const fields = template
      ? await prisma.labTemplateField.findMany({
          where: { templateId: template.id, isActive: true },
          orderBy: [{ order: "asc" }, { label: "asc" }]
        })
      : [];

    const resultMap: Record<
      string,
      { value: string; unit?: string | null; refLow?: string | null; refHigh?: string | null; flag?: string | null }
    > = {};

    for (const item of order.items) {
      const latest = item.results?.[0];
      if (!latest) continue;
      const key = normalizeKey(item.code || item.name);
      const value =
        latest.valueText ??
        (latest.valueNumber !== null && latest.valueNumber !== undefined ? latest.valueNumber.toString() : "") ??
        "";
      resultMap[key] = {
        value,
        unit: latest.unit,
        refLow: latest.refLow ? latest.refLow.toString() : null,
        refHigh: latest.refHigh ? latest.refHigh.toString() : null,
        flag: latest.flag || null
      };
    }

    const rows =
      fields.length > 0
        ? fields
            .map((field) => {
              const entry = resultMap[normalizeKey(field.key)];
              return `
              <tr style="border-bottom:1px solid #eef3fb">
                <td style="padding:8px;font-weight:600;color:#163d66">${field.label}</td>
                <td style="padding:8px;color:#0f172a">${entry?.value ?? "-"}</td>
                <td style="padding:8px;color:#64748b">${entry?.unit ?? field.unitDefault ?? ""}</td>
                <td style="padding:8px;color:#94a3b8">${entry?.refLow ?? field.refLowDefault ?? ""} - ${entry?.refHigh ?? field.refHighDefault ?? ""}</td>
                <td style="padding:8px;color:#b91c1c;font-weight:600">${entry?.flag ?? ""}</td>
              </tr>`;
            })
            .join("")
        : order.items
            .map((item) => {
              const latest = item.results?.[0];
              const value =
                latest?.valueText ??
                (latest?.valueNumber !== null && latest?.valueNumber !== undefined ? latest.valueNumber.toString() : "") ??
                "-";
              return `
              <tr style="border-bottom:1px solid #eef3fb">
                <td style="padding:8px;font-weight:600;color:#163d66">${item.name}</td>
                <td style="padding:8px;color:#0f172a">${value}</td>
                <td style="padding:8px;color:#64748b">${latest?.unit ?? ""}</td>
                <td style="padding:8px;color:#94a3b8">${latest?.refLow ?? ""} - ${latest?.refHigh ?? ""}</td>
                <td style="padding:8px;color:#b91c1c;font-weight:600">${latest?.flag ?? ""}</td>
              </tr>`;
            })
            .join("");

    const patientName =
      orderSerialized.patientDisplay || `${order.labPatient?.firstName || ""} ${order.labPatient?.lastName || ""}`.trim() || "Paciente";

    const header = template?.headerHtml ?? `<div style='font-family: Nunito Sans, sans-serif; padding:12px'><h3 style='color:#2e75ba;margin:0;'>Reporte de laboratorio</h3><p style='margin:0;color:#4aa59c'>StarMedical</p></div>`;
    const footer = template?.footerHtml ?? `<div style='font-size:12px;color:#4aa59c;padding:12px'>Emitido por StarMedical ERP</div>`;

    const html = `
      ${header}
      <div style="font-family: Nunito Sans, sans-serif; padding:12px">
        <p style="margin:0 0 4px 0;"><strong>Paciente:</strong> ${patientName}</p>
        <p style="margin:0 0 8px 0;"><strong>Orden:</strong> ${order.code}</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #eef3fb">
          <thead>
            <tr style="background:#e8f1ff;color:#163d66">
              <th style="text-align:left;padding:8px;">Prueba</th>
              <th style="text-align:left;padding:8px;">Resultado</th>
              <th style="text-align:left;padding:8px;">Unidad</th>
              <th style="text-align:left;padding:8px;">Referencia</th>
              <th style="text-align:left;padding:8px;">Flag</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${footer}
    `;

    return jsonOk({ html });
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError((err as any)?.message || "No se pudo generar el preview", 500);
  }
}
