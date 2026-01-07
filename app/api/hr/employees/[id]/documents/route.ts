import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { createEmployeeDocumentSchema } from "@/lib/hr/schemas";
import { cleanNullableString, parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = createEmployeeDocumentSchema.parse(body);
    const employee = await prisma.hrEmployee.findUnique({ where: { id: params.id } });
    if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

    const issuedAt = parseDateInput(parsed.issuedAt, "Fecha de emisión");
    const expiresAt = parseDateInput(parsed.expiresAt, "Fecha de vencimiento");

    const doc = await prisma.hrEmployeeDocument.create({
      data: {
        employeeId: params.id,
        type: parsed.type,
        title: parsed.title.trim(),
        fileUrl: parsed.fileUrl.trim(),
        issuedAt,
        expiresAt,
        notes: cleanNullableString(parsed.notes),
        createdById: auth.user?.id || null
      }
    });

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (err: any) {
    console.error("create employee document", err);
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: err.flatten().fieldErrors }, { status: 400 });
    }
    if (err.code === "P2025") return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo adjuntar el documento" }, { status: 400 });
  }
}
