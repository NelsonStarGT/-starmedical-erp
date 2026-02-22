import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { icd10UpdateSchema } from "@/lib/medical/schemas";
import { getCie10CodeById, updateCie10Code } from "@/lib/medical/cie10Store";

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
    const data = await getCie10CodeById(id);
    if (!data) return NextResponse.json({ ok: false, error: "Codigo no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo obtener el codigo";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const resolvedParams = "then" in ctx.params ? await ctx.params : ctx.params;
  const id = safeId(resolvedParams.id);
  if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = icd10UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload invalido",
        details: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      },
      { status: 400 }
    );
  }

  try {
    const saved = await updateCie10Code(id, parsed.data, auth.user?.id || null);
    if (!saved) return NextResponse.json({ ok: false, error: "Codigo no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar codigo";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
