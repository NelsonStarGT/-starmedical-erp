import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { POST as loginPost } from "@/app/api/login/route";
import { GET as rbacHealthGet } from "@/app/api/admin/health/rbac/route";
import { GET as configAppGet } from "@/app/api/config/app/route";
import { GET as financeSummaryGet } from "@/app/api/finanzas/summary/route";
import { POST as uploadImagePost } from "@/app/api/upload/image/route";
import { POST as whatsappSendPost } from "@/app/api/whatsapp/send/route";
import { GET as whatsappThreadsGet } from "@/app/api/whatsapp/threads/route";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { buildTenantSecurityPolicyDefaults } from "@/lib/config-central/security-policy";
import { prisma } from "@/lib/prisma";
import { syncPersistedRbac } from "@/lib/security/rbacSync";
import { resolveRuntimeSecret } from "@/lib/runtime-secrets";

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

function buildSessionCookie(input?: {
  id?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  tenantId?: string;
}) {
  const token = jwt.sign(
    {
      id: input?.id || "admin-user",
      email: input?.email || "admin@starmedical.test",
      roles: input?.roles || ["ADMIN"],
      permissions: input?.permissions || [],
      tenantId: input?.tenantId || "global"
    },
    process.env.AUTH_SECRET || "test-star-secret",
    { expiresIn: "1h" }
  );

  return `${AUTH_COOKIE_NAME}=${token}`;
}

function buildLoginRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });
}

function buildPolicyRow(overrides?: Partial<ReturnType<typeof buildTenantSecurityPolicyDefaults>>) {
  const defaults = buildTenantSecurityPolicyDefaults("global");
  return {
    tenantId: defaults.tenantId,
    sessionTimeoutMinutes: defaults.sessionTimeoutMinutes,
    enforce2FA: defaults.enforce2FA,
    passwordMinLength: defaults.passwordMinLength,
    passwordRequireUppercase: defaults.passwordRequireUppercase,
    passwordRequireLowercase: defaults.passwordRequireLowercase,
    passwordRequireNumber: defaults.passwordRequireNumber,
    passwordRequireSymbol: defaults.passwordRequireSymbol,
    ipAllowlist: defaults.ipAllowlist,
    allowRememberMe: defaults.allowRememberMe,
    maxLoginAttempts: defaults.maxLoginAttempts,
    lockoutMinutes: defaults.lockoutMinutes,
    updatedByUserId: null,
    updatedAt: new Date(),
    ...overrides
  };
}

async function withLoginPrismaMock(
  input: {
    failedAttempts?: number;
    enforce2FA?: boolean;
    passwordHash?: string;
    isActive?: boolean;
  },
  run: () => Promise<void>
) {
  const passwordHash = input.passwordHash || (await bcrypt.hash("Password123", 10));
  const userRecord = {
    id: "user-login",
    email: "login@test.com",
    name: "Login User",
    isActive: input.isActive ?? true,
    passwordHash,
    branchId: null,
    tenantId: "global",
    roles: [
      {
        role: {
          name: "ADMIN",
          permissions: [{ permission: { key: "SYSTEM:ADMIN" } }]
        }
      }
    ],
    userPermissions: []
  };

  const restore = patchPrisma({
    user: {
      findUnique: async ({ where }: any) => {
        if (where?.email === userRecord.email) return userRecord;
        if (where?.id === userRecord.id) return { id: userRecord.id };
        return null;
      }
    },
    auditLog: {
      count: async () => input.failedAttempts || 0,
      create: async () => ({ id: "audit-1" })
    },
    tenantSecurityPolicy: {
      findUnique: async () => buildPolicyRow({ enforce2FA: input.enforce2FA ?? false }),
      upsert: async () => buildPolicyRow({ enforce2FA: input.enforce2FA ?? false })
    }
  });

  try {
    await run();
  } finally {
    restore();
  }
}

test("login exitoso emite cookie JWT válida", async () => {
  await withLoginPrismaMock({}, async () => {
    const response = await loginPost(buildLoginRequest({ email: "login@test.com", password: "Password123" }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.email, "login@test.com");
    assert.match(response.headers.get("set-cookie") || "", new RegExp(`${AUTH_COOKIE_NAME}=`));
  });
});

test("login fallido devuelve 401 y attemptsLeft", async () => {
  await withLoginPrismaMock({}, async () => {
    const response = await loginPost(buildLoginRequest({ email: "login@test.com", password: "Incorrecta123" }));
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.attemptsLeft, 4);
  });
});

test("login bloqueado por lockout devuelve 423", async () => {
  await withLoginPrismaMock({ failedAttempts: 5 }, async () => {
    const response = await loginPost(buildLoginRequest({ email: "login@test.com", password: "Password123" }));
    const payload = await response.json();

    assert.equal(response.status, 423);
    assert.match(String(payload.error), /bloqueada/i);
  });
});

