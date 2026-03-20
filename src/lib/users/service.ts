import { z } from "zod";
import { hashPasswordForTenant, validatePassword } from "@/lib/auth-password";
import {
  dateSchema,
  displayNameSchema,
  dpiSchema,
  emailSchema,
  nameSchema,
  phoneGtSchema
} from "@/lib/validation/person";

type PrismaLike = {
  user: {
    findUnique(args: any): Promise<any>;
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
  };
  role: {
    findMany(args: any): Promise<any>;
  };
  userRole?: {
    createMany(args: any): Promise<any>;
    deleteMany(args: any): Promise<any>;
  };
  userBranchAccess?: {
    deleteMany(args: any): Promise<any>;
    createMany(args: any): Promise<any>;
  };
  userProfile?: {
    upsert(args: any): Promise<any>;
  };
  hrEmployee?: {
    findFirst(args: any): Promise<any>;
    findUnique(args: any): Promise<any>;
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
  };
  $transaction?<T>(cb: (tx: any) => Promise<T>): Promise<T>;
};

type BranchAccess = {
  branchId: string;
  accessMode?: "LOCKED" | "SWITCH";
  isDefault?: boolean;
};

const hrProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  dpi: dpiSchema,
  birthDate: dateSchema.optional(),
  phone: phoneGtSchema.optional(),
  branchId: z.string().trim().optional(),
  address: z.string().trim().optional()
});

const addressSchema = z.object({
  phone: phoneGtSchema.optional(),
  dpi: dpiSchema.optional()
});

const branchAccessSchema = z.object({
  branchId: z.string().trim().min(1, "Sucursal requerida"),
  accessMode: z.enum(["LOCKED", "SWITCH"]).optional().default("LOCKED"),
  isDefault: z.boolean().optional().default(false)
});

const userCreateSchema = z.object({
  email: emailSchema,
  displayName: displayNameSchema.optional(),
  password: z.string().min(8, "Password mínimo 8 caracteres"),
  roles: z.array(z.string().trim().min(1)).max(20).optional(),
  branchId: z.string().trim().optional(),
  branchAccesses: z.array(branchAccessSchema).max(20).optional(),
  isActive: z.boolean().optional().default(true),
  createHrProfile: z.boolean().optional().default(false),
  hrProfile: hrProfileSchema.optional(),
  address: addressSchema.partial().optional()
});

const userUpdateSchema = z
  .object({
    email: emailSchema.optional(),
    displayName: displayNameSchema.nullish(),
    isActive: z.boolean().optional(),
    branchId: z.string().trim().nullable().optional(),
    address: addressSchema.partial().optional()
  })
  .strict();

const userRolesSchema = z.object({
  roles: z.array(z.string().trim().min(1)).max(20)
});

const userBranchAccessUpdateSchema = z.object({
  branchId: z.string().trim().nullable().optional(),
  branchAccesses: z.array(branchAccessSchema).max(20).optional().default([])
});

const userPasswordResetSchema = z.object({
  newPassword: z.string().min(8, "Password mínimo 8 caracteres")
});

const userPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Password actual requerido"),
  newPassword: z.string().min(8, "Password mínimo 8 caracteres")
});

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values || []).map((value) => value.trim()).filter(Boolean)));
}

function normalizeBranchAccesses(rawAccesses: BranchAccess[] | undefined, fallbackBranchId?: string | null) {
  const accessMap = new Map<string, { branchId: string; accessMode: "LOCKED" | "SWITCH"; isDefault: boolean }>();

  for (const row of rawAccesses || []) {
    const branchId = row.branchId?.trim();
    if (!branchId) continue;
    accessMap.set(branchId, {
      branchId,
      accessMode: row.accessMode === "SWITCH" ? "SWITCH" : "LOCKED",
      isDefault: Boolean(row.isDefault)
    });
  }

  if (fallbackBranchId && !accessMap.has(fallbackBranchId)) {
    accessMap.set(fallbackBranchId, {
      branchId: fallbackBranchId,
      accessMode: "LOCKED",
      isDefault: accessMap.size === 0
    });
  }

  const normalized = Array.from(accessMap.values());
  if (normalized.length === 0) return normalized;

  const explicitDefault = normalized.findIndex((row) => row.isDefault);
  const defaultIndex =
    explicitDefault >= 0 ? explicitDefault : fallbackBranchId ? Math.max(normalized.findIndex((row) => row.branchId === fallbackBranchId), 0) : 0;

  return normalized.map((row, index) => ({
    branchId: row.branchId,
    accessMode: row.accessMode,
    isDefault: index === defaultIndex
  }));
}

