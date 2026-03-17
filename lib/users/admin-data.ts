import { prisma } from "@/lib/prisma";

type UserAdminRecord = Awaited<ReturnType<typeof getUserAdminRecordById>>;

function serializeUser(user: NonNullable<UserAdminRecord>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    tenantId: user.tenantId || null,
    branchId: user.branchId || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    roleNames: user.roles.map((row) => row.role.name),
    branchAccesses: user.branchAccesses.map((row) => ({
      id: row.id,
      branchId: row.branchId,
      branchName: row.branch.name,
      accessMode: row.accessMode,
      isDefault: row.isDefault
    })),
    profile: user.profile
      ? {
          phone: user.profile.phone || null,
          dpi: user.profile.dpi || null,
          jobRoleId: user.profile.jobRoleId || null,
          jobRoleName: user.profile.jobRole?.name || null,
          departmentId: user.profile.departmentId || null,
          departmentName: user.profile.department?.name || null,
          municipalityId: user.profile.municipalityId || null,
          municipalityName: user.profile.municipality?.name || null,
          housingSector: user.profile.housingSector || null,
          addressLine: user.profile.addressLine || null,
          addressReference: user.profile.addressReference || null
        }
      : null
  };
}

async function getUserAdminRecordById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      profile: {
        include: {
          jobRole: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          municipality: { select: { id: true, name: true } }
        }
      },
      roles: {
        include: {
          role: { select: { id: true, name: true, description: true, isSystem: true } }
        }
      },
      branchAccesses: {
        include: {
          branch: { select: { id: true, name: true, code: true, isActive: true } }
        },
        orderBy: [{ isDefault: "desc" }, { branch: { name: "asc" } }]
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
    where.AND.push({
      OR: [{ branchId }, { branchAccesses: { some: { branchId } } }]
    });
  }

  if (status === "active") where.AND.push({ isActive: true });
  if (status === "inactive") where.AND.push({ isActive: false });

  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        profile: {
          include: {
            jobRole: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            municipality: { select: { id: true, name: true } }
          }
        },
        roles: {
          include: {
            role: { select: { id: true, name: true, description: true, isSystem: true } }
          }
        },
        branchAccesses: {
          include: {
            branch: { select: { id: true, name: true, code: true, isActive: true } }
          },
          orderBy: [{ isDefault: "desc" }, { branch: { name: "asc" } }]
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
  const user = await getUserAdminRecordById(id);
  return user ? serializeUser(user) : null;
}

export async function getUsersAdminMeta() {
  const [roles, branches] = await Promise.all([
    prisma.role.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true
      }
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, isActive: true }
    })
  ]);

  return {
    roles,
    branches
  };
}

export async function getUsersDashboardSnapshot() {
  const [total, active, inactive, roles, branches] = await Promise.all([
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
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { userAccesses: true } }
      }
    })
  ]);

  return {
    total,
    active,
    inactive,
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      total: role._count.userRoles
    })),
    branches: branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      total: branch._count.userAccesses
    }))
  };
}
