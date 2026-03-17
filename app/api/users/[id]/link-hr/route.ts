import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { requireUsersAdminApi } from "@/lib/users/access";
import { linkUserAndEmployee } from "@/lib/users/service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  employeeId: z.string().trim().min(1)
});

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUsersAdminApi(req);
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = bodySchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  const result = await linkUserAndEmployee(prisma as any, params.id, parsed.data.employeeId);
  return NextResponse.json({ data: result }, { status: 200 });
}

export const POST = withApiErrorHandling(handler);
