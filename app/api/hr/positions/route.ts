import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { upsertPositionSchema } from "@/lib/hr/schemas";
import { cleanNullableString } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "VIEWER"]);
  if (auth.errorResponse) return auth.errorResponse;

  const positions = await prisma.hrPosition.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ data: positions });
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = upsertPositionSchema.parse(body);
    if (parsed.id) return NextResponse.json({ error: "Usa PATCH para actualizar" }, { status: 400 });

    const saved = await prisma.hrPosition.create({
      data: {
        name: parsed.name.trim(),
        description: cleanNullableString(parsed.description),
        isActive: parsed.isActive ?? true,
        createdById: auth.user?.id || null
      }
    });
    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (err: any) {
    console.error("create position", err);
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: err.flatten().fieldErrors }, { status: 400 });
    }
    if (err.code === "P2002") return NextResponse.json({ error: "El nombre ya existe" }, { status: 400 });
    return NextResponse.json({ error: err?.message || "No se pudo crear el puesto" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = upsertPositionSchema.parse(body);
    if (!parsed.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const saved = await prisma.hrPosition.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name.trim(),
        description: cleanNullableString(parsed.description),
        isActive: parsed.isActive ?? undefined
      }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error("update position", err);
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: err.flatten().fieldErrors }, { status: 400 });
    }
    if (err.code === "P2002") return NextResponse.json({ error: "El nombre ya existe" }, { status: 400 });
    if (err.code === "P2025") return NextResponse.json({ error: "Puesto no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar el puesto" }, { status: 400 });
  }
}
