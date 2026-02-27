import { NextRequest, NextResponse } from "next/server";
import { UserPermissionEffect } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { buildEffectivePermissionSet, hasPermission, isAdmin, normalizeRoleName } from "@/lib/rbac";
import { isKnownPermissionKey } from "@/lib/security/permissionService";
import {
  forbidden403,
  isCentralConfigCompatError,
  notFound404,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PermissionInput = {
  key: string;
  description?: string | null;
  module?: string;
  area?: string;
  action?: string;
};

type RoleInput = {
  name: string;
  description?: string | null;
  permissions?: string[];
};

function canManageRbac(user: Awaited<ReturnType<typeof requireConfigCentralCapability>>["user"]): boolean {
  if (!user) return false;
  return isAdmin(user) || hasPermission(user, "SYSTEM:ADMIN");
}

function normalizePermissions(raw: unknown): PermissionInput[] {
  return (Array.isArray(raw) ? raw : [])
    .map((item) => {
      const key = String((item as { key?: string })?.key || "").trim().toUpperCase();
      if (!key) return null;
      const [module, area, action] = key.split(":");
      const description = (item as { description?: string })?.description || null;
      return {
        key,
        description,
        module: module || "CUSTOM",
        area: area || "GENERAL",
        action: action || "READ"
      };
    })
    .filter(Boolean) as PermissionInput[];
}

function normalizeRoles(raw: unknown): RoleInput[] {
  return (Array.isArray(raw) ? raw : [])
    .map((item) => {
      const name = String((item as { name?: string })?.name || "").trim();
      if (!name) return null;
      const description = (item as { description?: string })?.description || null;
      const permissions = Array.isArray((item as { permissions?: string[] })?.permissions)
        ? (item as { permissions: string[] }).permissions.map((permission) => String(permission || "").trim().toUpperCase()).filter(Boolean)
        : [];
      return {
        name,
        description,
        permissions: Array.from(new Set(permissions))
      };
    })
    .filter(Boolean) as RoleInput[];
}

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

async function readRbacSnapshot() {
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

function dbNotReadyResponse() {
  return service503("DB_NOT_READY", "Configuración de permisos no disponible. Ejecuta migraciones y prisma generate.");
}

export async function GET(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_BRANCH_READ");
  if (auth.response) return auth.response;

  try {
    const snapshot = await readRbacSnapshot();
    return NextResponse.json({
      ok: true,
      data: snapshot
    });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.rbac.get", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo cargar RBAC.";
    return server500(message);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_BRANCH_WRITE");
  if (auth.response) return auth.response;
  if (!canManageRbac(auth.user)) {
    return forbidden403("Solo SYSTEM:ADMIN o ADMIN puede editar roles y permisos.");
  }

  try {
    const body = await req.json().catch(() => ({}));
    const permissionsInput = normalizePermissions((body as { permissions?: unknown }).permissions);
    const rolesInput = normalizeRoles((body as { roles?: unknown }).roles);

    await prisma.$transaction(async (tx) => {
      const permissionIdByKey = new Map<string, string>();
      for (const permission of permissionsInput) {
        const saved = await tx.permission.upsert({
          where: { key: permission.key },
          update: {
            description: permission.description ?? null,
            module: permission.module || "CUSTOM",
            area: permission.area || "GENERAL",
            action: permission.action || "READ"
          },
          create: {
            key: permission.key,
            description: permission.description ?? null,
            module: permission.module || "CUSTOM",
            area: permission.area || "GENERAL",
            action: permission.action || "READ"
          }
        });
        permissionIdByKey.set(permission.key, saved.id);
      }

      const roleIdByName = new Map<string, string>();
      for (const role of rolesInput) {
        const saved = await tx.role.upsert({
          where: { name: role.name },
          update: { description: role.description ?? null },
          create: { name: role.name, description: role.description ?? null }
        });
        roleIdByName.set(role.name, saved.id);
      }

      const incomingRoleNames = new Set(rolesInput.map((role) => role.name));
      const existingRoles = await tx.role.findMany({
        where: {
          isSystem: false
        },
        select: {
          id: true,
          name: true,
          _count: { select: { userRoles: true } }
        }
      });

      const removableRoles = existingRoles.filter((role) => !incomingRoleNames.has(role.name));
      const blockedRemovals = removableRoles.filter((role) => role._count.userRoles > 0);
      if (blockedRemovals.length > 0) {
        throw new Error(
          `ROLE_ASSIGNED:${blockedRemovals
            .map((role) => role.name)
            .join(",")}`
        );
      }

      if (removableRoles.length > 0) {
        await tx.rolePermission.deleteMany({
          where: { roleId: { in: removableRoles.map((role) => role.id) } }
        });
        await tx.role.deleteMany({
          where: { id: { in: removableRoles.map((role) => role.id) } }
        });
      }

      await tx.rolePermission.deleteMany({
        where: {
          roleId: { in: Array.from(roleIdByName.values()) }
        }
      });

      const resolvedRolePermissions: Array<{ roleId: string; permissionId: string }> = [];
      for (const role of rolesInput) {
        const roleId = roleIdByName.get(role.name);
        if (!roleId) continue;
        for (const permissionKey of role.permissions || []) {
          let permissionId = permissionIdByKey.get(permissionKey);
          if (!permissionId) {
            const existingPermission = await tx.permission.findUnique({
              where: { key: permissionKey },
              select: { id: true }
            });
            if (!existingPermission) continue;
            permissionId = existingPermission.id;
            permissionIdByKey.set(permissionKey, permissionId);
          }
          resolvedRolePermissions.push({ roleId, permissionId });
        }
      }

      if (resolvedRolePermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: resolvedRolePermissions,
          skipDuplicates: true
        });
      }
    });

    await auditLog({
      action: "ROLE_PERMISSIONS_UPDATED",
      entityType: "RBAC",
      entityId: "global",
      user: auth.user,
      req,
      metadata: {
        roles: rolesInput.map((role) => role.name),
        permissionCount: permissionsInput.length
      }
    });

    const snapshot = await readRbacSnapshot();
    return NextResponse.json({
      ok: true,
      data: snapshot
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("ROLE_ASSIGNED:")) {
      const roleNames = error.message.replace("ROLE_ASSIGNED:", "").split(",").filter(Boolean);
      return validation422("No se puede eliminar un rol asignado a usuarios.", roleNames.map((name) => ({
        path: "roles",
        message: `El rol ${name} está asignado a usuarios.`
      })));
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.rbac.put", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar RBAC.";
    return server500(message);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_BRANCH_WRITE");
  if (auth.response) return auth.response;
  if (!canManageRbac(auth.user)) {
    return forbidden403("Solo SYSTEM:ADMIN o ADMIN puede eliminar roles.");
  }

  const roleId = req.nextUrl.searchParams.get("roleId")?.trim();
  if (!roleId) {
    return validation422("roleId es requerido.", [{ path: "roleId", message: "Campo obligatorio." }]);
  }

  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        isSystem: true,
        _count: { select: { userRoles: true } }
      }
    });

    if (!role) {
      return notFound404("Rol no encontrado.");
    }
    if (role.isSystem) {
      return validation422("No se puede eliminar un rol de sistema.");
    }
    if (role._count.userRoles > 0) {
      return validation422("No se puede eliminar un rol asignado a usuarios.", [
        { path: "roleId", message: `El rol ${role.name} tiene usuarios asignados.` }
      ]);
    }

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.role.delete({ where: { id: roleId } });
    });

    await auditLog({
      action: "ROLE_UPDATED",
      entityType: "Role",
      entityId: roleId,
      user: auth.user,
      req,
      metadata: {
        change: "delete_role",
        roleName: role.name
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.rbac.delete", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo eliminar rol.";
    return server500(message);
  }
}
