import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { linkUserAndEmployee } from "@/lib/users/service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  employeeId: z.string().trim().min(1)
});

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const perm = requirePermission(auth.user, "USERS:ADMIN");
  if (perm.errorResponse) return perm.errorResponse;

  const parsed = bodySchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  const result = await linkUserAndEmployee(prisma as any, params.id, parsed.data.employeeId);
  return NextResponse.json({ data: result }, { status: 200 });
}

export const POST = withApiErrorHandling(handler);
