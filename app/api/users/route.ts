import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { getAdminUserById, listAdminUsers } from "@/lib/users/admin-data";
import { requireUsersAdminApi } from "@/lib/users/access";
import { createUserWithOptionalHrProfile } from "@/lib/users/service";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireUsersAdminApi(req);
  if (auth.errorResponse) return auth.errorResponse;

  if (req.method === "GET") {
    const data = await listAdminUsers({
      q: req.nextUrl.searchParams.get("q") || "",
      roleName: req.nextUrl.searchParams.get("roleName") || "",
      branchId: req.nextUrl.searchParams.get("branchId") || "",
      status: (req.nextUrl.searchParams.get("status") || "") as "active" | "inactive" | "",
      page: parseInt(req.nextUrl.searchParams.get("page") || "1", 10),
      pageSize: parseInt(req.nextUrl.searchParams.get("pageSize") || "20", 10)
    });
    return NextResponse.json({ data });
  }

  if (req.method === "POST") {
    const body = await safeJson(req);
    const result = await createUserWithOptionalHrProfile(prisma as any, body);
    const created = await getAdminUserById(result.user.id);

    await auditLog({
      action: "USER_CREATED",
      entityType: "User",
      entityId: result.user.id,
      user: auth.user,
      req,
      after: created
    });

    return NextResponse.json(
      { data: { userId: result.user.id, employeeId: result.employee?.id || null } },
      { status: 201 }
    );
  }

  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}

export const POST = withApiErrorHandling(handler);
export const GET = withApiErrorHandling(handler);
