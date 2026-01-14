import { UserPermissionEffect, type Prisma } from "@prisma/client";
import { buildEffectivePermissionSet, normalizeRoleName } from "@/lib/rbac";

type UserWithPermissions = Prisma.UserGetPayload<{
  include: {
    roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } };
    userPermissions: { include: { permission: true } };
  };
}>;

type PermissionProfile = {
  roleNames: string[];
  effective: string[];
  inherited: string[];
  denies: string[];
  isAdmin: boolean;
};

export function computeUserPermissionProfile(user: UserWithPermissions): PermissionProfile {
  const roleNames: string[] = [];
  const rolePermissionSets: string[][] = [];

  for (const userRole of user.roles || []) {
    const normalizedRole = normalizeRoleName(userRole.role?.name);
    if (!normalizedRole) continue;

    roleNames.push(normalizedRole);

    const permissionsForRole = (userRole.role?.permissions || [])
      .map((rp) => rp.permission?.key)
      .filter((key): key is string => Boolean(key))
      .map((key) => key.toUpperCase());

    rolePermissionSets.push(Array.from(new Set(permissionsForRole)));
  }

  const userGrants: string[] = [];
  const userDenies: string[] = [];

  for (const userPermission of user.userPermissions || []) {
    const key = userPermission.permission?.key;
    if (!key) continue;
    const normalizedKey = key.toUpperCase();
    if (userPermission.effect === UserPermissionEffect.DENY) {
      userDenies.push(normalizedKey);
    } else {
      userGrants.push(normalizedKey);
    }
  }

  const { allowed, denied, inherited, isAdmin } = buildEffectivePermissionSet({
    roleNames,
    rolePermissionSets,
    userGrants,
    userDenies
  });

  return {
    roleNames,
    effective: Array.from(allowed),
    inherited: Array.from(inherited),
    denies: Array.from(denied),
    isAdmin
  };
}
