import { prisma } from "@/lib/prisma";

export type UserRoleOption = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
};

export type UserBranchOption = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

function serializeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    tenantId: null,
    branchId: user.branchId || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    roleNames: (user.roles || []).map((row: any) => row.role.name),
    branchAccesses: user.branchId
      ? [
          {
            id: `primary-${user.id}`,
            branchId: user.branchId,
            branchName: user.branchId,
            accessMode: "LOCKED" as const,
            isDefault: true
          }
        ]
      : []
  };
}

async function getUserRecordById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      roles: {
        include: {
          role: { select: { id: true, name: true, description: true } }
        }
      }
    }
  });
}

export async function listAdminUsers(input?: {
  q?: string;
  roleName?: string;
  branchId?: string;
  status?: "active" | "inactive" | "";
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Number(input?.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(input?.pageSize || 20)));
  const search = String(input?.q || "").trim();
  const roleName = String(input?.roleName || "").trim();
  const branchId = String(input?.branchId || "").trim();
  const status = String(input?.status || "").trim().toLowerCase();

  const where: any = { AND: [] as any[] };

  if (search) {
    where.AND.push({
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } }
      ]
    });
  }

  if (roleName) {
    where.AND.push({
      roles: { some: { role: { name: roleName } } }
    });
  }

  if (branchId) {
    where.AND.push({ branchId });
  }

  if (status === "active") where.AND.push({ isActive: true });
  if (status === "inactive") where.AND.push({ isActive: false });

  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        roles: {
          include: {
            role: { select: { id: true, name: true, description: true } }
          }
        }
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }, { email: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return {
    items: rows.map(serializeUser),
    total,
    page,
    pageSize
  };
}

export async function getAdminUserById(id: string) {
  const user = await getUserRecordById(id);
  return user ? serializeUser(user) : null;
}

export async function getUsersAdminMeta() {
  const [roles, branchRows] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true }
    }),
    prisma.user.findMany({
      where: { branchId: { not: null } },
      select: { branchId: true },
      orderBy: { branchId: "asc" }
    })
  ]);

  const branches = Array.from(new Set(branchRows.map((row) => row.branchId).filter(Boolean))).map((id) => ({
    id: id as string,
    name: id as string,
    code: null,
    isActive: true
  })) satisfies UserBranchOption[];

  return {
    roles: roles.map((role) => ({
      ...role,
      isSystem: role.name.toUpperCase() === "ADMIN"
    })) satisfies UserRoleOption[],
    branches
  };
}

export async function getUsersDashboardSnapshot() {
  const [total, active, inactive, roles, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { userRoles: true } }
      }
    }),
    prisma.user.findMany({
      where: { branchId: { not: null } },
      select: { branchId: true }
    })
  ]);

  const branchTotals = new Map<string, number>();
  for (const user of users) {
    if (!user.branchId) continue;
    branchTotals.set(user.branchId, (branchTotals.get(user.branchId) || 0) + 1);
  }

  return {
    total,
    active,
    inactive,
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      total: role._count.userRoles
    })),
    branches: Array.from(branchTotals.entries()).map(([id, totalByBranch]) => ({
      id,
      name: id,
      total: totalByBranch
    }))
  };
}

export async function getUsersPermissionsSnapshot() {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: "asc" },
      include: {
        permissions: {
          include: {
            permission: {
              select: { id: true, key: true, description: true }
            }
          }
        },
        _count: { select: { userRoles: true } }
      }
    }),
    prisma.permission.findMany({
      orderBy: { key: "asc" },
      select: { id: true, key: true, description: true }
    })
  ]);

  return {
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.name.toUpperCase() === "ADMIN",
      userCount: role._count.userRoles,
      permissions: role.permissions.map((row) => ({
        id: row.permission.id,
        key: row.permission.key,
        description: row.permission.description
      }))
    })),
    permissions: permissions.map((permission) => ({
      id: permission.id,
      key: permission.key,
      custom: false,
      module: permission.key.split(".")[0] || "general"
    }))
  };
}
