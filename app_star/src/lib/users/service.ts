import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { emailSchema, nameSchema, dpiSchema, dateSchema, phoneGtSchema, displayNameSchema } from "@/lib/validation/person";
import { ROLE_PERMISSION_MAP } from "@/lib/security/permissionCatalog";

type PrismaLike = {
  user: {
    findUnique(args: any): Promise<any>;
    create(args: any): Promise<any>;
  };
  role: { findMany(args: any): Promise<any> };
  userRole: { createMany(args: any): Promise<any> };
  hrEmployee: {
    findFirst(args: any): Promise<any>;
    findUnique(args: any): Promise<any>;
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
  };
  $transaction?<T>(cb: (tx: any) => Promise<T>): Promise<T>;
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

const userCreateSchema = z.object({
  email: emailSchema,
  displayName: displayNameSchema.optional(),
  password: z.string().min(8, "Password mínimo 8 caracteres"),
  roles: z.array(z.string().trim()).optional(),
  createHrProfile: z.boolean().optional().default(false),
  hrProfile: hrProfileSchema.optional(),
  address: addressSchema.partial().optional()
});

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

  const hash = await bcrypt.hash(data.password, 10);
  const validRoles: string[] = (data.roles || [])
    .map((r: string) => r.toUpperCase())
    .filter((r: string): r is string => Boolean(ROLE_PERMISSION_MAP[r]));

  const exec = async (tx: any) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.displayName || null,
        passwordHash: hash,
        isActive: true
      }
    });

    if (validRoles.length) {
      const roles = await tx.role.findMany({ where: { name: { in: validRoles } }, select: { id: true, name: true } });
      if (roles.length !== validRoles.length) {
        throw { status: 400, body: { error: "Rol inválido" } };
      }
      await tx.userRole.createMany({
        data: roles.map((r: { id: string }) => ({ userId: user.id, roleId: r.id })),
        skipDuplicates: true
      });
    }

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

    if (data.address) {
      await tx.userProfile.upsert({
        where: { userId: user.id },
        update: {
          phone: data.address.phone || undefined,
          dpi: data.address.dpi || undefined,
          departmentId: data.address.departmentId || null,
          municipalityId: data.address.municipalityId || null,
          housingSector: data.address.housingSector || null,
          addressLine: data.address.addressLine || null,
          addressReference: data.address.addressReference || null
        },
        create: {
          userId: user.id,
          phone: data.address.phone || null,
          dpi: data.address.dpi || null,
          departmentId: data.address.departmentId || null,
          municipalityId: data.address.municipalityId || null,
          housingSector: data.address.housingSector || null,
          addressLine: data.address.addressLine || null,
          addressReference: data.address.addressReference || null
        }
      });
    }

    return { user, employee };
  };

  if (prisma.$transaction) {
    return prisma.$transaction((tx: any) => exec(tx));
  }
  return exec(prisma as any);
}

export { userCreateSchema, hrProfileSchema };
