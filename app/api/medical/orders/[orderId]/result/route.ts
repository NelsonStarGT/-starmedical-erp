import { NextRequest, NextResponse } from "next/server";
import type { EncounterResultValueRow } from "@/components/medical/encounter/types";
import { requireAuth } from "@/lib/auth";
import {
  getEncounterOrderRequestById,
  uploadEncounterOrderResult
} from "@/lib/medical/encounterRealStore";
import { canAccessWorklistByModality } from "@/lib/medical/worklistAccess";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseImageUrls(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseValues(value: unknown): EncounterResultValueRow[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];

  const parsed: EncounterResultValueRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.parameter !== "string" || typeof row.value !== "string") continue;
    parsed.push({
      parameter: row.parameter.trim(),
      value: row.value.trim(),
      range: typeof row.range === "string" && row.range.trim().length > 0 ? row.range.trim() : null,
      flag: typeof row.flag === "string" && row.flag.trim().length > 0 ? row.flag.trim() : null
    });
  }
  return parsed;
}

export async function POST(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const orderId = safeParam(ctx.params.orderId);
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId requerido" }, { status: 400 });
  }

  const order = await getEncounterOrderRequestById(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Orden médica no encontrada." }, { status: 404 });
  }

  if (!canAccessWorklistByModality(auth.user, order.modality, "write")) {
    return NextResponse.json({ ok: false, error: "No autorizado para cargar resultados de esta orden." }, { status: 403 });
  }

  if (order.status !== "completed") {
    return NextResponse.json(
      { ok: false, error: "La orden debe estar en estado realizada para cargar resultados.", code: "ORDER_NOT_COMPLETED" },
      { status: 409 }
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const pdfUrl = optionalString(body.pdfUrl);
  const imageUrls = parseImageUrls(body.imageUrls);
  const values = parseValues(body.values);
  const markReady = body.markReady !== false;

  const hasAnyContent =
    (typeof pdfUrl === "string" && pdfUrl.length > 0) ||
    (Array.isArray(imageUrls) && imageUrls.length > 0) ||
    (Array.isArray(values) && values.length > 0);

  if (!hasAnyContent) {
    return NextResponse.json(
      { ok: false, error: "Debe adjuntar al menos PDF, imágenes o valores para guardar el resultado." },
      { status: 400 }
    );
  }

  try {
    const saved = await uploadEncounterOrderResult({
      orderRequestId: orderId,
      pdfUrl,
      imageUrls,
      values,
      actorName: auth.user?.name || null,
      markReady
    });
    if (!saved) {
      return NextResponse.json({ ok: false, error: "No se pudo guardar el resultado." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        orderId,
        modality: order.modality,
        result: saved
      },
      event: "result.uploaded"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el resultado.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
