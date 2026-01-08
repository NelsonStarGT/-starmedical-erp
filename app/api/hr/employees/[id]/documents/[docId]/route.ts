import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const auth = requireRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const result = await prisma.employeeDocument.updateMany({
      where: { id: params.docId, employeeId: params.id, isArchived: false },
      data: { isArchived: true }
    });
    if (result.count === 0) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    await prisma.notification.deleteMany({ where: { employeeId: params.id, entityId: params.docId } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("archive employee document", err);
    return NextResponse.json({ error: "No se pudo archivar el documento" }, { status: 400 });
  }
}
