import { z } from "zod";
import { hashPasswordForTenant, validatePassword } from "@/lib/auth-password";
import { normalizeTenantId } from "@/lib/tenant";
import { emailSchema, nameSchema, dpiSchema, dateSchema, phoneGtSchema, displayNameSchema } from "@/lib/validation/person";

type PrismaLike = {
  user: {
    findUnique(args: any): Promise<any>;
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
  };
  role: { findMany(args: any): Promise<any> };
  userRole: {
    createMany(args: any): Promise<any>;
    deleteMany(args: any): Promise<any>;
    upsert?(args: any): Promise<any>;
  };
  userBranchAccess: {
    deleteMany(args: any): Promise<any>;
    createMany(args: any): Promise<any>;
  };
  userProfile: {
    upsert(args: any): Promise<any>;
  };
  hrEmployee: {
    findFirst(args: any): Promise<any>;
    findUnique(args: any): Promise<any>;
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
  };
  $transaction?<T>(cb: (tx: any) => Promise<T>): Promise<T>;
};

type ResolvedRole = {
  id: string;
  name: string;
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
  departmentId: z.string().trim().optional(),
  municipalityId: z.string().trim().optional(),
  housingSector: z.string().trim().max(120).optional(),
  addressLine: z.string().trim().max(240).optional(),
  addressReference: z.string().trim().max(240).optional(),
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
  roles: z.array(z.string().trim()).optional(),
  tenantId: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
  branchAccesses: z.array(branchAccessSchema).optional(),
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
    tenantId: z.string().trim().optional(),
    branchId: z.string().trim().nullable().optional(),
    address: addressSchema.partial().optional()
  })
  .strict();

const userRolesSchema = z
  .object({
    roles: z.array(z.string().trim().min(1)).max(20)
  })
  .strict();

const userBranchAccessUpdateSchema = z
  .object({
    branchId: z.string().trim().nullable().optional(),
    branchAccesses: z.array(branchAccessSchema).max(20).optional().default([])
  })
  .strict();

const userPasswordResetSchema = z
  .object({
    newPassword: z.string().min(8, "Password mínimo 8 caracteres")
  })
  .strict();

const userPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Password actual requerido"),
    newPassword: z.string().min(8, "Password mínimo 8 caracteres")
  })
  .strict();

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values || []).map((value) => value.trim()).filter(Boolean)));
}

function normalizeBranchAccesses(
  rawBranchAccesses: Array<{ branchId: string; accessMode?: "LOCKED" | "SWITCH"; isDefault?: boolean }> | undefined,
  fallbackBranchId?: string | null
) {
  const branchAccesses = Array.from(
    new Map(
      (rawBranchAccesses || [])
        .filter((row) => row.branchId?.trim())
        .map((row) => [
          row.branchId.trim(),
          {
            branchId: row.branchId.trim(),
            accessMode: row.accessMode === "SWITCH" ? "SWITCH" : "LOCKED",
            isDefault: Boolean(row.isDefault)
          }
        ])
    ).values()
  );

  if (fallbackBranchId && !branchAccesses.some((row) => row.branchId === fallbackBranchId)) {
    branchAccesses.push({
      branchId: fallbackBranchId,
      accessMode: "LOCKED",
      isDefault: branchAccesses.length === 0
    });
  }

  if (branchAccesses.length === 0) return [];

  const defaultIndex =
    branchAccesses.findIndex((row) => row.isDefault) >= 0
      ? branchAccesses.findIndex((row) => row.isDefault)
      : fallbackBranchId
        ? Math.max(
            branchAccesses.findIndex((row) => row.branchId === fallbackBranchId),
            0
          )
        : 0;

  return branchAccesses.map((row, index) => ({
    branchId: row.branchId,
    accessMode: row.accessMode,
    isDefault: index === defaultIndex
  }));
}

async function resolveRoleIds(tx: Pick<PrismaLike, "role">, roleNames: string[]) {
  if (roleNames.length === 0) return [];
  const roles = (await tx.role.findMany({
    where: { name: { in: roleNames } },
    select: { id: true, name: true }
  })) as ResolvedRole[];
  if (roles.length !== roleNames.length) {
    throw { status: 400, body: { error: "Rol inválido", details: { roles: roleNames } } };
  }
  return roles;
}

async function replaceUserRoles(tx: Pick<PrismaLike, "role" | "userRole">, userId: string, roleNames: string[]) {
  const roles = await resolveRoleIds(tx as Pick<PrismaLike, "role">, roleNames);
  await tx.userRole.deleteMany({ where: { userId } });
  if (roles.length > 0) {
    await tx.userRole.createMany({
      data: roles.map((role) => ({ userId, roleId: role.id })),
      skipDuplicates: true
    });
  }
  return roles.map((role) => role.name);
}

