import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deleteVitalTemplate, getVitalTemplateById } from "@/lib/medical/vitalsTemplateStore";

function safeId(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

type RouteContext = { params: { id: string } } | { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const resolvedParams = "then" in ctx.params ? await ctx.params : ctx.params;
  const id = safeId(resolvedParams.id);
  if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });

  try {
    const template = await getVitalTemplateById(id);
    if (!template) return NextResponse.json({ ok: false, error: "Plantilla no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, data: template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo obtener la plantilla";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const resolvedParams = "then" in ctx.params ? await ctx.params : ctx.params;
  const id = safeId(resolvedParams.id);
  if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });

  try {
    await deleteVitalTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar la plantilla";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
