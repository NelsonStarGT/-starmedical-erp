import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function requireAdmin(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return { user: null, errorResponse: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  if (!hasPermission(user, "USERS:ADMIN")) return { user, errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  return { user, errorResponse: null };
}

async function delHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;

  const existing = await prisma.attendancePunchToken.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Token no encontrado" }, { status: 404 });

  if (!existing.revokedAt) {
    await prisma.attendancePunchToken.update({ where: { id: params.id }, data: { revokedAt: new Date() } });
  }

  return NextResponse.json({ ok: true });
}

export const DELETE = withApiErrorHandling(delHandler);