async function replaceBranchAccesses(
  tx: Pick<PrismaLike, "userBranchAccess">,
  input: { userId: string; tenantId: string; branchId?: string | null; branchAccesses?: Array<{ branchId: string; accessMode?: "LOCKED" | "SWITCH"; isDefault?: boolean }> }
) {
  const normalized = normalizeBranchAccesses(input.branchAccesses, input.branchId ?? null);
  await tx.userBranchAccess.deleteMany({ where: { userId: input.userId } });
  if (normalized.length > 0) {
    await tx.userBranchAccess.createMany({
      data: normalized.map((row) => ({
        userId: input.userId,
        tenantId: input.tenantId,
        branchId: row.branchId,
        accessMode: row.accessMode,
        isDefault: row.isDefault
      })),
      skipDuplicates: true
    });
  }
  return normalized;
}

async function upsertUserAddress(tx: Pick<PrismaLike, "userProfile">, userId: string, address: z.infer<typeof addressSchema> | undefined) {
  if (!address) return;
  await tx.userProfile.upsert({
    where: { userId },
    update: {
      phone: address.phone || undefined,
      dpi: address.dpi || undefined,
      departmentId: address.departmentId || null,
      municipalityId: address.municipalityId || null,
      housingSector: address.housingSector || null,
      addressLine: address.addressLine || null,
      addressReference: address.addressReference || null
    },
    create: {
      userId,
      phone: address.phone || null,
      dpi: address.dpi || null,
      departmentId: address.departmentId || null,
      municipalityId: address.municipalityId || null,
      housingSector: address.housingSector || null,
      addressLine: address.addressLine || null,
      addressReference: address.addressReference || null
    }
  });
}

async function generateEmployeeCode(tx: PrismaLike["hrEmployee"]): Promise<string> {
  const last = await tx.findFirst({ orderBy: { createdAt: "desc" }, select: { employeeCode: true } });
  let nextNumber = 1;
  if (last?.employeeCode) {
    const match = last.employeeCode.match(/(\d+)$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  for (let i = 0; i < 10; i++) {
    const candidate = `EMP-${String(nextNumber + i).padStart(6, "0")}`;
    const exists = await tx.findUnique({ where: { employeeCode: candidate } });
    if (!exists) return candidate;
  }
  return `EMP-${Date.now()}`;
}

export async function linkUserAndEmployee(prisma: PrismaLike, userId: string, employeeId: string) {
  return prisma.$transaction
    ? prisma.$transaction((tx: any) => doLink(tx, userId, employeeId))
    : doLink(prisma as any, userId, employeeId);
}

async function doLink(prisma: any, userId: string, employeeId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, body: { error: "Usuario no encontrado" } };

  const employee = await prisma.hrEmployee.findUnique({ where: { id: employeeId } });
  if (!employee) throw { status: 404, body: { error: "Empleado no encontrado" } };

  if (employee.userId && employee.userId !== userId) {
    throw { status: 409, body: { error: "Empleado ya vinculado a otro usuario" } };
  }

  const existingLink = await prisma.hrEmployee.findFirst({ where: { userId, NOT: { id: employeeId } } });
  if (existingLink) {
    throw { status: 409, body: { error: "Usuario ya vinculado a otro empleado" } };
  }

  await prisma.hrEmployee.update({ where: { id: employeeId }, data: { userId } });
  return { userId, employeeId };
}

export async function unlinkUserAndEmployee(prisma: PrismaLike, userId: string) {
  const employee = await prisma.hrEmployee.findFirst({ where: { userId } });
  if (!employee) throw { status: 404, body: { error: "No hay vínculo para este usuario" } };
  await prisma.hrEmployee.update({ where: { id: employee.id }, data: { userId: null } });
  return { employeeId: employee.id };
}

export async function createUserWithOptionalHrProfile(prisma: PrismaLike, rawInput: unknown) {
  const parsed = userCreateSchema.safeParse(rawInput);
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const data = parsed.data;
  const createHr = data.createHrProfile;
  if (createHr && !data.hrProfile) {
    throw { status: 400, body: { error: "Perfil RRHH requerido", code: "HR_PROFILE_REQUIRED" } };
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw { status: 409, body: { error: "Correo ya utilizado" } };

  const tenantId = normalizeTenantId(data.tenantId);
  const branchId = data.branchId || data.hrProfile?.branchId || null;
  const hash = await hashPasswordForTenant(data.password, tenantId);
  const requestedRoles = uniqueStrings(data.roles);

  const exec = async (tx: any) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.displayName || null,
        passwordHash: hash,
        isActive: data.isActive,
        tenantId,
        branchId
      }
    });

    await replaceUserRoles(tx, user.id, requestedRoles);
    await replaceBranchAccesses(tx, {
      userId: user.id,
      tenantId,
      branchId,
      branchAccesses: data.branchAccesses
    });

    let employee: any = null;
    if (createHr) {
      const code = await generateEmployeeCode(tx.hrEmployee);
      employee = await tx.hrEmployee.create({
        data: {
          employeeCode: code,
          firstName: data.hrProfile!.firstName,
          lastName: data.hrProfile!.lastName,
          dpi: data.hrProfile!.dpi,
          birthDate: data.hrProfile!.birthDate ? new Date(data.hrProfile!.birthDate) : null,
          phoneMobile: data.hrProfile!.phone || null,
          addressHome: data.hrProfile!.address || null,
          status: "ACTIVE",
          onboardingStatus: "DRAFT",
          onboardingStep: 1,
          isActive: false,
          userId: user.id
        }
      });
    }

    await upsertUserAddress(tx, user.id, data.address);

    return { user, employee };
  };

  if (prisma.$transaction) {
    return prisma.$transaction((tx: any) => exec(tx));
  }
  return exec(prisma as any);
}

