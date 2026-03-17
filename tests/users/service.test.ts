import assert from "node:assert/strict";
import test from "node:test";
import { dpiSchema } from "@/lib/validation/person";
import { prisma as globalPrisma } from "@/lib/prisma";
import {
  changeOwnPassword,
  createUserWithOptionalHrProfile,
  linkUserAndEmployee,
  resetUserPassword,
  updateUserAccount,
  updateUserBranchAccess,
  updateUserRoles
} from "@/lib/users/service";

function withDefaultTenantPolicy<T>(run: () => Promise<T>) {
  const original = (globalPrisma as any).tenantSecurityPolicy;
  (globalPrisma as any).tenantSecurityPolicy = undefined;
  return run().finally(() => {
    (globalPrisma as any).tenantSecurityPolicy = original;
  });
}

function makePrismaMock() {
  const users: any[] = [];
  const employees: any[] = [];
  const roles: any[] = [
    { id: "role-admin", name: "ADMIN" },
    { id: "role-staff", name: "STAFF" },
    { id: "role-hr", name: "HR_USER" }
  ];
  const userRoles: any[] = [];
  const branchAccesses: any[] = [];
  const profiles: any[] = [];

  const prisma: any = {
    user: {
      findUnique: async ({ where }: any) => users.find((u) => (where.id && u.id === where.id) || (where.email && u.email === where.email)) || null,
      create: async ({ data }: any) => {
        const user = { id: data.id || `u${users.length + 1}`, ...data };
        users.push(user);
        return user;
      },
      update: async ({ where, data }: any) => {
        const user = users.find((u) => u.id === where.id);
        if (!user) throw new Error("not found");
        Object.assign(user, data);
        return user;
      }
    },
    role: {
      findMany: async ({ where }: any = {}) =>
        where?.name?.in ? roles.filter((role) => where.name.in.includes(role.name)) : roles
    },
    userRole: {
      deleteMany: async ({ where }: any) => {
        const next = userRoles.filter((row) => row.userId !== where.userId);
        userRoles.splice(0, userRoles.length, ...next);
        return { count: 0 };
      },
      createMany: async ({ data }: any) => {
        userRoles.push(...data);
        return { count: data.length };
      }
    },
    userBranchAccess: {
      deleteMany: async ({ where }: any) => {
        const next = branchAccesses.filter((row) => row.userId !== where.userId);
        branchAccesses.splice(0, branchAccesses.length, ...next);
        return { count: 0 };
      },
      createMany: async ({ data }: any) => {
        branchAccesses.push(...data);
        return { count: data.length };
      }
    },
    userProfile: {
      upsert: async ({ where, update, create }: any) => {
        const existing = profiles.find((row) => row.userId === where.userId);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const profile = { ...create };
        profiles.push(profile);
        return profile;
      }
    },
    hrEmployee: {
      findFirst: async (args: any) => {
        if (args?.where?.orderBy) return employees[employees.length - 1] || null;
        if (args?.where?.userId) {
          const notId = args.where.NOT?.id;
          return employees.find((e) => e.userId === args.where.userId && (!notId || e.id !== notId)) || null;
        }
        return null;
      },
      findUnique: async ({ where }: any) => employees.find((e) => e.id === where.id || e.employeeCode === where.employeeCode) || null,
      create: async ({ data }: any) => {
        const emp = { id: data.id || `e${employees.length + 1}`, createdAt: new Date(), ...data };
        employees.push(emp);
        return emp;
      },
      update: async ({ where, data }: any) => {
        const emp = employees.find((e) => e.id === where.id);
        if (!emp) throw new Error("not found");
        Object.assign(emp, data);
        return emp;
      }
    },
    $transaction: async (cb: any) => cb(prisma),
    _data: { users, employees, roles, userRoles, branchAccesses, profiles }
  };

  return prisma;
}

test("dpiSchema valida 13 dígitos y rechaza letras", () => {
  assert.equal(dpiSchema.safeParse("1234567890123").success, true);
  assert.equal(dpiSchema.safeParse("1234abc").success, false);
});

