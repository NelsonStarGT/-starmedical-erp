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

  try {
    const includeInactive = new URL(req.url).searchParams.get("includeInactive") === "1";
    const rows = await prisma.clientAcquisitionSource.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true, category: true, isActive: true }
    });

    return NextResponse.json({ ok: true, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar canales.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
