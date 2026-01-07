import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/api/admin";

export const dynamic = "force-dynamic";

type PermissionInput = { key: string; description?: string | null };
type RoleInput = { name: string; description?: string | null; permissions?: string[] };

function normalizePermissions(raw: any): PermissionInput[] {
  return (Array.isArray(raw) ? raw : [])
    .map((p) => {
      const key = String(p.key || "").trim();
      if (!key) return null;
      return { key: key.toUpperCase(), description: p.description || null };
    })
    .filter(Boolean) as PermissionInput[];
}

function normalizeRoles(raw: any): RoleInput[] {
  return (Array.isArray(raw) ? raw : [])
    .map((r) => {
      const name = String(r.name || "").trim();
      if (!name) return null;
      return {
        name,
        description: r.description || null,
        permissions: Array.isArray(r.permissions) ? (r.permissions as string[]).map((p) => p.toUpperCase()) : []
      };
    })
    .filter(Boolean) as RoleInput[];
}

function serializeRoles(roles: any[]) {
  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: r.permissions.map((p: any) => p.permission.key)
  }));
}

export async function GET(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        orderBy: { name: "asc" },
        include: { permissions: { include: { permission: true } } }
      }),
      prisma.permission.findMany({ orderBy: { key: "asc" } })
    ]);
    return NextResponse.json({
      roles: serializeRoles(roles),
      permissions
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener RBAC" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const permissionsInput = normalizePermissions(body.permissions);
    const rolesInput = normalizeRoles(body.roles);

    const result = await prisma.$transaction(async (tx) => {
      const permissionMap = new Map<string, string>();
      for (const p of permissionsInput) {
        const saved = await tx.permission.upsert({
          where: { key: p.key },
          update: { description: p.description ?? null },
          create: { key: p.key, description: p.description ?? null }
        });
        permissionMap.set(p.key, saved.id);
      }

      const roleMap = new Map<string, string>();
      for (const r of rolesInput) {
        const saved = await tx.role.upsert({
          where: { name: r.name },
          update: { description: r.description ?? null },
          create: { name: r.name, description: r.description ?? null }
        });
        roleMap.set(r.name, saved.id);
      }

      // Reset mappings
      await tx.rolePermission.deleteMany({});

      const mappings: { roleId: string; permissionId: string }[] = [];
      for (const role of rolesInput) {
        const roleId = roleMap.get(role.name);
        if (!roleId) continue;
        (role.permissions || []).forEach((permKey) => {
          const permId = permissionMap.get(permKey);
          if (permId) mappings.push({ roleId, permissionId: permId });
        });
      }

      if (mappings.length) {
        await tx.rolePermission.createMany({ data: mappings });
      }

      const [rolesSaved, permsSaved] = await Promise.all([
        tx.role.findMany({
          orderBy: { name: "asc" },
          include: { permissions: { include: { permission: true } } }
        }),
        tx.permission.findMany({ orderBy: { key: "asc" } })
      ]);

      return { roles: rolesSaved, permissions: permsSaved };
    });

    return NextResponse.json({
      roles: serializeRoles(result.roles),
      permissions: result.permissions
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo guardar RBAC" }, { status: 400 });
  }
}
