import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { documentBrandingUpsertSchema } from "@/lib/medical/schemas";
import { listDocumentBrandingTemplates, saveDocumentBrandingTemplate } from "@/lib/medical/documentBrandingStore";
import type { DocumentBrandingScope } from "@/lib/medical/documentBranding";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const scopeParam = (url.searchParams.get("scope") || "").trim();
  const scope: DocumentBrandingScope | undefined =
    scopeParam === "clinical" || scopeParam === "order_lab" || scopeParam === "order_rx" || scopeParam === "order_usg"
      ? scopeParam
      : undefined;

  try {
    const items = await listDocumentBrandingTemplates(scope);
    return NextResponse.json({
      ok: true,
      data: {
        items,
        total: items.length
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar plantillas de documentos clínicos";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = documentBrandingUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload inválido",
        details: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      },
      { status: 400 }
    );
  }

  try {
    const saved = await saveDocumentBrandingTemplate(parsed.data, auth.user?.id || null);
    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar plantilla documental";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
