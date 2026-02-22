import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { toggleCie10CodeActive } from "@/lib/medical/cie10Store";

function safeId(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return "";
}

type RouteContext = { params: { id: string } } | { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const resolvedParams = "then" in ctx.params ? await ctx.params : ctx.params;
  const id = safeId(resolvedParams.id);
  if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });

  try {
    const saved = await toggleCie10CodeActive(id, auth.user?.id || null);
    if (!saved) return NextResponse.json({ ok: false, error: "Codigo no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cambiar estado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
