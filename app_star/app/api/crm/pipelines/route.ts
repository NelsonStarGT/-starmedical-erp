import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCrmAdmin } from "@/lib/api/crm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = ensureCrmAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const data = await prisma.pipelineConfig.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        stages: { orderBy: { order: "asc" } },
        transitions: true,
        ruleSets: { include: { rules: true } }
      }
    });
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron cargar pipelines" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureCrmAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const type = String(body.type || "").toUpperCase();
    if (!name || !["B2B", "B2C"].includes(type)) {
      return NextResponse.json({ error: "name y type requeridos" }, { status: 400 });
    }
    const created = await prisma.pipelineConfig.create({
      data: { name, type: type as any, isActive: true }
    });
    return NextResponse.json({ data: created });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo crear pipeline" }, { status: 400 });
  }
}
