import { NextRequest } from "next/server";
import { auditLog } from "@/lib/audit";
import { createLogoutResponse, requireAuth } from "@/lib/auth";
import { withApiErrorHandling } from "@/lib/api/http";
import { changeOwnPassword } from "@/lib/users/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const POST = withApiErrorHandling(async (req: NextRequest) => {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const payload = await req.json().catch(() => ({}));
  await changeOwnPassword(prisma as any, auth.user!.id, payload);

  await auditLog({
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: auth.user!.id,
    user: auth.user,
    req
  });

  return createLogoutResponse();
});
