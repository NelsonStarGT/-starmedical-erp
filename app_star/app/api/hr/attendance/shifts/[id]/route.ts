import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import { requireHrPermission } from "@/lib/api/rbac";
import { attendanceShiftUpdateSchema } from "@/lib/hr/attendance/schemas";

export const dynamic = "force-dynamic";

function authorize(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:WRITE");
  if (auth.errorResponse) return auth.errorResponse;
  return null;
}

async function patchHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = authorize(req);
  if (authError) return authError;

  const body = await safeJson(req);
  const parsed = attendanceShiftUpdateSchema.safeParse(body);
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const existing = await prisma.attendanceShift.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

  const updated = await prisma.attendanceShift.update({
    where: { id: params.id },
    data: parsed.data
  });
  return NextResponse.json({ data: updated });
}

export const PATCH = withApiErrorHandling(patchHandler);
