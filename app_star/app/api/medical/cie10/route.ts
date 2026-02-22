import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { icd10CreateSchema } from "@/lib/medical/schemas";
import { createCie10Code, listCie10Codes } from "@/lib/medical/cie10Store";

function toBoolean(value: string | null) {
  if (value === null) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function toLevel(value: string | null): 3 | 4 | undefined {
  if (value === "3") return 3;
  if (value === "4") return 4;
  return undefined;
}

function toPositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const search = req.nextUrl.searchParams;
    const query = search.get("query") || search.get("q") || "";
    const chapter = search.get("chapter") || "";
    const level = toLevel(search.get("level"));
    const active = toBoolean(search.get("active"));
    const page = toPositiveInt(search.get("page"), 1);
    const pageSize = toPositiveInt(search.get("pageSize"), 25);

    const result = await listCie10Codes({
      query,
      chapter: chapter || undefined,
      level,
      active,
      page,
      pageSize
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo listar catalogo CIE-10";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = icd10CreateSchema.safeParse(body);
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
    const saved = await createCie10Code(parsed.data, auth.user?.id || null);
    return NextResponse.json({ ok: true, data: saved }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear codigo CIE-10";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
