import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPersistedRbacStatus } from "@/lib/security/rbacSync";
import { requireUsersAdminApi } from "@/lib/users/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireUsersAdminApi(req);
  if (auth.errorResponse) return auth.errorResponse;

  const status = await getPersistedRbacStatus(prisma);
  return NextResponse.json(
    {
      ok: status.ready,
      data: status
    },
    { status: status.ready ? 200 : 503 }
  );
}