test("login bloquea tenants con enforce2FA sin flujo real", async () => {
  await withLoginPrismaMock({ enforce2FA: true }, async () => {
    const response = await loginPost(buildLoginRequest({ email: "login@test.com", password: "Password123" }));
    const payload = await response.json();

    assert.equal(response.status, 501);
    assert.equal(payload.code, "TWO_FACTOR_REQUIRED_UNAVAILABLE");
  });
});

test("config/app rechaza x-role sin sesión real", async () => {
  const response = await configAppGet(
    new NextRequest("http://localhost/api/config/app", {
      headers: { "x-role": "Administrador" }
    })
  );

  assert.equal(response.status, 401);
});

test("finanzas/summary rechaza x-role y ?role= sin sesión real", async () => {
  const response = await financeSummaryGet(
    new NextRequest("http://localhost/api/finanzas/summary?role=Administrador", {
      headers: { "x-role": "Administrador" }
    })
  );

  assert.equal(response.status, 401);
});

test("upload/image requiere autenticación", async () => {
  const response = await uploadImagePost(new NextRequest("http://localhost/api/upload/image", { method: "POST" }));
  assert.equal(response.status, 401);
});

test("whatsapp/threads requiere autenticación", async () => {
  const response = await whatsappThreadsGet(
    new NextRequest("http://localhost/api/whatsapp/threads?workspaceId=w1&numberId=n1")
  );
  assert.equal(response.status, 401);
});

test("whatsapp/send requiere autenticación", async () => {
  const response = await whatsappSendPost(new NextRequest("http://localhost/api/whatsapp/send", { method: "POST" }));
  assert.equal(response.status, 401);
});

test("health RBAC devuelve 503 cuando el persistido está incompleto", async () => {
  const restore = patchPrisma({
    role: { count: async () => 1 },
    user: { count: async () => 1 },
    permission: { count: async () => 0 },
    rolePermission: { count: async () => 0 },
    userPermission: { count: async () => 0 }
  });

  try {
    const response = await rbacHealthGet(
      new NextRequest("http://localhost/api/admin/health/rbac", {
        headers: { cookie: buildSessionCookie() }
      })
    );
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.equal(payload.ok, false);
  } finally {
    restore();
  }
});

test("syncPersistedRbac puebla Permission y RolePermission", async () => {
  const permissions = new Map<string, { id: string; key: string; module: string; area: string; action: string }>();
  const roles = new Map<string, { id: string; name: string; description: string; isSystem: boolean }>();
  const rolePermissions: Array<{ roleId: string; permissionId: string }> = [];

  const client: any = {
    permission: {
      upsert: async ({ where, update, create }: any) => {
        const current = permissions.get(where.key);
        const next =
          current || {
            id: `perm-${permissions.size + 1}`,
            key: create.key,
            module: create.module,
            area: create.area,
            action: create.action
          };
        Object.assign(next, update || create);
        permissions.set(where.key, next);
        return next;
      },
      findMany: async ({ where }: any) =>
        Array.from(permissions.values()).filter((row) => where?.key?.in?.includes(row.key)),
      count: async () => permissions.size
    },
    role: {
      upsert: async ({ where, update, create }: any) => {
        const current = roles.get(where.name);
        const next =
          current || {
            id: `role-${roles.size + 1}`,
            name: create.name,
            description: create.description,
            isSystem: create.isSystem
          };
        Object.assign(next, update || create);
        roles.set(where.name, next);
        return next;
      },
      count: async () => roles.size
    },
    rolePermission: {
      deleteMany: async ({ where }: any) => {
        for (let index = rolePermissions.length - 1; index >= 0; index -= 1) {
          if (rolePermissions[index].roleId === where.roleId) {
            rolePermissions.splice(index, 1);
          }
        }
        return { count: 0 };
      },
      createMany: async ({ data }: any) => {
        rolePermissions.push(...data);
        return { count: data.length };
      },
      count: async () => rolePermissions.length
    },
    user: { count: async () => 1 },
    userPermission: { count: async () => 0 },
    $transaction: async (arg: any) => (typeof arg === "function" ? arg(client) : Promise.all(arg))
  };

  const status = await syncPersistedRbac(client);

  assert.ok(status.permissions > 0);
  assert.ok(status.rolePermissions > 0);
  assert.equal(status.ready, true);
});

test("resolveRuntimeSecret falla fuera de development sin AUTH_SECRET", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAuthSecret = process.env.AUTH_SECRET;

  delete env.AUTH_SECRET;
  env.NODE_ENV = "production";

  try {
    assert.throws(
      () =>
        resolveRuntimeSecret({
          envKeys: ["AUTH_SECRET"],
          label: "AUTH_SECRET",
          devFallback: "dev-secret"
        }),
      /AUTH_SECRET/
    );
  } finally {
    env.NODE_ENV = originalNodeEnv;
    if (typeof originalAuthSecret === "string") {
      env.AUTH_SECRET = originalAuthSecret;
    } else {
      delete env.AUTH_SECRET;
    }
  }
});
