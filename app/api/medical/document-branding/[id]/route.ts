import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deleteDocumentBrandingTemplate, getDocumentBrandingTemplateById } from "@/lib/medical/documentBrandingStore";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const id = safeParam(ctx.params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });
  }

  try {
    const template = await getDocumentBrandingTemplateById(id);
    if (!template) {
      return NextResponse.json({ ok: false, error: "Plantilla no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar plantilla documental";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const id = safeParam(ctx.params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });
  }

  try {
    await deleteDocumentBrandingTemplate(id, auth.user?.id || null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar plantilla documental";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
