import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { syncPersistedRbac } from "@/lib/security/rbacSync";
import { requireUsersAdminApi } from "@/lib/users/access";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireUsersAdminApi(req);
  if (auth.errorResponse) return auth.errorResponse;

  const status = await syncPersistedRbac(prisma);
  return NextResponse.json({ ok: true, message: "Permisos sincronizados", data: status });
}

export const POST = withApiErrorHandling(handler);