async function resolveRoles(tx: Pick<PrismaLike, "role">, roleNames: string[]) {
  if (roleNames.length === 0) return [];
  const roles = await tx.role.findMany({
    where: { name: { in: roleNames } },
    select: { id: true, name: true }
  });

  if (roles.length !== roleNames.length) {
    throw { status: 400, body: { error: "Rol inválido", details: { roles: roleNames } } };
  }

  return roles;
}

async function replaceUserRoles(tx: Pick<PrismaLike, "role" | "userRole">, userId: string, roleNames: string[]) {
  const roles = await resolveRoles(tx, roleNames);
  if (tx.userRole) {
    await tx.userRole.deleteMany({ where: { userId } });
    if (roles.length > 0) {
      await tx.userRole.createMany({
        data: roles.map((role: any) => ({ userId, roleId: role.id })),
        skipDuplicates: true
      });
    }
  }
  return roles.map((role: any) => role.name);
}

async function replaceBranchAccesses(
  tx: Pick<PrismaLike, "userBranchAccess">,
  userId: string,
  branchId: string | null | undefined,
  branchAccesses: BranchAccess[] | undefined
) {
  const normalized = normalizeBranchAccesses(branchAccesses, branchId ?? null);

  if (tx.userBranchAccess) {
    await tx.userBranchAccess.deleteMany({ where: { userId } });
    if (normalized.length > 0) {
      await tx.userBranchAccess.createMany({
        data: normalized.map((row) => ({
          userId,
          tenantId: "global",
          branchId: row.branchId,
          accessMode: row.accessMode,
          isDefault: row.isDefault
        })),
        skipDuplicates: true
      });
    }
  }

  return normalized;
}

async function upsertUserAddress(tx: Pick<PrismaLike, "userProfile">, userId: string, address: z.infer<typeof addressSchema> | undefined) {
  if (!address || !tx.userProfile) return;
  await tx.userProfile.upsert({
    where: { userId },
    update: {
      phone: address.phone || undefined,
      dpi: address.dpi || undefined
    },
    create: {
      userId,
      phone: address.phone || null,
      dpi: address.dpi || null
    }
  });
}

async function generateEmployeeCode(hrEmployee: NonNullable<PrismaLike["hrEmployee"]>) {
  const last = await hrEmployee.findFirst({ orderBy: { createdAt: "desc" }, select: { employeeCode: true } });
  let nextNumber = 1;
  if (last?.employeeCode) {
    const match = String(last.employeeCode).match(/(\d+)$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  return `EMP-${String(nextNumber).padStart(6, "0")}`;
}

export async function linkUserAndEmployee(prisma: PrismaLike, userId: string, employeeId: string) {
  if (!prisma.hrEmployee) {
    throw { status: 501, body: { error: "Vinculación RRHH no disponible en esta base" } };
  }

  const run = async (tx: any) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw { status: 404, body: { error: "Usuario no encontrado" } };

    const employee = await tx.hrEmployee.findUnique({ where: { id: employeeId } });
    if (!employee) throw { status: 404, body: { error: "Empleado no encontrado" } };
    if (employee.userId && employee.userId !== userId) {
      throw { status: 409, body: { error: "Empleado ya vinculado a otro usuario" } };
    }

    const existing = await tx.hrEmployee.findFirst({ where: { userId, NOT: { id: employeeId } } });
    if (existing) {
      throw { status: 409, body: { error: "Usuario ya vinculado a otro empleado" } };
    }

    await tx.hrEmployee.update({ where: { id: employeeId }, data: { userId } });
    return { userId, employeeId };
  };

  return prisma.$transaction ? prisma.$transaction((tx: any) => run(tx)) : run(prisma as any);
}

export async function unlinkUserAndEmployee(prisma: PrismaLike, userId: string) {
  if (!prisma.hrEmployee) {
    throw { status: 501, body: { error: "Vinculación RRHH no disponible en esta base" } };
  }

  const employee = await prisma.hrEmployee.findFirst({ where: { userId } });
  if (!employee) {
    throw { status: 404, body: { error: "No hay vínculo para este usuario" } };
  }

  await prisma.hrEmployee.update({ where: { id: employee.id }, data: { userId: null } });
  return { employeeId: employee.id };
}

export async function createUserWithOptionalHrProfile(prisma: PrismaLike, rawInput: unknown) {
  const parsed = userCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  const data = parsed.data;
  if (data.createHrProfile && !data.hrProfile) {
    throw { status: 400, body: { error: "Perfil RRHH requerido", code: "HR_PROFILE_REQUIRED" } };
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw { status: 409, body: { error: "Correo ya utilizado" } };
  }

  const passwordHash = await hashPasswordForTenant(data.password, "global");
  const requestedRoles = uniqueStrings(data.roles);
  const branchId = data.branchId || data.hrProfile?.branchId || null;

  const run = async (tx: any) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.displayName || null,
        passwordHash,
        isActive: data.isActive,
        branchId
      }
    });

    await replaceUserRoles(tx, user.id, requestedRoles);
    await replaceBranchAccesses(tx, user.id, branchId, data.branchAccesses);
    await upsertUserAddress(tx, user.id, data.address);

    let employee = null;
    if (data.createHrProfile && data.hrProfile && tx.hrEmployee) {
      const employeeCode = await generateEmployeeCode(tx.hrEmployee);
      employee = await tx.hrEmployee.create({
        data: {
          employeeCode,
          firstName: data.hrProfile.firstName,
          lastName: data.hrProfile.lastName,
          dpi: data.hrProfile.dpi,
          birthDate: data.hrProfile.birthDate ? new Date(data.hrProfile.birthDate) : null,
          phoneMobile: data.hrProfile.phone || null,
          addressHome: data.hrProfile.address || null,
          status: "ACTIVE",
          onboardingStatus: "DRAFT",
          onboardingStep: 1,
          isActive: false,
          userId: user.id
        }
      });
    }

    return { user, employee };
  };

  return prisma.$transaction ? prisma.$transaction((tx: any) => run(tx)) : run(prisma as any);
}

