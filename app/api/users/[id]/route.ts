import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { withApiErrorHandling } from "@/lib/api/http";
import { getAdminUserById } from "@/lib/users/admin-data";
import { requireUsersAdminApi } from "@/lib/users/access";
import { updateUserAccount } from "@/lib/users/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function handler(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireUsersAdminApi(req);
  if (auth.errorResponse) return auth.errorResponse;

  const resolvedParams = "then" in params ? await params : params;
  const userId = resolvedParams.id;

  if (req.method === "GET") {
    const data = await getAdminUserById(userId);
    if (!data) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ data });
  }

  if (req.method === "PATCH") {
    const before = await getAdminUserById(userId);
    if (!before) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const payload = await req.json().catch(() => ({}));
    await updateUserAccount(prisma as any, userId, payload);
    const after = await getAdminUserById(userId);

    await auditLog({
      action: "USER_UPDATED",
      entityType: "User",
      entityId: userId,
      user: auth.user,
      req,
      before,
      after
    });

    return NextResponse.json({ data: after });
  }

  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}

export const GET = withApiErrorHandling(handler);
export const PATCH = withApiErrorHandling(handler);
