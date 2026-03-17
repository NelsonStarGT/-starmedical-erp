import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUsersAdminApi } from "@/lib/users/access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUsersAdminApi(req);
  if (auth.errorResponse) return auth.errorResponse;

  const employee = await prisma.hrEmployee.findFirst({ where: { userId: params.id }, select: { id: true } });
  return NextResponse.json({ linked: Boolean(employee), employeeId: employee?.id });
}
