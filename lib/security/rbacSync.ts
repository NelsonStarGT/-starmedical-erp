import type { PrismaClient } from "@prisma/client";
import { ALL_PERMISSION_KEYS, ROLE_PERMISSION_MAP } from "@/lib/security/permissionCatalog";

type RbacClient = Pick<
  PrismaClient,
  "$transaction" | "permission" | "role" | "rolePermission" | "user" | "userPermission"
>;

type RbacTx = {
  permission: RbacClient["permission"];
  role: RbacClient["role"];
  rolePermission: RbacClient["rolePermission"];
};

export type PersistedRbacStatus = {
  roles: number;
  users: number;
  permissions: number;
  rolePermissions: number;
  userPermissions: number;
  ready: boolean;
  issues: string[];
};

const SYSTEM_ROLE_NAMES = new Set(["SUPER_ADMIN", "ADMIN"]);

function permissionParts(key: string) {
  const [module = "GENERAL", area = "GENERAL", action = "READ"] = key.split(":");
  return { module, area, action };
}

async function syncPersistedRbacWithClient(client: RbacTx) {
  for (const key of ALL_PERMISSION_KEYS) {
    const { module, area, action } = permissionParts(key);
    await client.permission.upsert({
      where: { key },
      update: { module, area, action },
      create: { key, module, area, action }
    });
  }

  const permissionRows = await client.permission.findMany({
    where: { key: { in: ALL_PERMISSION_KEYS } },
    select: { id: true, key: true }
  });
  const permissionIdByKey = new Map(permissionRows.map((row) => [row.key, row.id]));

  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = await client.role.upsert({
      where: { name: roleName },
      update: { description: roleName, isSystem: SYSTEM_ROLE_NAMES.has(roleName) },
      create: { name: roleName, description: roleName, isSystem: SYSTEM_ROLE_NAMES.has(roleName) }
    });

    await client.rolePermission.deleteMany({ where: { roleId: role.id } });

    const permissionIds = permissionKeys
      .map((key) => permissionIdByKey.get(key))
      .filter((value): value is string => Boolean(value));

    if (permissionIds.length > 0) {
      await client.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true
      });
    }
  }
}

export async function syncPersistedRbac(client: RbacClient) {
  if (!client.$transaction) {
    throw new Error("RBAC sync requiere soporte de transacciones.");
  }

  await client.$transaction(async (tx) => {
    await syncPersistedRbacWithClient(tx as unknown as RbacTx);
  });

  return getPersistedRbacStatus(client);
}

export async function getPersistedRbacStatus(client: RbacClient): Promise<PersistedRbacStatus> {
  const [roles, users, permissions, rolePermissions, userPermissions] = await Promise.all([
    client.role.count(),
    client.user.count(),
    client.permission.count(),
    client.rolePermission.count(),
    client.userPermission.count()
  ]);

  const issues: string[] = [];
  const hasBootstrapData = roles > 0 || users > 0;

  if (hasBootstrapData && permissions === 0) {
    issues.push("Permission=0 con roles/usuarios existentes.");
  }
  if (hasBootstrapData && rolePermissions === 0) {
    issues.push("RolePermission=0 con roles/usuarios existentes.");
  }

  return {
    roles,
    users,
    permissions,
    rolePermissions,
    userPermissions,
    ready: issues.length === 0,
    issues
  };
}
