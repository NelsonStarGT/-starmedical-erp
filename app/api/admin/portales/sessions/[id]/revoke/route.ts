import { NextResponse, type NextRequest } from "next/server";
import { requirePortalApiCapability, revokePortalSessionById } from "@/lib/portales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const auth = requirePortalApiCapability(req, "PORTAL_SESSION_REVOKE");
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const sessionId = String(id || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "ID de sesión inválido" }, { status: 400 });
  }

  try {
    const result = await revokePortalSessionById({
      id: sessionId,
      actor: auth.user!
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo revocar la sesión.";
    if (message.toLowerCase().includes("no encontrada")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
