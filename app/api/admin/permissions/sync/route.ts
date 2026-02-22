import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { ALL_PERMISSION_KEYS, ROLE_PERMISSION_MAP } from "@/lib/security/permissionCatalog";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!hasPermission(auth.user, "USERS:ADMIN")) throw { status: 403, body: { error: "No autorizado" } };

  // Sincroniza catálogo de permisos y asignación de roles básicos (similar a seed, pero idempotente).
  await prisma.$transaction(async (tx) => {
    for (const key of ALL_PERMISSION_KEYS) {
      const [module = "GENERAL", area = "GENERAL", action = "READ"] = key.split(":");
      await tx.permission.upsert({
        where: { key },
        update: { module, area, action },
        create: { key, module, area, action }
      });
    }

    const permRecords = await tx.permission.findMany({ where: { key: { in: ALL_PERMISSION_KEYS } }, select: { id: true, key: true } });
    const permMap = new Map(permRecords.map((p) => [p.key, p.id]));

    for (const roleName of Object.keys(ROLE_PERMISSION_MAP)) {
      const role = await tx.role.upsert({
        where: { name: roleName },
        update: { description: roleName },
        create: { name: roleName, description: roleName }
      });

      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      const perms = ROLE_PERMISSION_MAP[roleName] || [];
      if (perms.length) {
        await tx.rolePermission.createMany({
          data: perms
            .map((p) => permMap.get(p))
            .filter(Boolean)
            .map((permissionId) => ({ roleId: role.id, permissionId: permissionId! }))
        });
      }
    }
  });

  return NextResponse.json({ ok: true, message: "Permisos sincronizados" });
}

export const POST = withApiErrorHandling(handler);
