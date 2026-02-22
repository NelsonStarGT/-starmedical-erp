import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { upsertDepartmentSchema } from "@/lib/hr/schemas";
import { cleanNullableString } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, [], "HR:SETTINGS:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const departments = await prisma.hrDepartment.findMany({
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ data: departments });
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, [], "HR:SETTINGS:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = upsertDepartmentSchema.parse(body);
    if (parsed.id) return NextResponse.json({ error: "Usa PATCH para actualizar" }, { status: 400 });

    const saved = await prisma.hrDepartment.create({
      data: {
        name: parsed.name.trim(),
        description: cleanNullableString(parsed.description),
        isActive: parsed.isActive ?? true,
        createdById: auth.user?.id || null
      }
    });
    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (err: any) {
    console.error("create department", err);
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: err.flatten().fieldErrors }, { status: 400 });
    }
    if (err.code === "P2002") return NextResponse.json({ error: "El nombre ya existe" }, { status: 400 });
    return NextResponse.json({ error: err?.message || "No se pudo crear el departamento" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireRole(req, [], "HR:SETTINGS:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = upsertDepartmentSchema.parse(body);
    if (!parsed.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const saved = await prisma.hrDepartment.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name.trim(),
        description: cleanNullableString(parsed.description),
        isActive: parsed.isActive ?? undefined
      }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error("update department", err);
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: err.flatten().fieldErrors }, { status: 400 });
    }
    if (err.code === "P2002") return NextResponse.json({ error: "El nombre ya existe" }, { status: 400 });
    if (err.code === "P2025") return NextResponse.json({ error: "Departamento no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar el departamento" }, { status: 400 });
  }
}
