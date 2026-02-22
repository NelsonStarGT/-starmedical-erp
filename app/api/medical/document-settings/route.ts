import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { medicalDocumentSettingsSchema } from "@/lib/medical/schemas";
import { getMedicalDocumentSettings, saveMedicalDocumentSettings } from "@/lib/medical/documentSettingsStore";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const settings = await getMedicalDocumentSettings();
    return NextResponse.json({ ok: true, data: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar configuración documental";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = medicalDocumentSettingsSchema.safeParse(body);
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
    const saved = await saveMedicalDocumentSettings(parsed.data, auth.user?.id || null);
    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar configuración documental";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
