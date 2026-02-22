import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCrmAdmin } from "@/lib/api/crm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = ensureCrmAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const pipelineId = String(body.pipelineId || "");
    const key = String(body.key || "").toUpperCase();
    const name = String(body.name || key);
    const order = Number(body.order || 0);
    if (!pipelineId || !key) return NextResponse.json({ error: "pipelineId y key requeridos" }, { status: 400 });
    const created = await prisma.pipelineStage.create({
      data: {
        pipelineId,
        key,
        name,
        order,
        slaDays: Number(body.slaDays || 0),
        probability: Number(body.probability || 0),
        isTerminal: Boolean(body.isTerminal)
      }
    });
    return NextResponse.json({ data: created });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo crear etapa" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureCrmAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name);
    if (body.order !== undefined) data.order = Number(body.order);
    if (body.slaDays !== undefined) data.slaDays = Number(body.slaDays);
    if (body.probability !== undefined) data.probability = Number(body.probability);
    if (body.isTerminal !== undefined) data.isTerminal = Boolean(body.isTerminal);
    const updated = await prisma.pipelineStage.update({ where: { id }, data });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo actualizar etapa" }, { status: 400 });
  }
}
