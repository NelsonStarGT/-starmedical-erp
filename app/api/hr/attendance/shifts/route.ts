import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import { requireHrPermission } from "@/lib/api/rbac";
import { attendanceShiftSchema } from "@/lib/hr/attendance/schemas";

export const dynamic = "force-dynamic";

function authorize(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:WRITE");
  if (auth.errorResponse) return { user: null, errorResponse: auth.errorResponse };
  return { user: auth.user, errorResponse: null };
}

async function getHandler(req: NextRequest) {
  const auth = authorize(req);
  if (auth.errorResponse) return auth.errorResponse;

  const siteId = req.nextUrl.searchParams.get("siteId") || undefined;
  const shifts = await prisma.attendanceShift.findMany({
    where: { ...(siteId ? { siteId } : {}) },
    orderBy: [{ siteId: "asc" }, { createdAt: "desc" }]
  });
  return NextResponse.json({ data: shifts });
}

async function postHandler(req: NextRequest) {
  const auth = authorize(req);
  if (auth.errorResponse) return auth.errorResponse;
  const body = await safeJson(req);
  const parsed = attendanceShiftSchema.safeParse(body);
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const created = await prisma.attendanceShift.create({
    data: {
      ...parsed.data,
      lunchPaid: parsed.data.lunchPaid ?? false,
      overtimeAllowed: parsed.data.overtimeAllowed ?? false
    }
  });

  return NextResponse.json({ data: created }, { status: 201 });
}

export const GET = withApiErrorHandling(getHandler);
export const POST = withApiErrorHandling(postHandler);
