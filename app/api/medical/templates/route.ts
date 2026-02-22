import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { clinicalTemplateUpsertSchema } from "@/lib/medical/schemas";
import { listClinicalTemplates, saveClinicalTemplate } from "@/lib/medical/templateStore";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const templates = await listClinicalTemplates();
    return NextResponse.json({ ok: true, data: templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron listar plantillas";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = clinicalTemplateUpsertSchema.safeParse(body);
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
    const saved = await saveClinicalTemplate(parsed.data, auth.user?.id || null);
    return NextResponse.json({ ok: true, data: saved }, { status: parsed.data.id ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la plantilla";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
