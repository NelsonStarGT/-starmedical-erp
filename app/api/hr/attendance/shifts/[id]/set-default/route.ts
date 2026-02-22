import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireHrPermission } from "@/lib/api/rbac";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const shift = await prisma.attendanceShift.findUnique({ where: { id: params.id } });
  if (!shift) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

  await prisma.$transaction([
    prisma.attendanceShift.updateMany({ where: { siteId: shift.siteId }, data: { isDefaultForSite: false } }),
    prisma.attendanceShift.update({ where: { id: params.id }, data: { isDefaultForSite: true } })
  ]);

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorHandling(handler);
