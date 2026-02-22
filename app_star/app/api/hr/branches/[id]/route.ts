import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { branchSchema } from "@/lib/hr/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:SETTINGS:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const parsed = branchSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const updated = await prisma.branch.update({
      where: { id: resolvedParams.id },
      data: {
        name: parsed.data.name?.trim(),
        code: parsed.data.code?.trim().toUpperCase(),
        address: parsed.data.address?.trim(),
        isActive: parsed.data.isActive
      }
    });
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error("[hr:branches:update]", err);
    if (err.code === "P2025") return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
    if (err.code === "P2002") return NextResponse.json({ error: "Sucursal duplicada" }, { status: 409 });
    return NextResponse.json({ error: "No se pudo actualizar la sucursal" }, { status: 400 });
  }
}