export async function updateUserAccount(prisma: PrismaLike, userId: string, rawInput: unknown) {
  const parsed = userUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) throw { status: 404, body: { error: "Usuario no encontrado" } };

  const data = parsed.data;
  const nextEmail = data.email ?? current.email;
  if (nextEmail !== current.email) {
    const conflict = await prisma.user.findUnique({ where: { email: nextEmail } });
    if (conflict && conflict.id !== userId) {
      throw { status: 409, body: { error: "Correo ya utilizado" } };
    }
  }

  const run = async (tx: any) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        email: nextEmail,
        name: typeof data.displayName === "undefined" ? current.name : data.displayName || null,
        isActive: typeof data.isActive === "boolean" ? data.isActive : current.isActive,
        branchId: typeof data.branchId === "undefined" ? current.branchId : data.branchId || null
      }
    });

    await upsertUserAddress(tx, userId, data.address);
    return user;
  };

  return prisma.$transaction ? prisma.$transaction((tx: any) => run(tx)) : run(prisma as any);
}

export async function updateUserRoles(prisma: PrismaLike, userId: string, rawInput: unknown) {
  const parsed = userRolesSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, body: { error: "Usuario no encontrado" } };

  const roleNames = uniqueStrings(parsed.data.roles);
  const run = async (tx: any) => replaceUserRoles(tx, userId, roleNames);
  return prisma.$transaction ? prisma.$transaction((tx: any) => run(tx)) : run(prisma as any);
}

export async function updateUserBranchAccess(prisma: PrismaLike, userId: string, rawInput: unknown) {
  const parsed = userBranchAccessUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, body: { error: "Usuario no encontrado" } };

  const branchId =
    typeof parsed.data.branchId === "undefined" ? user.branchId || null : parsed.data.branchId || null;

  const run = async (tx: any) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { branchId }
    });

    const accesses = await replaceBranchAccesses(tx, userId, branchId, parsed.data.branchAccesses);
    return { user: updated, accesses };
  };

  return prisma.$transaction ? prisma.$transaction((tx: any) => run(tx)) : run(prisma as any);
}

export async function resetUserPassword(prisma: PrismaLike, userId: string, rawInput: unknown) {
  const parsed = userPasswordResetSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, body: { error: "Usuario no encontrado" } };

  const passwordHash = await hashPasswordForTenant(parsed.data.newPassword, "global");
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function changeOwnPassword(prisma: PrismaLike, userId: string, rawInput: unknown) {
  const parsed = userPasswordChangeSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, body: { error: "Usuario no encontrado" } };

  const validCurrentPassword = await validatePassword(parsed.data.currentPassword, user.passwordHash);
  if (!validCurrentPassword) {
    throw {
      status: 401,
      body: { error: "Password actual inválido", code: "INVALID_CURRENT_PASSWORD" }
    };
  }

  const passwordHash = await hashPasswordForTenant(parsed.data.newPassword, "global");
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export {
  addressSchema,
  hrProfileSchema,
  userBranchAccessUpdateSchema,
  userCreateSchema,
  userPasswordChangeSchema,
  userPasswordResetSchema,
  userRolesSchema,
  userUpdateSchema
};