test("linkUserAndEmployee devuelve 409 cuando employee ya vinculado", async () => {
  const prisma = makePrismaMock();
  const user = await prisma.user.create({ data: { email: "a@test.com", passwordHash: "x" } });
  await prisma.hrEmployee.create({ data: { employeeCode: "EMP-1", status: "ACTIVE", onboardingStatus: "ACTIVE", isActive: true, userId: "other" } });
  await assert.rejects(() => linkUserAndEmployee(prisma, user.id, "e1"), { status: 409 });
});

test("createUserWithOptionalHrProfile=false no crea empleado", async () => {
  const prisma = makePrismaMock();
  const result = await withDefaultTenantPolicy(() =>
    createUserWithOptionalHrProfile(prisma, {
      email: "b@test.com",
      password: "Password123",
      createHrProfile: false
    })
  );
  assert.ok(result.user.id);
  assert.equal(prisma._data.employees.length, 0);
});

test("createUserWithOptionalHrProfile=true crea usuario y RRHH vinculado", async () => {
  const prisma = makePrismaMock();
  const result = await withDefaultTenantPolicy(() =>
    createUserWithOptionalHrProfile(prisma, {
      email: "c@test.com",
      password: "Password123",
      createHrProfile: true,
      hrProfile: {
        firstName: "Juan",
        lastName: "Pérez",
        dpi: "1234567890123",
        phone: "55551234",
        address: "Palín"
      }
    })
  );
  assert.ok(result.user.id);
  assert.ok(result.employee?.id);
  assert.equal(result.employee?.userId, result.user.id);
});

test("createUserWithOptionalHrProfile aplica política de password", async () => {
  const prisma = makePrismaMock();
  await assert.rejects(
    () =>
      withDefaultTenantPolicy(() =>
        createUserWithOptionalHrProfile(prisma, {
          email: "policy@test.com",
          password: "short",
          createHrProfile: false
        })
      ),
    { status: 400 }
  );
});

test("updateUserAccount, roles, branchAccess y reset password operan sobre el usuario real", async () => {
  const prisma = makePrismaMock();
  const created = await withDefaultTenantPolicy(() =>
    createUserWithOptionalHrProfile(prisma, {
      email: "persisted@test.com",
      password: "Password123",
      roles: ["STAFF"],
      branchId: "b1",
      branchAccesses: [{ branchId: "b1", accessMode: "LOCKED", isDefault: true }],
      createHrProfile: false
    })
  );
  const initialPasswordHash = created.user.passwordHash;

  await updateUserAccount(prisma, created.user.id, {
    displayName: "Persisted User",
    isActive: false,
    branchId: "b2"
  });
  await updateUserRoles(prisma, created.user.id, { roles: ["ADMIN"] });
  await updateUserBranchAccess(prisma, created.user.id, {
    branchId: "b2",
    branchAccesses: [{ branchId: "b2", accessMode: "SWITCH", isDefault: true }]
  });
  await withDefaultTenantPolicy(() => resetUserPassword(prisma, created.user.id, { newPassword: "Password456" }));

  assert.equal(prisma._data.users[0].name, "Persisted User");
  assert.equal(prisma._data.users[0].isActive, false);
  assert.equal(prisma._data.users[0].branchId, "b2");
  assert.deepEqual(prisma._data.userRoles, [{ userId: created.user.id, roleId: "role-admin" }]);
  assert.deepEqual(prisma._data.branchAccesses, [
    { userId: created.user.id, tenantId: "global", branchId: "b2", accessMode: "SWITCH", isDefault: true }
  ]);
  assert.notEqual(prisma._data.users[0].passwordHash, initialPasswordHash);
});

test("changeOwnPassword exige password actual válido", async () => {
  const prisma = makePrismaMock();
  const created = await withDefaultTenantPolicy(() =>
    createUserWithOptionalHrProfile(prisma, {
      email: "owner@test.com",
      password: "Password123",
      createHrProfile: false
    })
  );
  const initialPasswordHash = created.user.passwordHash;

  await assert.rejects(
    () => changeOwnPassword(prisma, created.user.id, { currentPassword: "incorrecta", newPassword: "Password456" }),
    { status: 401 }
  );

  await withDefaultTenantPolicy(() =>
    changeOwnPassword(prisma, created.user.id, { currentPassword: "Password123", newPassword: "Password456" })
  );
  assert.notEqual(prisma._data.users[0].passwordHash, initialPasswordHash);
});
