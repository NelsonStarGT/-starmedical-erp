import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getEncounterSnapshot } from "@/lib/medical/snapshotStore";

export const runtime = "nodejs";

function safeParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

export async function GET(req: NextRequest, ctx: { params: { encounterId: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const encounterId = safeParam(ctx.params.encounterId);
  if (!encounterId) {
    return NextResponse.json({ ok: false, error: "encounterId requerido" }, { status: 400 });
  }

  const snapshot = await getEncounterSnapshot(encounterId);
  if (!snapshot) {
    return NextResponse.json({ ok: false, error: "Snapshot no encontrado" }, { status: 404 });
  }

  // TODO(pdf-binary): habilitar renderer server-side (Playwright/Puppeteer) cuando infraestructura lo permita.
  // Pasos sugeridos:
  // 1) Instalar dependencia aprobada en el repo.
  // 2) Renderizar snapshot.html en navegador headless con formato Letter (8.5x11) y márgenes clínicos.
  // 3) Retornar `application/pdf` inmutable a partir del snapshot firmado.
  return NextResponse.json(
    {
      ok: false,
      error: "PDF binario no habilitado en este entorno.",
      code: "PDF_BINARY_NOT_ENABLED",
      htmlPreviewEndpoint: `/api/medical/encounters/${encodeURIComponent(encounterId)}/pdf`
    },
    { status: 501 }
  );
}
