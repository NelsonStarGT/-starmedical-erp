import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/api/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const data = await prisma.appConfig.findFirst({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener configuración" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const companyName = String(body.companyName || "").trim();
    if (!companyName) return NextResponse.json({ error: "companyName requerido" }, { status: 400 });

    const data = {
      companyName,
      companyNit: body.companyNit || null,
      companyPhone: body.companyPhone || null,
      companyAddress: body.companyAddress || null,
      brandColor: body.brandColor || null,
      logoUrl: body.logoUrl || null,
      timezone: body.timezone || "America/Guatemala",
      openingHours: body.openingHours || null
    };

    const existing = await prisma.appConfig.findFirst();
    const saved = existing
      ? await prisma.appConfig.update({ where: { id: existing.id }, data })
      : await prisma.appConfig.create({ data });

    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo guardar configuración" }, { status: 500 });
  }
}
