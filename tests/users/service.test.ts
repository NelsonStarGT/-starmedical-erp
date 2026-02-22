import assert from "node:assert/strict";
import test from "node:test";
import { dpiSchema } from "@/lib/validation/person";
import { createUserWithOptionalHrProfile, linkUserAndEmployee } from "@/lib/users/service";

function makePrismaMock() {
  const users: any[] = [];
  const employees: any[] = [];
  const roles: any[] = [];

  const prisma: any = {
    user: {
      findUnique: async ({ where }: any) => users.find((u) => (where.id && u.id === where.id) || (where.email && u.email === where.email)) || null,
      create: async ({ data }: any) => {
        const user = { id: data.id || `u${users.length + 1}`, ...data };
        users.push(user);
        return user;
      }
    },
    role: {
      findMany: async () => roles
    },
    userRole: {
      createMany: async () => ({ count: 0 })
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
    _data: { users, employees, roles }
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
  const result = await createUserWithOptionalHrProfile(prisma, {
    email: "b@test.com",
    password: "password123",
    createHrProfile: false
  });
  assert.ok(result.user.id);
  assert.equal(prisma._data.employees.length, 0);
});

test("createUserWithOptionalHrProfile=true crea usuario y RRHH vinculado", async () => {
  const prisma = makePrismaMock();
  const result = await createUserWithOptionalHrProfile(prisma, {
    email: "c@test.com",
    password: "password123",
    createHrProfile: true,
    hrProfile: {
      firstName: "Juan",
      lastName: "Pérez",
      dpi: "1234567890123",
      phone: "55551234",
      address: "Palín"
    }
  });
  assert.ok(result.user.id);
  assert.ok(result.employee?.id);
  assert.equal(result.employee?.userId, result.user.id);
});
