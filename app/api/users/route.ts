import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { createUserWithOptionalHrProfile } from "@/lib/users/service";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const perm = requirePermission(auth.user, "USERS:ADMIN");
  if (perm.errorResponse) return perm.errorResponse;

  if (req.method === "GET") {
    const search = req.nextUrl.searchParams.get("q") || "";
    const jobRoleId = req.nextUrl.searchParams.get("jobRoleId") || undefined;
    const roleBaseKey = req.nextUrl.searchParams.get("roleBaseKey") || undefined;
    const branchId = req.nextUrl.searchParams.get("branchId") || undefined;
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") || "20", 10)));

    const where: any = {
      AND: []
    };
    if (search) {
      where.AND.push({
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } }
        ]
      });
    }
    if (jobRoleId) where.AND.push({ profile: { jobRoleId } });
    if (branchId) where.AND.push({ branchId });
    if (status) {
      if (status.toLowerCase() === "active") where.AND.push({ isActive: true });
      if (status.toLowerCase() === "inactive") where.AND.push({ isActive: false });
    }
    if (roleBaseKey) {
      where.AND.push({
        roles: { some: { role: { name: roleBaseKey.toUpperCase() } } }
      });
    }

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          profile: { include: { jobRole: { select: { id: true, name: true } } } },
          roles: { include: { role: { select: { name: true } } } }
        },
        orderBy: [{ createdAt: "desc" }, { email: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    const items = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      branchId: u.branchId || null,
      isActive: u.isActive,
      profile: u.profile
        ? {
            jobRole: u.profile.jobRole ? { id: u.profile.jobRole.id, name: u.profile.jobRole.name } : null,
            jobRoleId: u.profile.jobRoleId || null,
            departmentId: u.profile.departmentId || null,
            municipalityId: u.profile.municipalityId || null,
            housingSector: u.profile.housingSector || null,
            addressLine: u.profile.addressLine || null,
            addressReference: u.profile.addressReference || null
          }
        : null,
      roleBaseKeys: u.roles.map((r) => r.role?.name).filter(Boolean)
    }));
    return NextResponse.json({ data: { items, total, page, pageSize } });
  }

  if (req.method === "POST") {
    const body = await safeJson(req);
    const result = await createUserWithOptionalHrProfile(prisma as any, body);

    return NextResponse.json(
      { data: { userId: result.user.id, employeeId: result.employee?.id || null } },
      { status: 201 }
    );
  }

  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}

export const POST = withApiErrorHandling(handler);
export const GET = withApiErrorHandling(handler);
