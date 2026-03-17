import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireUsersAdminApi } from "@/lib/users/access";
import { resetUserPassword } from "@/lib/users/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const POST = withApiErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) => {
    const auth = requireUsersAdminApi(req);
    if (auth.errorResponse) return auth.errorResponse;

    const resolvedParams = "then" in params ? await params : params;
    const userId = resolvedParams.id;
    const payload = await req.json().catch(() => ({}));

    await resetUserPassword(prisma as any, userId, payload);

    await auditLog({
      action: "USER_PASSWORD_RESET",
      entityType: "User",
      entityId: userId,
      user: auth.user,
      req
    });

    return NextResponse.json({ ok: true });
  }
);
