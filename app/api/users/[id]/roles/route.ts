import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { withApiErrorHandling } from "@/lib/api/http";
import { getAdminUserById } from "@/lib/users/admin-data";
import { requireUsersAdminApi } from "@/lib/users/access";
import { updateUserRoles } from "@/lib/users/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const PUT = withApiErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) => {
    const auth = requireUsersAdminApi(req);
    if (auth.errorResponse) return auth.errorResponse;

    const resolvedParams = "then" in params ? await params : params;
    const userId = resolvedParams.id;

    const before = await getAdminUserById(userId);
    if (!before) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const payload = await req.json().catch(() => ({}));
    const roles = await updateUserRoles(prisma as any, userId, payload);
    const after = await getAdminUserById(userId);

    await auditLog({
      action: "USER_ROLES_UPDATED",
      entityType: "User",
      entityId: userId,
      user: auth.user,
      req,
      before,
      after,
      metadata: { roles }
    });

    return NextResponse.json({ data: after });
  }
);
