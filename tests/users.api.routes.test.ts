import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { POST as createUserRoute, GET as listUsersRoute } from "@/app/api/users/route";
import { GET as getUserRoute, PATCH as patchUserRoute } from "@/app/api/users/[id]/route";
import { PUT as putUserRolesRoute } from "@/app/api/users/[id]/roles/route";
import { PUT as putUserBranchAccessRoute } from "@/app/api/users/[id]/branch-access/route";
import { POST as resetUserPasswordRoute } from "@/app/api/users/[id]/reset-password/route";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

type MockUser = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  isActive: boolean;
  tenantId: string | null;
  branchId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function authCookie() {
  const token = jwt.sign(
    {
      id: "admin-1",
      email: "admin@starmedical.test",
      roles: ["ADMIN"],
      permissions: [],
      tenantId: "global"
    },
    process.env.AUTH_SECRET || "test-star-secret",
    { expiresIn: "1h" }
  );
  return `${AUTH_COOKIE_NAME}=${token}`;
}

function jsonRequest(url: string, method: string, body?: Record<string, unknown>) {
  return new NextRequest(url, {
    method,
    headers: {
      cookie: authCookie(),
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

function patchPrisma(partial: Record<string, unknown>) {
  const originals = new Map<string, unknown>();
  for (const [key, value] of Object.entries(partial)) {
    originals.set(key, (prisma as any)[key]);
    (prisma as any)[key] = value;
  }
  return () => {
    for (const [key, value] of originals.entries()) {
      (prisma as any)[key] = value;
    }
  };
}

function makeUsersRoutePrismaMock() {
  const users: MockUser[] = [];
  const roles = [
    { id: "role-admin", name: "ADMIN", description: "Administrador", isSystem: true },
    { id: "role-staff", name: "STAFF", description: "Staff", isSystem: true }
  ];
  const branches = [
    { id: "b1", name: "Central", code: "CENT", isActive: true },
    { id: "b2", name: "Norte", code: "NRT", isActive: true }
  ];
  const userRoles: Array<{ userId: string; roleId: string }> = [];
  const branchAccesses: Array<{
    id: string;
    userId: string;
    tenantId: string;
    branchId: string;
    accessMode: "LOCKED" | "SWITCH";
    isDefault: boolean;
  }> = [];
  const profiles: Array<Record<string, unknown>> = [];
  const auditEntries: any[] = [];

  function matchUserWhere(user: MockUser, where: any) {
    const clauses: any[] = Array.isArray(where?.AND) ? where.AND : [];
    return clauses.every((clause: any) => {
      if (clause?.OR && Array.isArray(clause.OR)) {
        return clause.OR.some((item: any) => {
          if (item.email?.contains) {
            return user.email.toLowerCase().includes(String(item.email.contains).toLowerCase());
          }
          if (item.name?.contains) {
            return String(user.name || "")
              .toLowerCase()
              .includes(String(item.name.contains).toLowerCase());
          }
          if (item.branchId) return user.branchId === item.branchId;
          if (item.branchAccesses?.some?.branchId) {
            return branchAccesses.some((row) => row.userId === user.id && row.branchId === item.branchAccesses.some.branchId);
          }
          return false;
        });
      }
      if (typeof clause?.isActive === "boolean") return user.isActive === clause.isActive;
      if (clause?.roles?.some?.role?.name) {
        const roleName = clause.roles.some.role.name;
        return userRoles.some((row) => row.userId === user.id && roles.find((role) => role.id === row.roleId)?.name === roleName);
      }
      return true;
    });
  }

  function attachUser(user: MockUser) {
    const profile = profiles.find((row) => row.userId === user.id) || null;
    return {
      ...user,
      profile: profile
        ? {
            ...profile,
            jobRole: null,
            department: null,
            municipality: null
          }
        : null,
      roles: userRoles
        .filter((row) => row.userId === user.id)
        .map((row) => ({ role: roles.find((role) => role.id === row.roleId) })),
      branchAccesses: branchAccesses
        .filter((row) => row.userId === user.id)
        .map((row) => ({
          ...row,
          branch: branches.find((branch) => branch.id === row.branchId)
        }))
    };
  }

  const mock: any = {
    user: {
      findUnique: async ({ where, select }: any) => {
        const user = users.find((row) => (where?.id && row.id === where.id) || (where?.email && row.email === where.email)) || null;
        if (!user) return null;
        if (select?.id) return { id: user.id };
        return attachUser(user);
      },
      findMany: async ({ where, skip = 0, take = 50 }: any) =>
        users.filter((user) => matchUserWhere(user, where)).slice(skip, skip + take).map(attachUser),
      count: async ({ where }: any = {}) => users.filter((user) => matchUserWhere(user, where)).length,
      create: async ({ data }: any) => {
        const user: MockUser = {
          id: `u${users.length + 1}`,
          email: data.email,
          name: data.name || null,
          passwordHash: data.passwordHash,
          isActive: data.isActive !== false,
          tenantId: data.tenantId || "global",
          branchId: data.branchId || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        users.push(user);
        return user;
      },
      update: async ({ where, data }: any) => {
        const user = users.find((row) => row.id === where.id);
        if (!user) throw new Error("not found");
        Object.assign(user, data, { updatedAt: new Date() });
        return user;
      }
    },
    role: {
      findMany: async ({ where, select }: any = {}) => {
        const filtered = where?.name?.in ? roles.filter((role) => where.name.in.includes(role.name)) : roles;
        if (!select) return filtered;
        return filtered.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          isSystem: role.isSystem
        }));
      }
    },
    branch: {
      findMany: async ({ where }: any = {}) =>
        branches.filter((branch) => (typeof where?.isActive === "boolean" ? branch.isActive === where.isActive : true))
    },
    userRole: {
      deleteMany: async ({ where }: any) => {
        for (let index = userRoles.length - 1; index >= 0; index -= 1) {
          if (userRoles[index].userId === where.userId) userRoles.splice(index, 1);
        }
        return { count: 0 };
      },
      createMany: async ({ data }: any) => {
        userRoles.push(...data);
        return { count: data.length };
      },
      upsert: async ({ where, create }: any) => {
        const exists = userRoles.find(
          (row) => row.userId === where.userId_roleId.userId && row.roleId === where.userId_roleId.roleId
        );
        if (!exists) userRoles.push(create);
        return create;
      }
    },
    userBranchAccess: {
      deleteMany: async ({ where }: any) => {
        for (let index = branchAccesses.length - 1; index >= 0; index -= 1) {
          if (branchAccesses[index].userId === where.userId) branchAccesses.splice(index, 1);
        }
        return { count: 0 };
      },
      createMany: async ({ data }: any) => {
        branchAccesses.push(
          ...data.map((row: any, index: number) => ({
            id: `uba-${branchAccesses.length + index + 1}`,
            ...row
          }))
        );
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
        profiles.push({ ...create });
        return create;
      }
    },
    hrEmployee: {
      findFirst: async () => null,
      findUnique: async () => null,
      create: async () => null,
      update: async () => null
    },
    auditLog: {
      create: async ({ data }: any) => {
        auditEntries.push(data);
        return { id: `audit-${auditEntries.length}` };
      }
    },
    tenantSecurityPolicy: undefined,
    $transaction: async (arg: any) => (typeof arg === "function" ? arg(mock) : Promise.all(arg))
  };

  return { mock, state: { users, userRoles, branchAccesses, auditEntries } };
}

test("API de usuarios usa Prisma real como fuente de verdad para CRUD y password reset", async () => {
  const { mock, state } = makeUsersRoutePrismaMock();
  const restore = patchPrisma(mock);

  try {
    const createResponse = await createUserRoute(
      jsonRequest("http://localhost/api/users", "POST", {
        email: "nuevo@starmedical.test",
        displayName: "Nuevo Usuario",
        password: "Password123",
        roles: ["STAFF"],
        branchId: "b1",
        branchAccesses: [{ branchId: "b1", accessMode: "LOCKED", isDefault: true }]
      })
    );
    const createPayload = await createResponse.json();
    const userId = createPayload.data.userId as string;

    assert.equal(createResponse.status, 201);
    assert.equal(state.users.length, 1);

    const listResponse = await listUsersRoute(new NextRequest("http://localhost/api/users?page=1&pageSize=20", {
      headers: { cookie: authCookie() }
    }));
    const listPayload = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(listPayload.data.items[0].email, "nuevo@starmedical.test");

    const getResponse = await getUserRoute(
      new NextRequest(`http://localhost/api/users/${userId}`, { headers: { cookie: authCookie() } }),
      { params: { id: userId } }
    );
    const getPayload = await getResponse.json();
    assert.equal(getResponse.status, 200);
    assert.equal(getPayload.data.roleNames[0], "STAFF");

    const patchResponse = await patchUserRoute(
      jsonRequest(`http://localhost/api/users/${userId}`, "PATCH", {
        displayName: "Usuario Editado",
        isActive: false,
        branchId: "b2"
      }),
      { params: { id: userId } }
    );
    assert.equal(patchResponse.status, 200);

    const rolesResponse = await putUserRolesRoute(
      jsonRequest(`http://localhost/api/users/${userId}/roles`, "PUT", {
        roles: ["ADMIN"]
      }),
      { params: { id: userId } }
    );
    assert.equal(rolesResponse.status, 200);

    const branchAccessResponse = await putUserBranchAccessRoute(
      jsonRequest(`http://localhost/api/users/${userId}/branch-access`, "PUT", {
        branchId: "b2",
        branchAccesses: [{ branchId: "b2", accessMode: "SWITCH", isDefault: true }]
      }),
      { params: { id: userId } }
    );
    assert.equal(branchAccessResponse.status, 200);

    const resetPasswordResponse = await resetUserPasswordRoute(
      jsonRequest(`http://localhost/api/users/${userId}/reset-password`, "POST", {
        newPassword: "Password456"
      }),
      { params: { id: userId } }
    );
    assert.equal(resetPasswordResponse.status, 200);

    const refreshedResponse = await getUserRoute(
      new NextRequest(`http://localhost/api/users/${userId}`, { headers: { cookie: authCookie() } }),
      { params: { id: userId } }
    );
    const refreshedPayload = await refreshedResponse.json();

    assert.equal(refreshedPayload.data.name, "Usuario Editado");
    assert.equal(refreshedPayload.data.isActive, false);
    assert.deepEqual(refreshedPayload.data.roleNames, ["ADMIN"]);
    assert.equal(refreshedPayload.data.branchId, "b2");
    assert.equal(refreshedPayload.data.branchAccesses[0].branchId, "b2");
    assert.ok(state.auditEntries.length >= 4);
  } finally {
    restore();
  }
});
