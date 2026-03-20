import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { createLogoutResponse, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changeOwnPassword } from "@/lib/users/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const payload = await req.json().catch(() => ({}));
    await changeOwnPassword(prisma as any, auth.user!.id, payload);

    await auditLog({
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: auth.user!.id,
      req,
      user: auth.user
    });

    return createLogoutResponse();
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    const body =
      error?.body && typeof error.body === "object"
        ? error.body
        : { error: error instanceof Error ? error.message : "No se pudo cambiar el password." };

    return NextResponse.json(body, { status });
  }
}
