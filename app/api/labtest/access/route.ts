import { NextRequest, NextResponse } from "next/server";
import { LabRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission } from "@/lib/api/labtest";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:ADMIN");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const list = await prisma.labAccess.findMany({
      include: { user: { select: { id: true, email: true, name: true, branchId: true, isActive: true } } },
      orderBy: [{ createdAt: "desc" }]
    });
    return NextResponse.json({ ok: true, data: list });
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:ADMIN");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const { id, userId, role, branchId, isActive } = body || {};
  if (!userId || !role) return NextResponse.json({ ok: false, error: "Datos incompletos", code: "INVALID_BODY" }, { status: 400 });
  if (!Object.values(LabRole).includes(role)) {
    return NextResponse.json({ ok: false, error: "Rol inválido", code: "INVALID_ROLE" }, { status: 400 });
  }
  const targetBranch = branchId || "GLOBAL";

  try {
    const saved = id
      ? await prisma.labAccess.update({
          where: { id },
          data: { role, branchId: targetBranch, isActive: isActive ?? true }
        })
      : await prisma.labAccess.upsert({
          where: { userId_role_branchId: { userId, role, branchId: targetBranch } },
          update: { isActive: isActive ?? true },
          create: { userId, role, branchId: targetBranch, isActive: isActive ?? true }
        });

    return NextResponse.json({ ok: true, data: saved });
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    throw err;
  }
}
