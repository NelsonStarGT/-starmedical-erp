import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } } | { params: Promise<{ id: string; docId: string }> }
) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN"], "HR:DOCS:EDIT");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const result = await prisma.employeeDocument.updateMany({
      where: { id: resolvedParams.docId, employeeId: resolvedParams.id, isArchived: false },
      data: { isArchived: true }
    });
    if (result.count === 0) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    await prisma.notification.deleteMany({ where: { employeeId: resolvedParams.id, entityId: resolvedParams.docId } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("archive employee document", err);
    return NextResponse.json({ error: "No se pudo archivar el documento" }, { status: 400 });
  }
}
