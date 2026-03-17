import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireUsersAdminApi } from "@/lib/users/access";
import { unlinkUserAndEmployee } from "@/lib/users/service";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUsersAdminApi(req);
  if (auth.errorResponse) return auth.errorResponse;

  const result = await unlinkUserAndEmployee(prisma as any, params.id);
  return NextResponse.json({ data: result }, { status: 200 });
}

export const POST = withApiErrorHandling(handler);
