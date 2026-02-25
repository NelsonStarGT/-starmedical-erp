import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!isAdmin(auth.user)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const url = new URL(req.url);
  const sourceId = url.searchParams.get("sourceId")?.trim();
  if (!sourceId) {
    return NextResponse.json({ ok: false, error: "sourceId requerido." }, { status: 422 });
  }

  try {
    const includeInactive = url.searchParams.get("includeInactive") === "1";
    const rows = await prisma.clientAcquisitionDetailOption.findMany({
      where: {
        sourceId,
        ...(includeInactive ? {} : { isActive: true })
      },
      orderBy: { name: "asc" },
      select: { id: true, sourceId: true, name: true, code: true, isActive: true }
    });

    return NextResponse.json({ ok: true, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar detalles.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