export async function updateUserAccount(prisma: PrismaLike, userId: string, rawInput: unknown) {
  const parsed = userUpdateSchema.safeParse(rawInput);
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

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

  const tenantId = normalizeTenantId(data.tenantId ?? current.tenantId);

  const exec = async (tx: any) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        email: nextEmail,
        name: typeof data.displayName === "undefined" ? current.name : data.displayName || null,
        isActive: typeof data.isActive === "boolean" ? data.isActive : current.isActive,
        tenantId,
        branchId: typeof data.branchId === "undefined" ? current.branchId : data.branchId || null
      }
    });

    await upsertUserAddress(tx, userId, data.address);
    return user;
  };

  if (prisma.$transaction) {
    return prisma.$transaction((tx: any) => exec(tx));
  }
  return exec(prisma as any);
}

export async function updateUserRoles(prisma: PrismaLike, userId: string, rawInput: unknown) {
  const parsed = userRolesSchema.safeParse(rawInput);
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, body: { error: "Usuario no encontrado" } };

  const roles = uniqueStrings(parsed.data.roles);
  const exec = async (tx: any) => replaceUserRoles(tx, userId, roles);

  if (prisma.$transaction) {
    return prisma.$transaction((tx: any) => exec(tx));
  }
  return exec(prisma as any);
}

export async function updateUserBranchAccess(prisma: PrismaLike, userId: string, rawInput: unknown) {
  const parsed = userBranchAccessUpdateSchema.safeParse(rawInput);
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, body: { error: "Usuario no encontrado" } };

  const branchId =
    typeof parsed.data.branchId === "undefined"
      ? user.branchId || null
      : parsed.data.branchId || null;
  const tenantId = normalizeTenantId(user.tenantId);

  const exec = async (tx: any) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        branchId
      }
    });
    const accesses = await replaceBranchAccesses(tx, {
      userId,
      tenantId,
      branchId,
      branchAccesses: parsed.data.branchAccesses
    });
    return { user: updated, accesses };
  };

  if (prisma.$transaction) {
    return prisma.$transaction((tx: any) => exec(tx));
  }
  return exec(prisma as any);
}

export async function resetUserPassword(prisma: PrismaLike, userId: string, rawInput: unknown) {
  const parsed = userPasswordResetSchema.safeParse(rawInput);
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, body: { error: "Usuario no encontrado" } };

  const passwordHash = await hashPasswordForTenant(parsed.data.newPassword, user.tenantId);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
}

export async function changeOwnPassword(prisma: PrismaLike, userId: string, rawInput: unknown) {
  const parsed = userPasswordChangeSchema.safeParse(rawInput);
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, body: { error: "Usuario no encontrado" } };

  const validCurrentPassword = await validatePassword(parsed.data.currentPassword, user.passwordHash);
  if (!validCurrentPassword) {
    throw {
      status: 401,
      body: {
        error: "Password actual inválido",
        code: "INVALID_CURRENT_PASSWORD"
      }
    };
  }

  const passwordHash = await hashPasswordForTenant(parsed.data.newPassword, user.tenantId);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
}

export {
  userCreateSchema,
  userUpdateSchema,
  userRolesSchema,
  userBranchAccessUpdateSchema,
  userPasswordResetSchema,
  userPasswordChangeSchema,
  hrProfileSchema
};
