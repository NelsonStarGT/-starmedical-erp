import { UserPermissionEffect } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildEffectivePermissionSet, normalizeRoleName } from "@/lib/rbac";
import { isKnownPermissionKey } from "@/lib/security/permissionService";

function serializeRoles(
  roles: Array<{
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    _count: { userRoles: number };
    permissions: Array<{ permission: { key: string } }>;
  }>
) {
  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    userCount: role._count.userRoles,
    permissions: role.permissions.map((item) => ({
      key: item.permission.key,
      custom: !isKnownPermissionKey(item.permission.key)
    }))
  }));
}

function serializeUsers(
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    isActive: boolean;
    roles: Array<{
      role: {
        name: string;
        permissions: Array<{
          permission: {
            key: string;
          };
        }>;
      };
    }>;
    userPermissions: Array<{
      effect: UserPermissionEffect;
      permission: {
        key: string;
      };
    }>;
  }>
) {
  return users.map((user) => {
    const roleNames = user.roles.map((row) => row.role.name);
    const rolePermissionSets = user.roles.map((row) =>
      row.role.permissions.map((item) => item.permission.key)
    );
    const userGrants = user.userPermissions
      .filter((item) => item.effect !== UserPermissionEffect.DENY)
      .map((item) => item.permission.key);
    const userDenies = user.userPermissions
      .filter((item) => item.effect === UserPermissionEffect.DENY)
      .map((item) => item.permission.key);

    const permissionSet = buildEffectivePermissionSet({
      roleNames: roleNames.map((role) => normalizeRoleName(role)),
      rolePermissionSets,
      userGrants,
      userDenies
    });

    const effectivePermissions = Array.from(permissionSet.allowed).sort();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      roleNames,
      effectivePermissions,
      customPermissions: effectivePermissions.filter((key) => !isKnownPermissionKey(key))
    };
  });
}

export async function readRbacSnapshot() {
  const [roles, permissions, users] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { userRoles: true } },
        permissions: { include: { permission: true } }
      }
    }),
    prisma.permission.findMany({ orderBy: { key: "asc" } }),
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 300,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        roles: {
          include: {
            role: {
              select: {
                name: true,
                permissions: { include: { permission: { select: { key: true } } } }
              }
            }
          }
        },
        userPermissions: {
          include: {
            permission: { select: { key: true } }
          }
        }
      }
    })
  ]);

  return {
    roles: serializeRoles(roles),
    permissions: permissions.map((permission) => ({
      id: permission.id,
      key: permission.key,
      description: permission.description,
      module: permission.module,
      area: permission.area,
      action: permission.action,
      custom: !isKnownPermissionKey(permission.key)
    })),
    users: serializeUsers(users)
  };
}
